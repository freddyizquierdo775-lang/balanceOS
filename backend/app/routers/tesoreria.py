"""
Balance OS — Router de Tesorería
Vista multi-cliente para contador: permite ver, filtrar y gestionar
cuentas bancarias y movimientos por cliente o globalmente.
"""
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.database import get_db
from app.models import CuentaBancaria, MovimientoBancario, ConciliacionBancaria
from app.models import Cliente  # noqa: F401
from app.schemas.tesoreria import (
    CuentaBancariaCreate, CuentaBancariaResponse,
    MovimientoCreate, MovimientoResponse,
    ConciliacionRequest, ConciliacionResponse, EstadoCuentaResponse,
    ClienteResumenResponse, ResumenResponse,
)
from app.routers.auth import verificar_token
from app.services.event_engine import emitir_evento

router = APIRouter(prefix="/tesoreria", tags=["tesoreria"])


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Clientes (vista multi-cliente) ──────────────────


@router.get("/clientes", response_model=List[ClienteResumenResponse])
async def listar_clientes_tesoreria(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """
    Devuelve todos los clientes con resumen de tesorería:
    razon_social, número de cuentas, saldo total y fecha del último movimiento.
    """
    # Cargar todos los clientes
    clientes_result = await db.execute(select(Cliente).order_by(Cliente.razon_social))
    clientes = clientes_result.scalars().all()

    resumen = []
    for c in clientes:
        # Cuentas del cliente
        cuentas_result = await db.execute(
            select(CuentaBancaria).where(
                CuentaBancaria.cliente_id == c.id,
                CuentaBancaria.activo == True,
            )
        )
        cuentas = cuentas_result.scalars().all()

        num_cuentas = len(cuentas)
        saldo_total = (
            sum(cta.saldo_actual for cta in cuentas)
            if cuentas
            else Decimal("0.00")
        )

        # Último movimiento entre todas las cuentas del cliente
        ultimo_mov = None
        if cuentas:
            cuenta_ids = [cta.id for cta in cuentas]
            mov_result = await db.execute(
                select(MovimientoBancario.fecha)
                .where(MovimientoBancario.cuenta_id.in_(cuenta_ids))
                .order_by(MovimientoBancario.fecha.desc())
                .limit(1)
            )
            ultimo = mov_result.scalar_one_or_none()
            if ultimo:
                # Ensure it has a date attr; could be a Row or scalar
                ultimo_mov = ultimo if isinstance(ultimo, datetime) else ultimo[0] if ultimo else None

        resumen.append(ClienteResumenResponse(
            id=c.id,
            razon_social=c.razon_social,
            num_cuentas=num_cuentas,
            saldo_total=saldo_total,
            ultimo_movimiento=ultimo_mov,
        ))

    return resumen


@router.get("/resumen", response_model=ResumenResponse)
async def resumen_tesoreria(
    cliente_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """
    KPI resumen: saldo total, ingresos del mes, egresos del mes, cuentas activas.
    Si se pasa cliente_id, filtra solo ese cliente.
    """
    now = datetime.utcnow()
    inicio_mes = datetime(now.year, now.month, 1)

    # Cuentas activas
    cuentas_query = select(CuentaBancaria).where(CuentaBancaria.activo == True)
    if cliente_id:
        cuentas_query = cuentas_query.where(CuentaBancaria.cliente_id == cliente_id)
    cuentas_result = await db.execute(cuentas_query)
    cuentas = cuentas_result.scalars().all()

    cuentas_activas = len(cuentas)
    saldo_total = sum(cta.saldo_actual for cta in cuentas) if cuentas else Decimal("0.00")

    # Movimientos del mes
    cuenta_ids = [cta.id for cta in cuentas]
    if cuenta_ids:
        # Ingresos (abonos) del mes
        ingresos_result = await db.execute(
            select(func.coalesce(func.sum(MovimientoBancario.monto), 0))
            .where(
                MovimientoBancario.cuenta_id.in_(cuenta_ids),
                MovimientoBancario.tipo == "abono",
                MovimientoBancario.fecha >= inicio_mes,
            )
        )
        ingresos_mes = ingresos_result.scalar() or Decimal("0.00")

        # Egresos (cargos) del mes
        egresos_result = await db.execute(
            select(func.coalesce(func.sum(MovimientoBancario.monto), 0))
            .where(
                MovimientoBancario.cuenta_id.in_(cuenta_ids),
                MovimientoBancario.tipo == "cargo",
                MovimientoBancario.fecha >= inicio_mes,
            )
        )
        egresos_mes = egresos_result.scalar() or Decimal("0.00")
    else:
        ingresos_mes = Decimal("0.00")
        egresos_mes = Decimal("0.00")

    return ResumenResponse(
        saldo_total=saldo_total,
        ingresos_mes=ingresos_mes,
        egresos_mes=egresos_mes,
        cuentas_activas=cuentas_activas,
    )


# ─── Cuentas Bancarias ─────────────────────────────


@router.post("/cuentas", response_model=CuentaBancariaResponse, status_code=status.HTTP_201_CREATED)
async def crear_cuenta_bancaria(
    data: CuentaBancariaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Crea una nueva cuenta bancaria."""
    cuenta = CuentaBancaria(
        cliente_id=data.cliente_id,
        banco=data.banco,
        numero_cuenta=data.numero_cuenta,
        clabe=data.clabe,
        tipo=data.tipo,
        saldo_inicial=data.saldo_inicial,
        saldo_actual=data.saldo_inicial,
    )
    db.add(cuenta)
    await db.commit()
    await db.refresh(cuenta)

    # Evento
    await emitir_evento(
        entidad="tesoreria",
        entidad_id=cuenta.id,
        accion="cuenta_creada",
        descripcion=f"Cuenta {cuenta.banco} — {cuenta.numero_cuenta} creada",
        metadata_json={
            "cliente_id": data.cliente_id,
            "banco": data.banco,
            "saldo_inicial": float(data.saldo_inicial),
        },
        usuario_id=usuario.get("id"),
    )

    return cuenta


@router.get("/cuentas", response_model=List[CuentaBancariaResponse])
async def listar_cuentas_bancarias(
    cliente_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """
    Lista las cuentas bancarias.
    - Con cliente_id: solo las de ese cliente.
    - Sin cliente_id: TODAS (vista contador global).
    """
    query = select(CuentaBancaria).where(CuentaBancaria.activo == True)
    if cliente_id:
        query = query.where(CuentaBancaria.cliente_id == cliente_id)
    query = query.order_by(CuentaBancaria.banco)
    result = await db.execute(query)
    return result.scalars().all()


# ─── Movimientos ───────────────────────────────────


@router.post("/movimientos", response_model=MovimientoResponse, status_code=status.HTTP_201_CREATED)
async def registrar_movimiento(
    data: MovimientoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Registra un movimiento bancario y actualiza el saldo de la cuenta."""
    # Validar cuenta
    cuenta_result = await db.execute(
        select(CuentaBancaria).where(CuentaBancaria.id == data.cuenta_id)
    )
    cuenta = cuenta_result.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta bancaria no encontrada")

    fecha = datetime.strptime(data.fecha, "%Y-%m-%d")
    monto = data.monto

    movimiento = MovimientoBancario(
        cuenta_id=data.cuenta_id,
        fecha=fecha,
        tipo=data.tipo,
        concepto=data.concepto,
        monto=monto,
        referencia=data.referencia,
    )
    db.add(movimiento)

    # Actualizar saldo actual
    if data.tipo == "abono":
        cuenta.saldo_actual += monto
    else:  # cargo
        cuenta.saldo_actual -= monto

    await db.commit()
    await db.refresh(movimiento)

    # Evento
    tipo_nombre = "Abono" if data.tipo == "abono" else "Cargo"
    await emitir_evento(
        entidad="tesoreria",
        entidad_id=cuenta.id,
        accion="movimiento_creado",
        descripcion=f"{tipo_nombre}: ${float(monto):,.2f} en {cuenta.banco} — {cuenta.numero_cuenta}",
        metadata_json={
            "cliente_id": cuenta.cliente_id,
            "monto": float(monto),
            "tipo": data.tipo,
            "cuenta_id": data.cuenta_id,
        },
        usuario_id=usuario.get("id"),
    )

    return movimiento


@router.get("/movimientos", response_model=List[MovimientoResponse])
async def listar_movimientos(
    cliente_id: Optional[int] = Query(None),
    cuenta_id: Optional[int] = Query(None),
    limite: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """
    Lista movimientos bancarios con filtros opcionales.
    - cliente_id: filtra movimientos de todas las cuentas del cliente.
    - cuenta_id: filtra por cuenta específica.
    - limite: máximo de registros (default 50, max 500).
    """
    query = select(MovimientoBancario)

    if cuenta_id:
        query = query.where(MovimientoBancario.cuenta_id == cuenta_id)
    elif cliente_id:
        # Obtener todos los IDs de cuenta del cliente
        cuentas_result = await db.execute(
            select(CuentaBancaria.id).where(CuentaBancaria.cliente_id == cliente_id)
        )
        cuenta_ids = [row[0] for row in cuentas_result.all()]
        if cuenta_ids:
            query = query.where(MovimientoBancario.cuenta_id.in_(cuenta_ids))
        else:
            return []

    query = query.order_by(MovimientoBancario.fecha.desc()).limit(limite)
    result = await db.execute(query)
    return result.scalars().all()


# ─── Conciliación ──────────────────────────────────


@router.post("/conciliar", response_model=ConciliacionResponse)
async def conciliar_cuenta(
    data: ConciliacionRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Realiza la conciliación bancaria de una cuenta para un período."""
    cuenta_result = await db.execute(
        select(CuentaBancaria).where(CuentaBancaria.id == data.cuenta_id)
    )
    cuenta = cuenta_result.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta bancaria no encontrada")

    saldo_sistema = cuenta.saldo_actual
    diferencia = data.saldo_estado_cuenta - saldo_sistema

    conciliacion = ConciliacionBancaria(
        cuenta_id=data.cuenta_id,
        periodo_mes=data.periodo_mes,
        periodo_anio=data.periodo_anio,
        saldo_estado_cuenta=data.saldo_estado_cuenta,
        saldo_sistema=saldo_sistema,
        diferencia=diferencia,
        conciliado=diferencia == Decimal("0.00"),
        fecha_conciliacion=datetime.utcnow() if diferencia == Decimal("0.00") else None,
        notas=data.notas,
    )
    db.add(conciliacion)

    # Marcar movimientos como conciliados si la diferencia es cero
    if diferencia == Decimal("0.00"):
        mov_result = await db.execute(
            select(MovimientoBancario).where(MovimientoBancario.cuenta_id == data.cuenta_id)
        )
        movs = mov_result.scalars().all()
        for m in movs:
            m.conciliado = True
            m.fecha_conciliacion = datetime.utcnow()

    await db.commit()
    await db.refresh(conciliacion)

    # Evento
    await emitir_evento(
        entidad="tesoreria",
        entidad_id=conciliacion.id,
        accion="conciliacion_realizada",
        descripcion=f"Conciliación cuenta {cuenta.banco} ({data.periodo_mes}/{data.periodo_anio}) — diff: ${float(diferencia):,.2f}",
        metadata_json={
            "cliente_id": cuenta.cliente_id,
            "cuenta_id": data.cuenta_id,
            "conciliado": diferencia == Decimal("0.00"),
            "diferencia": float(diferencia),
        },
        usuario_id=usuario.get("id"),
    )

    return conciliacion


# ─── Estado de Cuenta ──────────────────────────────


@router.get("/estado-cuenta/{cuenta_id}", response_model=EstadoCuentaResponse)
async def estado_cuenta(
    cuenta_id: int,
    mes: int = Query(...),
    anio: int = Query(...),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Obtiene el estado de cuenta con movimientos y saldos del período."""
    cuenta_result = await db.execute(
        select(CuentaBancaria).where(CuentaBancaria.id == cuenta_id)
    )
    cuenta = cuenta_result.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta bancaria no encontrada")

    # Movimientos del período
    mov_result = await db.execute(
        select(MovimientoBancario)
        .where(MovimientoBancario.cuenta_id == cuenta_id)
        .where(func.strftime("%m", MovimientoBancario.fecha) == f"{mes:02d}")
        .where(func.strftime("%Y", MovimientoBancario.fecha) == str(anio))
        .order_by(MovimientoBancario.fecha)
    )
    movimientos = mov_result.scalars().all()

    total_cargos = sum(m.monto for m in movimientos if m.tipo == "cargo") or Decimal("0.00")
    total_abonos = sum(m.monto for m in movimientos if m.tipo == "abono") or Decimal("0.00")

    # Saldo inicial del período (saldo actual - movimientos del periodo)
    saldo_inicial_periodo = cuenta.saldo_actual - total_abonos + total_cargos
    saldo_final = cuenta.saldo_actual

    return EstadoCuentaResponse(
        cuenta=cuenta,
        movimientos=movimientos,
        saldo_inicial_periodo=saldo_inicial_periodo,
        total_cargos=total_cargos,
        total_abonos=total_abonos,
        saldo_final=saldo_final,
    )
