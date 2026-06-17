"""
Balance OS — Router de Impuestos
"""
from datetime import datetime
from decimal import Decimal
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct
from typing import List, Optional

from app.database import get_db
from app.models import (
    Declaracion, DeclaracionConcepto, ConfiguracionDiot, Cliente,
    Poliza, PolizaDetalle, CuentaContable, EstimuloFiscal, ClienteEstimulo,
)
from app.schemas.impuestos import (
    DeclaracionCreate, DeclaracionConceptoCreate,
    DeclaracionResponse, DeclaracionConceptoResponse,
    CalculoImpuestosRequest, CalculoImpuestosResponse, DiotResponse,
    EstimuloFiscalCreate, EstimuloFiscalResponse,
    ClienteEstimuloCreate, ClienteEstimuloResponse,
    CalculoCompletoRequest, CalculoCompletoResponse, ImpuestoDesglose,
)
from app.routers.auth import verificar_token
from app.dependencies import get_despacho_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/impuestos", tags=["impuestos"])


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Declaraciones ─────────────────────────────────


@router.post("/declaraciones", response_model=DeclaracionResponse, status_code=status.HTTP_201_CREATED)
async def crear_declaracion(
    data: DeclaracionCreate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Crea una declaración de impuestos con sus conceptos."""
    declaracion = Declaracion(
        cliente_id=data.cliente_id,
        tipo=data.tipo,
        periodo_mes=data.periodo_mes,
        periodo_anio=data.periodo_anio,
        estatus="pendiente",
    )
    db.add(declaracion)
    await db.flush()

    for conc in data.conceptos:
        concepto = DeclaracionConcepto(
            declaracion_id=declaracion.id,
            tipo=conc.tipo,
            concepto=conc.concepto,
            monto=conc.monto,
            base=conc.base,
            tasa=conc.tasa,
            impuesto=conc.impuesto,
        )
        db.add(concepto)

    await db.commit()
    await db.refresh(declaracion)
    return declaracion


@router.get("/declaraciones", response_model=List[DeclaracionResponse])
async def listar_declaraciones(
    cliente_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista las declaraciones, opcionalmente filtradas por cliente."""
    query = select(Declaracion)
    if cliente_id:
        query = query.where(Declaracion.cliente_id == cliente_id)
    query = query.order_by(Declaracion.periodo_anio.desc(), Declaracion.periodo_mes.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/declaraciones/{declaracion_id}", response_model=DeclaracionResponse)
async def obtener_declaracion(
    declaracion_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Obtiene una declaración con sus conceptos."""
    result = await db.execute(
        select(Declaracion).where(Declaracion.id == declaracion_id)
    )
    declaracion = result.scalar_one_or_none()
    if not declaracion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Declaración no encontrada")
    return declaracion


# ─── Cálculo de Impuestos ──────────────────────────

# Tarifa anual ISR Art. 152 LISR (ajustada inflación 2026 estimada ~3.8% sobre 2025)
# Cada tupla: (límite_inferior, límite_superior, tasa); último bracket sin límite superior
TARIFA_ISR_ANUAL = [
    (Decimal("0.01"),     Decimal("8952.49"),      Decimal("0")),
    (Decimal("8952.50"),  Decimal("75984.54"),     Decimal("0.0192")),
    (Decimal("75984.55"), Decimal("133536.59"),    Decimal("0.0640")),
    (Decimal("133536.60"),Decimal("155242.61"),    Decimal("0.1088")),
    (Decimal("155242.62"),Decimal("185771.59"),    Decimal("0.1600")),
    (Decimal("185771.60"),Decimal("374837.22"),    Decimal("0.1792")),
    (Decimal("374837.23"),Decimal("590795.14"),    Decimal("0.2136")),
    (Decimal("590795.15"),Decimal("1127926.76"),   Decimal("0.2352")),
    (Decimal("1127926.77"),Decimal("1503902.38"),  Decimal("0.3000")),
    (Decimal("1503902.39"),Decimal("2252841.59"),  Decimal("0.3200")),
    (Decimal("2252841.60"),None,                   Decimal("0.3400")),
]

# Cuota fija por bracket (estimada inflación 2026)
CUOTA_FIJA_ANUAL = [
    Decimal("0"),
    Decimal("171.84"),
    Decimal("6638.91"),
    Decimal("14414.26"),
    Decimal("16254.14"),
    Decimal("21875.47"),
    Decimal("52600.85"),
    Decimal("104262.91"),
    Decimal("240083.42"),
    Decimal("364142.15"),
    Decimal("612897.16"),
]


def _buscar_bracket(utilidad: Decimal):
    """Devuelve el índice del bracket donde cae la utilidad anual."""
    if utilidad <= Decimal("0"):
        return 0
    for i, (lo, hi, _) in enumerate(TARIFA_ISR_ANUAL):
        if hi is None:
            if utilidad >= lo:
                return i
        elif lo <= utilidad <= hi:
            return i
    return len(TARIFA_ISR_ANUAL) - 1  # fallback


@router.post("/calcular", response_model=CalculoImpuestosResponse)
async def calcular_impuestos(
    data: CalculoImpuestosRequest,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Calcula IVA e ISR basado en ingresos y deducciones con tarifa progresiva LISR Art. 152."""
    # ── IVA ──
    iva_por_pagar = data.iva_trasladado - data.iva_acreditable
    if iva_por_pagar < Decimal("0.00"):
        iva_a_favor = abs(iva_por_pagar)
        iva_por_pagar_decimal = Decimal("0.00")
    else:
        iva_a_favor = Decimal("0.00")
        iva_por_pagar_decimal = iva_por_pagar

    # ── ISR Progresivo ──
    utilidad = data.ingresos - data.deducciones

    if utilidad > Decimal("0.00"):
        bracket_idx = _buscar_bracket(utilidad)
        lo, hi, tasa = TARIFA_ISR_ANUAL[bracket_idx]
        cuota_fija = CUOTA_FIJA_ANUAL[bracket_idx]
        # ISR bruto anual = (base - límite_inferior) × tasa marginal + cuota fija
        margen = utilidad - lo + Decimal("0.01")  # +0.01 porque el límite es inclusivo
        isr_bruto = (margen * tasa + cuota_fija).quantize(Decimal("0.01"))
        # Tasa efectiva = (ISR bruto / utilidad) × 100
        tasa_efectiva = (isr_bruto / utilidad * Decimal("100")).quantize(Decimal("0.01"))
    else:
        isr_bruto = Decimal("0.00")
        tasa_efectiva = Decimal("0.00")

    # ISR retenido = 10% del ISR bruto (pagos provisionales)
    isr_retenido = (isr_bruto * Decimal("0.10")).quantize(Decimal("0.01"))

    # ISR neto = ISR bruto − ISR retenido
    isr_neto = (isr_bruto - isr_retenido).quantize(Decimal("0.01"))
    if isr_neto < Decimal("0.00"):
        isr_neto = Decimal("0.00")

    # ── Desglose por bracket ──
    brackets = _calcular_brackets(utilidad)

    return CalculoImpuestosResponse(
        iva_por_pagar=iva_por_pagar_decimal,
        iva_a_favor=iva_a_favor,
        isr_bruto=isr_bruto,
        isr_retenido=isr_retenido,
        isr_neto=isr_neto,
        coeficiente=tasa if utilidad > Decimal("0") else Decimal("0"),
        utilidad_fiscal=utilidad,
        tasa_efectiva=tasa_efectiva,
        isr_retenciones=isr_retenido,
        isr_pago_provisional=isr_retenido,
        brackets=brackets,
    )


def _calcular_brackets(utilidad: Decimal) -> list:
    """Desglose marginal por cada bracket de la tarifa."""
    from app.schemas.impuestos import BracketDetalle
    resultado = []
    for i, (lo, hi, tasa) in enumerate(TARIFA_ISR_ANUAL):
        cuota = CUOTA_FIJA_ANUAL[i]
        is_last = (hi is None)

        if utilidad <= Decimal("0"):
            base_gravable = Decimal("0.00")
            impuesto_bracket = Decimal("0.00")
        elif not is_last and utilidad > hi:
            # Bracket completamente cubierto
            base_gravable = hi - lo + Decimal("0.01")
            impuesto_bracket = (base_gravable * tasa).quantize(Decimal("0.01"))
        elif utilidad >= lo:
            # Bracket activo (donde cae la utilidad)
            base_gravable = utilidad - lo + Decimal("0.01")
            impuesto_bracket = (base_gravable * tasa).quantize(Decimal("0.01"))
        else:
            # Bracket por encima de la utilidad
            base_gravable = Decimal("0.00")
            impuesto_bracket = Decimal("0.00")

        resultado.append(BracketDetalle(
            limite_inferior=lo,
            limite_superior=hi if hi is not None else None,
            tasa=tasa,
            cuota_fija=cuota,
            base_gravable=base_gravable,
            impuesto=impuesto_bracket,
        ))
    return resultado


# ─── DIOT ──────────────────────────────────────────


def _build_diot_from_polizas(db, cliente_id, mes, anio, config) -> DiotResponse:
    """Construye la respuesta DIOT desde los datos calculados."""
    return DiotResponse(
        periodo_mes=mes,
        periodo_anio=anio,
        iva_acreditable=config["iva_acreditable"],
        iva_trasladado=config["iva_trasladado"],
        diferencia=config["iva_trasladado"] - config["iva_acreditable"],
        proveedores=config["proveedores"],
    )


@router.get("/diot", response_model=DiotResponse)
async def generar_diot(
    cliente_id: int = Query(...),
    mes: int = Query(...),
    anio: int = Query(...),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Genera la DIOT (Declaración Informativa de Operaciones con Terceros).

    Estrategia en cascada:
    1. Desde pólizas contables (fuente primaria, datos reales)
    2. Desde ConfiguracionDiot (valores guardados manualmente)
    3. Desde declaraciones (valores calculados previamente)
    """
    # ── 1. Intentar desde pólizas contables ──
    try:
        diot_desde_polizas = await _diot_desde_polizas(db, cliente_id, mes, anio)
        if diot_desde_polizas:
            logger.info(
                f"DIOT generada desde pólizas: cliente={cliente_id}, "
                f"IVA acred={diot_desde_polizas['iva_acreditable']}, "
                f"IVA trasl={diot_desde_polizas['iva_trasladado']}, "
                f"proveedores={diot_desde_polizas['proveedores']}"
            )
            return _build_diot_from_polizas(db, cliente_id, mes, anio, diot_desde_polizas)
    except Exception as e:
        logger.warning(f"DIOT desde pólizas falló: {e}, intentando ConfiguracionDiot...")

    # ── 2. Buscar config DIOT existente ──
    result = await db.execute(
        select(ConfiguracionDiot)
        .where(ConfiguracionDiot.cliente_id == cliente_id)
        .where(ConfiguracionDiot.periodo_mes == mes)
        .where(ConfiguracionDiot.periodo_anio == anio)
    )
    config = result.scalar_one_or_none()

    if config:
        return DiotResponse(
            periodo_mes=mes,
            periodo_anio=anio,
            iva_acreditable=config.iva_acreditable,
            iva_trasladado=config.iva_trasladado,
            diferencia=config.iva_trasladado - config.iva_acreditable,
            proveedores=0,
        )

    # ── 3. Calcular desde las declaraciones del período ──
    decl_result = await db.execute(
        select(DeclaracionConcepto)
        .join(Declaracion, DeclaracionConcepto.declaracion_id == Declaracion.id)
        .where(Declaracion.cliente_id == cliente_id)
        .where(Declaracion.periodo_mes == mes)
        .where(Declaracion.periodo_anio == anio)
    )
    conceptos = decl_result.scalars().all()

    iva_acreditable = sum(
        c.monto for c in conceptos if c.tipo == "iva_acreditable"
    ) or Decimal("0.00")
    iva_trasladado = sum(
        c.monto for c in conceptos if c.tipo == "iva_trasladado"
    ) or Decimal("0.00")

    return DiotResponse(
        periodo_mes=mes,
        periodo_anio=anio,
        iva_acreditable=iva_acreditable,
        iva_trasladado=iva_trasladado,
        diferencia=iva_trasladado - iva_acreditable,
        proveedores=0,
    )


async def _diot_desde_polizas(
    db: AsyncSession,
    cliente_id: int,
    mes: int,
    anio: int,
) -> Optional[dict]:
    """Calcula la DIOT desde las pólizas contables del período.

    Lógica:
    - Cuentas de IVA acreditable: código empieza con "118" (activo IVA)
    - Cuentas de IVA trasladado: código empieza con "213" (pasivo IVA)
    - IVA acreditable = suma de cargos - abonos en cuentas 118-xxx
      (el IVA pagado en compras/gastos se carga al activo)
    - IVA trasladado = suma de abonos - cargos en cuentas 213-xxx
      (el IVA cobrado en ventas se abona al pasivo)
    - Proveedores: RFCs únicos de clientes en pólizas de egresos

    Returns:
        dict con {iva_acreditable, iva_trasladado, proveedores} o None si no hay pólizas.
    """
    # Buscar cuentas de IVA
    iva_activo_result = await db.execute(
        select(CuentaContable.id, CuentaContable.codigo)
        .where(CuentaContable.codigo.like("118%"))
    )
    cuentas_iva_activo = {row.id: row.codigo for row in iva_activo_result.all()}

    iva_pasivo_result = await db.execute(
        select(CuentaContable.id, CuentaContable.codigo)
        .where(CuentaContable.codigo.like("213%"))
    )
    cuentas_iva_pasivo = {row.id: row.codigo for row in iva_pasivo_result.all()}

    if not cuentas_iva_activo and not cuentas_iva_pasivo:
        logger.info("No hay cuentas de IVA (118/213) en el catálogo, DIOT desde pólizas no disponible")
        return None

    # Buscar pólizas del período
    polizas_result = await db.execute(
        select(Poliza.id, Poliza.tipo, Poliza.cliente_id)
        .where(Poliza.periodo_mes == mes)
        .where(Poliza.periodo_anio == anio)
    )
    polizas = polizas_result.all()

    if not polizas:
        logger.info(f"No hay pólizas para {mes}/{anio}, DIOT desde pólizas no disponible")
        return None

    poliza_ids = [p.id for p in polizas]
    poliza_tipos = {p.id: p.tipo for p in polizas}
    poliza_clientes = {p.id: p.cliente_id for p in polizas if p.cliente_id}

    # Obtener todos los movimientos del período
    detalles_result = await db.execute(
        select(PolizaDetalle)
        .where(PolizaDetalle.poliza_id.in_(poliza_ids))
    )
    detalles = detalles_result.scalars().all()

    iva_acreditable = Decimal("0.00")
    iva_trasladado = Decimal("0.00")

    for det in detalles:
        if det.cuenta_id in cuentas_iva_activo:
            # IVA acreditable: los cargos representan IVA pagado (acreditable)
            iva_acreditable += (det.cargo or Decimal("0.00")) - (det.abono or Decimal("0.00"))
        elif det.cuenta_id in cuentas_iva_pasivo:
            # IVA trasladado: los abonos representan IVA cobrado (trasladado)
            iva_trasladado += (det.abono or Decimal("0.00")) - (det.cargo or Decimal("0.00"))

    # Contar proveedores únicos (RFCs de clientes en pólizas de egresos)
    proveedor_clientes = set()
    for p in polizas:
        if poliza_tipos.get(p.id) == "egresos" and p.cliente_id:
            proveedor_clientes.add(p.cliente_id)

    # Obtener RFCs de los clientes/proveedores
    proveedores_count = 0
    if proveedor_clientes:
        rfc_result = await db.execute(
            select(Cliente.rfc)
            .where(Cliente.id.in_(proveedor_clientes))
            .distinct()
        )
        proveedores_count = len(set(row.rfc for row in rfc_result.all()))

    logger.info(
        f"DIOT desde pólizas: {len(polizas)} pólizas, {len(detalles)} movimientos, "
        f"IVA acred={iva_acreditable}, IVA trasl={iva_trasladado}, proveedores={proveedores_count}"
    )

    return {
        "iva_acreditable": iva_acreditable,
        "iva_trasladado": iva_trasladado,
        "proveedores": proveedores_count,
    }


# ══════════════════════════════════════════════════════════════
# ─── Estímulos Fiscales ──────────────────────────
# ══════════════════════════════════════════════════════════════

ESTIMULOS_SEED = [
    {"nombre": "Deducción inmediata de inversiones (constructorcas)", "tipo": "deduccion", "porcentaje": 0.65, "impuesto_aplicable": "ISR", "fundamento_legal": "Art. 204 LISR"},
    {"nombre": "Estímulo fiscal región fronteriza norte", "tipo": "credito", "porcentaje": 0.33, "impuesto_aplicable": "IVA", "fundamento_legal": "Decreto frontera 2025-2026"},
    {"nombre": "Estímulo fiscal región fronteriza sur", "tipo": "credito", "porcentaje": 0.50, "impuesto_aplicable": "IVA", "fundamento_legal": "Decreto frontera sur"},
    {"nombre": "Crédito IEPS diésel agropecuario", "tipo": "credito", "porcentaje": 0.50, "impuesto_aplicable": "IEPS", "fundamento_legal": "LIEPS Art. 16"},
    {"nombre": "Deducción creación empleos", "tipo": "deduccion", "porcentaje": 0.30, "impuesto_aplicable": "ISR", "fundamento_legal": "Art. 190 LISR"},
    {"nombre": "Exención IVA exportación servicios", "tipo": "exencion", "porcentaje": 1.0, "impuesto_aplicable": "IVA", "fundamento_legal": "Art. 29 LIVA"},
    {"nombre": "Estímulo ISN nuevas empresas", "tipo": "exencion", "porcentaje": 1.0, "impuesto_aplicable": "ISN", "fundamento_legal": "Ley estatal"},
]


@router.post("/seed-estimulos", response_model=List[EstimuloFiscalResponse], status_code=status.HTTP_201_CREATED)
async def seed_estimulos(
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Inserta los estímulos fiscales seed en la base de datos (idempotente: no duplica)."""
    creados = []
    for est_data in ESTIMULOS_SEED:
        # Verificar si ya existe por nombre
        result = await db.execute(
            select(EstimuloFiscal).where(EstimuloFiscal.nombre == est_data["nombre"])
        )
        existente = result.scalar_one_or_none()
        if existente:
            creados.append(existente)
            continue

        estimulo = EstimuloFiscal(
            nombre=est_data["nombre"],
            descripcion=est_data.get("descripcion"),
            tipo=est_data["tipo"],
            porcentaje=Decimal(str(est_data["porcentaje"])),
            impuesto_aplicable=est_data["impuesto_aplicable"],
            fundamento_legal=est_data["fundamento_legal"],
            activo=True,
        )
        db.add(estimulo)
        creados.append(estimulo)

    await db.commit()
    for e in creados:
        await db.refresh(e)
    return creados


@router.get("/estimulos", response_model=List[EstimuloFiscalResponse])
async def listar_estimulos(
    activo: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista todos los estímulos fiscales disponibles."""
    query = select(EstimuloFiscal)
    if activo is not None:
        query = query.where(EstimuloFiscal.activo == activo)
    query = query.order_by(EstimuloFiscal.nombre)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/estimulos", response_model=EstimuloFiscalResponse, status_code=status.HTTP_201_CREATED)
async def crear_estimulo(
    data: EstimuloFiscalCreate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Crea un nuevo estímulo fiscal."""
    estimulo = EstimuloFiscal(
        nombre=data.nombre,
        descripcion=data.descripcion,
        tipo=data.tipo,
        porcentaje=data.porcentaje,
        impuesto_aplicable=data.impuesto_aplicable,
        fundamento_legal=data.fundamento_legal,
        activo=data.activo,
    )
    db.add(estimulo)
    await db.commit()
    await db.refresh(estimulo)
    return estimulo


@router.put("/estimulos/{estimulo_id}", response_model=EstimuloFiscalResponse)
async def actualizar_estimulo(
    estimulo_id: int,
    data: EstimuloFiscalCreate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Actualiza un estímulo fiscal existente."""
    result = await db.execute(
        select(EstimuloFiscal).where(EstimuloFiscal.id == estimulo_id)
    )
    estimulo = result.scalar_one_or_none()
    if not estimulo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estímulo no encontrado")

    estimulo.nombre = data.nombre
    estimulo.descripcion = data.descripcion
    estimulo.tipo = data.tipo
    estimulo.porcentaje = data.porcentaje
    estimulo.impuesto_aplicable = data.impuesto_aplicable
    estimulo.fundamento_legal = data.fundamento_legal
    estimulo.activo = data.activo

    await db.commit()
    await db.refresh(estimulo)
    return estimulo


@router.delete("/estimulos/{estimulo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_estimulo(
    estimulo_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Elimina un estímulo fiscal (soft-delete: lo desactiva)."""
    result = await db.execute(
        select(EstimuloFiscal).where(EstimuloFiscal.id == estimulo_id)
    )
    estimulo = result.scalar_one_or_none()
    if not estimulo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estímulo no encontrado")

    estimulo.activo = False
    await db.commit()
    return None


# ─── Cliente-Estímulos ────────────────────────────


@router.get("/clientes/{cliente_id}/estimulos", response_model=List[ClienteEstimuloResponse])
async def listar_estimulos_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista los estímulos fiscales asignados a un cliente."""
    result = await db.execute(
        select(ClienteEstimulo).where(
            ClienteEstimulo.cliente_id == cliente_id,
            ClienteEstimulo.activo == True,
        )
    )
    return result.scalars().all()


@router.post("/clientes/{cliente_id}/estimulos", response_model=ClienteEstimuloResponse, status_code=status.HTTP_201_CREATED)
async def asignar_estimulo_cliente(
    cliente_id: int,
    data: ClienteEstimuloCreate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Asigna un estímulo fiscal a un cliente."""
    # Verificar que el estímulo existe
    result_est = await db.execute(
        select(EstimuloFiscal).where(EstimuloFiscal.id == data.estimulo_id)
    )
    if not result_est.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estímulo no encontrado")

    # Verificar que no esté ya asignado
    result_existente = await db.execute(
        select(ClienteEstimulo).where(
            ClienteEstimulo.cliente_id == cliente_id,
            ClienteEstimulo.estimulo_id == data.estimulo_id,
            ClienteEstimulo.activo == True,
        )
    )
    if result_existente.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El estímulo ya está asignado al cliente")

    asignacion = ClienteEstimulo(
        cliente_id=cliente_id,
        estimulo_id=data.estimulo_id,
        fecha_inicio=data.fecha_inicio or datetime.utcnow(),
        fecha_fin=data.fecha_fin,
        activo=True,
    )
    db.add(asignacion)
    await db.commit()
    await db.refresh(asignacion)
    return asignacion


@router.delete("/clientes/{cliente_id}/estimulos/{estimulo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def quitar_estimulo_cliente(
    cliente_id: int,
    estimulo_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Quita un estímulo fiscal de un cliente (soft-delete)."""
    result = await db.execute(
        select(ClienteEstimulo).where(
            ClienteEstimulo.cliente_id == cliente_id,
            ClienteEstimulo.estimulo_id == estimulo_id,
            ClienteEstimulo.activo == True,
        )
    )
    asignacion = result.scalar_one_or_none()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estímulo no asignado al cliente")

    asignacion.activo = False
    asignacion.fecha_fin = datetime.utcnow()
    await db.commit()
    return None


# ══════════════════════════════════════════════════════════════
# ─── Calculadora de Impuestos Completa ──────────
# ══════════════════════════════════════════════════════════════

TASA_IVA = Decimal("0.16")
TASA_IEPS_DEFAULT = Decimal("0.08")  # placeholder, varía por producto
TASA_ISN_DEFAULT = Decimal("0.03")   # 3% estatal típico


@router.post("/calcular-completo", response_model=CalculoCompletoResponse)
async def calcular_impuestos_completo(
    data: CalculoCompletoRequest,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Calcula todos los impuestos aplicables con estímulos fiscales.

    Acepta ingresos, deducciones, IVA, IEPS, ISN y lista de estímulos.
    Devuelve desglose por cada impuesto con estímulos aplicados.
    """
    # Cargar estímulos aplicables
    estimulos = []
    if data.estimulos_ids:
        result_est = await db.execute(
            select(EstimuloFiscal).where(
                EstimuloFiscal.id.in_(data.estimulos_ids),
                EstimuloFiscal.activo == True,
            )
        )
        estimulos = result_est.scalars().all()

    # Indexar estímulos por impuesto
    estimulos_por_impuesto = {}
    for est in estimulos:
        imp = est.impuesto_aplicable or ""
        if imp not in estimulos_por_impuesto:
            estimulos_por_impuesto[imp] = []
        estimulos_por_impuesto[imp].append(est)

    resumen = []
    total_bruto = Decimal("0.00")
    total_ahorro = Decimal("0.00")
    total_neto = Decimal("0.00")

    def _aplicar_estimulos(impuesto_key: str, base: Decimal, tasa: Decimal, bruto: Decimal) -> ImpuestoDesglose:
        """Aplica el mejor estímulo disponible para este impuesto y devuelve el desglose."""
        neto = bruto
        ahorro = Decimal("0.00")
        estimulo_aplicado = False
        estimulo_tipo = None
        estimulo_pct = None

        est_list = estimulos_por_impuesto.get(impuesto_key, [])
        if est_list:
            # Tomar el mejor estímulo (el que dé más ahorro)
            mejor_ahorro = Decimal("0.00")
            mejor_est = None
            for est in est_list:
                pct = est.porcentaje or Decimal("0.00")
                if est.tipo == "credito":
                    ahorro_est = bruto * pct
                elif est.tipo == "deduccion":
                    # Deducción reduce la base
                    base_reducida = base - (base * pct)
                    if base_reducida < Decimal("0.00"):
                        base_reducida = Decimal("0.00")
                    nuevo_bruto = base_reducida * tasa
                    ahorro_est = bruto - nuevo_bruto
                elif est.tipo == "exencion":
                    ahorro_est = bruto * pct  # 100% = todo exento
                elif est.tipo == "tasa_reducida":
                    nueva_tasa = tasa * (Decimal("1.00") - pct)
                    nuevo_bruto = base * nueva_tasa
                    ahorro_est = bruto - nuevo_bruto
                elif est.tipo == "diferimiento":
                    ahorro_est = bruto * pct  # diferido, no pagado ahora
                else:
                    ahorro_est = bruto * pct

                if ahorro_est > mejor_ahorro:
                    mejor_ahorro = ahorro_est
                    mejor_est = est

            if mejor_est and mejor_ahorro > Decimal("0.00"):
                ahorro = mejor_ahorro.quantize(Decimal("0.01"))
                neto = (bruto - ahorro).quantize(Decimal("0.01"))
                if neto < Decimal("0.00"):
                    neto = Decimal("0.00")
                estimulo_aplicado = True
                estimulo_tipo = mejor_est.tipo
                estimulo_pct = mejor_est.porcentaje

        return ImpuestoDesglose(
            impuesto=impuesto_key,
            base=base.quantize(Decimal("0.01")),
            tasa=tasa,
            bruto=bruto.quantize(Decimal("0.01")),
            estimulo_aplicado=estimulo_aplicado,
            estimulo_tipo=estimulo_tipo,
            estimulo_porcentaje=estimulo_pct,
            ahorro_estimulo=ahorro,
            neto=neto,
        )

    utilidad = data.ingresos - data.deducciones

    # ── 1. ISR ──
    if utilidad > Decimal("0.00"):
        bracket_idx = _buscar_bracket(utilidad)
        _, _, tasa_isr = TARIFA_ISR_ANUAL[bracket_idx]
        cuota_fija = CUOTA_FIJA_ANUAL[bracket_idx]
        margen = utilidad - TARIFA_ISR_ANUAL[bracket_idx][0] + Decimal("0.01")
        isr_bruto = (margen * tasa_isr + cuota_fija).quantize(Decimal("0.01"))
    else:
        isr_bruto = Decimal("0.00")
        tasa_isr = Decimal("0.00")

    desglose_isr = _aplicar_estimulos("ISR", utilidad, tasa_isr, isr_bruto)
    resumen.append(desglose_isr)

    # ── 2. IVA ──
    iva_bruto = data.iva_trasladado - data.iva_acreditable
    if iva_bruto < Decimal("0.00"):
        iva_bruto = Decimal("0.00")
    desglose_iva = _aplicar_estimulos("IVA", data.iva_trasladado, TASA_IVA, iva_bruto)
    resumen.append(desglose_iva)

    # ── 3. IEPS ──
    ieps_bruto = data.ieps_trasladado - data.ieps_acreditable
    if ieps_bruto < Decimal("0.00"):
        ieps_bruto = Decimal("0.00")
    desglose_ieps = _aplicar_estimulos("IEPS", data.ieps_trasladado, TASA_IEPS_DEFAULT, ieps_bruto)
    resumen.append(desglose_ieps)

    # ── 4. ISN ──
    isn_bruto = data.isn_base * TASA_ISN_DEFAULT
    desglose_isn = _aplicar_estimulos("ISN", data.isn_base, TASA_ISN_DEFAULT, isn_bruto)
    resumen.append(desglose_isn)

    # ── Totales ──
    total_bruto = sum(r.bruto for r in resumen)
    total_ahorro = sum(r.ahorro_estimulo for r in resumen)
    total_neto = sum(r.neto for r in resumen)

    return CalculoCompletoResponse(
        resumen=resumen,
        total_impuestos_brutos=total_bruto.quantize(Decimal("0.01")),
        total_ahorro_estimulos=total_ahorro.quantize(Decimal("0.01")),
        total_impuestos_netos=total_neto.quantize(Decimal("0.01")),
    )
