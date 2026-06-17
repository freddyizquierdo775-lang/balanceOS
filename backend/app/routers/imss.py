"""
Balance OS — Router de Cálculos IMSS + Seguimiento
"""
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Body, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.routers.auth import verificar_usuario_actual
from app.dependencies import get_despacho_id
from app.imss.types import DatosTrabajador, ResultadoCuotas
from app.imss import calcular_cuotas, calcular_factor_integracion
from app.imss.rates import RIESGO_CLASE
from app.models import (
    Usuario, Empleado, Cliente,
    ImssAlta, ImssBaja, ImssTramite,
    TipoMovimiento, EstatusTramite, MotivoBaja, TipoTramite,
)
from app.services.event_engine import emitir_evento

router = APIRouter(prefix="/imss", tags=["imss"])

# ─── Helpers ───────────────────────────────────────

TODOS_LOS_ESTATUS = [e.value for e in EstatusTramite]


async def _cliente_existe(db: AsyncSession, cliente_id: int) -> bool:
    r = await db.execute(select(Cliente.id).where(Cliente.id == cliente_id))
    return r.scalar_one_or_none() is not None


async def _empleado_existe(db: AsyncSession, empleado_id: int) -> bool:
    r = await db.execute(select(Empleado.id).where(Empleado.id == empleado_id))
    return r.scalar_one_or_none() is not None


# ═══════════════════════════════════════════════════
# Calculadora IMSS (existente)
# ═══════════════════════════════════════════════════

@router.post("/calcular", response_model=ResultadoCuotas)
async def calcular_imss(
    data: DatosTrabajador,
    usuario: object = Depends(verificar_usuario_actual),
):
    """Calcula SBC y todas las cuotas obrero-patronales IMSS."""
    return calcular_cuotas(data)


@router.post("/factor-integracion")
async def calcular_factor(
    salario_diario: float = Body(...),
    dias_aguinaldo: int = Body(15),
    prima_vacacional_pct: float = Body(0.25),
    anios_servicio: int = Body(1),
    usuario: object = Depends(verificar_usuario_actual),
):
    """Calcula el factor de integración (LFT Art. 84)."""
    from app.imss.rates import DIAS_VACACIONES_POR_ANIO
    dias_vac = DIAS_VACACIONES_POR_ANIO.get(min(anios_servicio, 15), 40)
    factor = calcular_factor_integracion(
        Decimal(str(salario_diario)),
        dias_aguinaldo,
        Decimal(str(prima_vacacional_pct)),
        anios_servicio,
    )
    return {
        "factor_integracion": float(factor),
        "formula": f"1 + ({dias_aguinaldo}/365) + ({prima_vacacional_pct} * {dias_vac}/365)",
        "dias_vacaciones": dias_vac,
    }


# ═══════════════════════════════════════════════════
# Riesgos de Trabajo
# ═══════════════════════════════════════════════════

@router.get("/riesgos")
async def listar_riesgos(
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Lista las 5 clases de riesgo con sus descripciones y primas."""
    return [
        {
            "clase": k,
            "descripcion": v["descripcion"],
            "prima_base_pct": float(v["prima_base"]),
            "prima_min_pct": float(v["prima_min"]),
            "prima_max_pct": float(v["prima_max"]),
        }
        for k, v in RIESGO_CLASE.items()
    ]


# ═══════════════════════════════════════════════════
# Altas IMSS
# ═══════════════════════════════════════════════════

@router.get("/altas")
async def listar_altas(
    cliente_id: Optional[int] = Query(None),
    estatus: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Lista solicitudes de alta. Filtrables por cliente_id y/o estatus."""
    q = select(ImssAlta)
    if cliente_id:
        q = q.where(ImssAlta.cliente_id == cliente_id)
    if estatus:
        q = q.where(ImssAlta.estatus == estatus)
    q = q.order_by(ImssAlta.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/altas")
async def crear_alta(
    empleado_id: int = Body(...),
    cliente_id: int = Body(...),
    fecha_efectiva: Optional[str] = Body(None),
    nss: Optional[str] = Body(None),
    tipo_movimiento: str = Body("alta"),
    notas: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Crea una nueva solicitud de alta IMSS."""
    if not await _cliente_existe(db, cliente_id):
        raise HTTPException(404, "Cliente no encontrado")
    if not await _empleado_existe(db, empleado_id):
        raise HTTPException(404, "Empleado no encontrado")

    tipo = TipoMovimiento(tipo_movimiento) if tipo_movimiento in [e.value for e in TipoMovimiento] else TipoMovimiento.ALTA

    alta = ImssAlta(
        empleado_id=empleado_id,
        cliente_id=cliente_id,
        fecha_solicitud=datetime.utcnow(),
        fecha_efectiva=datetime.fromisoformat(fecha_efectiva) if fecha_efectiva else None,
        nss=nss,
        tipo_movimiento=tipo,
        estatus=EstatusTramite.PENDIENTE,
        notas=notas,
        usuario_id=usuario.id,
    )
    db.add(alta)
    await db.commit()
    await db.refresh(alta)

    await emitir_evento(
        entidad="imss",
        entidad_id=alta.id,
        accion="alta_creada",
        descripcion=f"Alta {tipo.value} solicitada para empleado {empleado_id}",
        usuario_id=usuario.id,
    )
    return alta


@router.patch("/altas/{alta_id}")
async def actualizar_alta(
    alta_id: int,
    estatus: Optional[str] = Body(None),
    notas: Optional[str] = Body(None),
    fecha_efectiva: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Actualiza el estatus de una solicitud de alta. También permite subir acuse."""
    result = await db.execute(select(ImssAlta).where(ImssAlta.id == alta_id))
    alta = result.scalar_one_or_none()
    if not alta:
        raise HTTPException(404, "Alta no encontrada")

    estado_anterior = alta.estatus.value if alta.estatus else None

    if estatus and estatus in TODOS_LOS_ESTATUS:
        alta.estatus = EstatusTramite(estatus)
    if notas is not None:
        alta.notas = notas
    if fecha_efectiva:
        alta.fecha_efectiva = datetime.fromisoformat(fecha_efectiva)

    await db.commit()
    await db.refresh(alta)

    await emitir_evento(
        entidad="imss",
        entidad_id=alta.id,
        accion="alta_actualizada",
        estado_anterior=estado_anterior,
        estado_nuevo=alta.estatus.value if alta.estatus else None,
        descripcion=f"Alta #{alta.id} actualizada a {alta.estatus.value}",
        usuario_id=usuario.id,
    )
    return alta


# ═══════════════════════════════════════════════════
# Bajas IMSS
# ═══════════════════════════════════════════════════

@router.get("/bajas")
async def listar_bajas(
    cliente_id: Optional[int] = Query(None),
    estatus: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Lista solicitudes de baja. Filtrables por cliente_id y/o estatus."""
    q = select(ImssBaja)
    if cliente_id:
        q = q.where(ImssBaja.cliente_id == cliente_id)
    if estatus:
        q = q.where(ImssBaja.estatus == estatus)
    q = q.order_by(ImssBaja.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/bajas")
async def crear_baja(
    empleado_id: int = Body(...),
    cliente_id: int = Body(...),
    fecha_baja: Optional[str] = Body(None),
    motivo: str = Body("renuncia"),
    notas: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Crea una nueva solicitud de baja IMSS."""
    if not await _cliente_existe(db, cliente_id):
        raise HTTPException(404, "Cliente no encontrado")
    if not await _empleado_existe(db, empleado_id):
        raise HTTPException(404, "Empleado no encontrado")

    mot = MotivoBaja(motivo) if motivo in [e.value for e in MotivoBaja] else MotivoBaja.OTRO

    baja = ImssBaja(
        empleado_id=empleado_id,
        cliente_id=cliente_id,
        fecha_solicitud=datetime.utcnow(),
        fecha_baja=datetime.fromisoformat(fecha_baja) if fecha_baja else None,
        motivo=mot,
        estatus=EstatusTramite.PENDIENTE,
        notas=notas,
        usuario_id=usuario.id,
    )
    db.add(baja)
    await db.commit()
    await db.refresh(baja)

    await emitir_evento(
        entidad="imss",
        entidad_id=baja.id,
        accion="baja_creada",
        descripcion=f"Baja por {mot} solicitada para empleado {empleado_id}",
        usuario_id=usuario.id,
    )
    return baja


@router.patch("/bajas/{baja_id}")
async def actualizar_baja(
    baja_id: int,
    estatus: Optional[str] = Body(None),
    notas: Optional[str] = Body(None),
    fecha_baja: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Actualiza el estatus de una solicitud de baja."""
    result = await db.execute(select(ImssBaja).where(ImssBaja.id == baja_id))
    baja = result.scalar_one_or_none()
    if not baja:
        raise HTTPException(404, "Baja no encontrada")

    estado_anterior = baja.estatus.value if baja.estatus else None

    if estatus and estatus in TODOS_LOS_ESTATUS:
        baja.estatus = EstatusTramite(estatus)
    if notas is not None:
        baja.notas = notas
    if fecha_baja:
        baja.fecha_baja = datetime.fromisoformat(fecha_baja)

    await db.commit()
    await db.refresh(baja)

    await emitir_evento(
        entidad="imss",
        entidad_id=baja.id,
        accion="baja_actualizada",
        estado_anterior=estado_anterior,
        estado_nuevo=baja.estatus.value if baja.estatus else None,
        descripcion=f"Baja #{baja.id} actualizada a {baja.estatus.value}",
        usuario_id=usuario.id,
    )
    return baja


# ═══════════════════════════════════════════════════
# Trámites IMSS
# ═══════════════════════════════════════════════════

@router.get("/tramites")
async def listar_tramites(
    cliente_id: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    estatus: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Lista trámites IMSS. Filtrables por cliente_id, tipo y/o estatus."""
    q = select(ImssTramite)
    if cliente_id:
        q = q.where(ImssTramite.cliente_id == cliente_id)
    if tipo:
        q = q.where(ImssTramite.tipo == tipo)
    if estatus:
        q = q.where(ImssTramite.estatus == estatus)
    q = q.order_by(ImssTramite.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/tramites")
async def crear_tramite(
    cliente_id: int = Body(...),
    tipo: str = Body("otro"),
    descripcion: Optional[str] = Body(None),
    notas: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Crea un nuevo trámite ante el IMSS."""
    if not await _cliente_existe(db, cliente_id):
        raise HTTPException(404, "Cliente no encontrado")

    tp = TipoTramite(tipo) if tipo in [e.value for e in TipoTramite] else TipoTramite.OTRO

    tramite = ImssTramite(
        cliente_id=cliente_id,
        tipo=tp,
        descripcion=descripcion,
        estatus=EstatusTramite.PENDIENTE,
        fecha_inicio=datetime.utcnow(),
        notas=notas,
        usuario_id=usuario.id,
    )
    db.add(tramite)
    await db.commit()
    await db.refresh(tramite)

    await emitir_evento(
        entidad="imss",
        entidad_id=tramite.id,
        accion="tramite_creado",
        descripcion=f"Trámite {tp.value} creado para cliente {cliente_id}",
        usuario_id=usuario.id,
    )
    return tramite


@router.patch("/tramites/{tramite_id}")
async def actualizar_tramite(
    tramite_id: int,
    estatus: Optional[str] = Body(None),
    notas: Optional[str] = Body(None),
    fecha_resolucion: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Actualiza el estatus de un trámite IMSS."""
    result = await db.execute(select(ImssTramite).where(ImssTramite.id == tramite_id))
    tramite = result.scalar_one_or_none()
    if not tramite:
        raise HTTPException(404, "Trámite no encontrado")

    estado_anterior = tramite.estatus.value if tramite.estatus else None

    if estatus and estatus in TODOS_LOS_ESTATUS:
        tramite.estatus = EstatusTramite(estatus)
        if estatus == "completado" and not fecha_resolucion:
            tramite.fecha_resolucion = datetime.utcnow()
    if notas is not None:
        tramite.notas = notas
    if fecha_resolucion:
        tramite.fecha_resolucion = datetime.fromisoformat(fecha_resolucion)

    await db.commit()
    await db.refresh(tramite)

    await emitir_evento(
        entidad="imss",
        entidad_id=tramite.id,
        accion="tramite_actualizado",
        estado_anterior=estado_anterior,
        estado_nuevo=tramite.estatus.value if tramite.estatus else None,
        descripcion=f"Trámite #{tramite.id} actualizado a {tramite.estatus.value}",
        usuario_id=usuario.id,
    )
    return tramite


# ═══════════════════════════════════════════════════
# Resumen / KPIs
# ═══════════════════════════════════════════════════

@router.get("/resumen")
async def resumen_imss(
    cliente_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """KPIs: total de altas pendientes, bajas pendientes y trámites activos."""
    # Altas pendientes
    q_altas = select(func.count(ImssAlta.id)).where(ImssAlta.estatus == "pendiente")
    if cliente_id:
        q_altas = q_altas.where(ImssAlta.cliente_id == cliente_id)
    total_altas_pendientes = (await db.execute(q_altas)).scalar() or 0

    # Bajas pendientes
    q_bajas = select(func.count(ImssBaja.id)).where(ImssBaja.estatus == "pendiente")
    if cliente_id:
        q_bajas = q_bajas.where(ImssBaja.cliente_id == cliente_id)
    total_bajas_pendientes = (await db.execute(q_bajas)).scalar() or 0

    # Trámites activos
    q_tramites = select(func.count(ImssTramite.id)).where(
        ImssTramite.estatus.in_(["pendiente", "en_proceso"])
    )
    if cliente_id:
        q_tramites = q_tramites.where(ImssTramite.cliente_id == cliente_id)
    total_tramites_activos = (await db.execute(q_tramites)).scalar() or 0

    return {
        "cliente_id": cliente_id,
        "total_altas_pendientes": total_altas_pendientes,
        "total_bajas_pendientes": total_bajas_pendientes,
        "total_tramites_activos": total_tramites_activos,
    }
