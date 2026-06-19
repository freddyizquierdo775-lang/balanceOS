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
    ImssAlta, ImssBaja, ImssTramite, RiesgoTrabajo,
    TipoMovimiento, EstatusTramite, MotivoBaja, TipoTramite,
)
from app.services.event_engine import emitir_evento
import os
from pathlib import Path

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
# Riesgos de Trabajo — Seguimiento de Calificación
# ═══════════════════════════════════════════════════

ESTATUS_RIESGO = ["pendiente", "en_calificacion", "calificado", "rechazado"]

RIESGO_UPLOAD_DIR = Path("./storage/imss_riesgos")
ALLOWED_EXT = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/riesgos-trabajo")
async def listar_riesgos_trabajo(
    cliente_id: Optional[int] = Query(None),
    empleado_id: Optional[int] = Query(None),
    estatus: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Lista riesgos de trabajo. Filtrables por cliente, empleado y/o estatus."""
    q = select(RiesgoTrabajo)
    if cliente_id:
        q = q.where(RiesgoTrabajo.cliente_id == cliente_id)
    if empleado_id:
        q = q.where(RiesgoTrabajo.empleado_id == empleado_id)
    if estatus:
        q = q.where(RiesgoTrabajo.estatus == estatus)
    q = q.order_by(RiesgoTrabajo.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/riesgos-trabajo", status_code=201)
async def crear_riesgo_trabajo(
    empleado_id: int = Form(...),
    cliente_id: int = Form(...),
    tipo_riesgo: str = Form("accidente"),
    descripcion: Optional[str] = Form(None),
    notas: Optional[str] = Form(None),
    documento_inicial: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Crea un nuevo riesgo de trabajo con opción de subir documento inicial."""
    if not await _cliente_existe(db, cliente_id):
        raise HTTPException(404, "Cliente no encontrado")
    if not await _empleado_existe(db, empleado_id):
        raise HTTPException(404, "Empleado no encontrado")

    doc_path = None
    if documento_inicial:
        ext = Path(documento_inicial.filename).suffix.lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(400, f"Extensión no permitida: {ext}")
        content = await documento_inicial.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(400, "Archivo muy grande. Máximo 10 MB")
        full_path = RIESGO_UPLOAD_DIR / f"cliente_{cliente_id}" / f"riesgo_inicial_{datetime.utcnow().timestamp()}{ext}"
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        doc_path = str(full_path)

    riesgo = RiesgoTrabajo(
        empleado_id=empleado_id,
        cliente_id=cliente_id,
        despacho_id=despacho_id,
        fecha_reporte=datetime.utcnow(),
        tipo_riesgo=tipo_riesgo,
        descripcion=descripcion,
        estatus="pendiente",
        documento_inicial_path=doc_path,
        notas=notas,
        usuario_id=usuario.id,
    )
    db.add(riesgo)
    await db.commit()
    await db.refresh(riesgo)

    await emitir_evento(
        entidad="imss",
        entidad_id=riesgo.id,
        accion="riesgo_creado",
        descripcion=f"Riesgo de trabajo creado para empleado {empleado_id}",
        usuario_id=usuario.id,
    )
    return riesgo


@router.patch("/riesgos-trabajo/{riesgo_id}")
async def actualizar_riesgo_trabajo(
    riesgo_id: int,
    estatus: Optional[str] = Body(None),
    dictamen: Optional[str] = Body(None),
    notas: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Actualiza estatus de un riesgo de trabajo. Si se califica, registra fecha."""
    result = await db.execute(select(RiesgoTrabajo).where(RiesgoTrabajo.id == riesgo_id))
    riesgo = result.scalar_one_or_none()
    if not riesgo:
        raise HTTPException(404, "Riesgo de trabajo no encontrado")

    estado_anterior = riesgo.estatus

    if estatus and estatus in ESTATUS_RIESGO:
        riesgo.estatus = estatus
        if estatus == "calificado" and not riesgo.fecha_calificacion:
            riesgo.fecha_calificacion = datetime.utcnow()
    if dictamen is not None:
        riesgo.dictamen = dictamen
    if notas is not None:
        riesgo.notas = notas

    await db.commit()
    await db.refresh(riesgo)

    await emitir_evento(
        entidad="imss",
        entidad_id=riesgo.id,
        accion="riesgo_actualizado",
        estado_anterior=estado_anterior,
        estado_nuevo=riesgo.estatus,
        descripcion=f"Riesgo #{riesgo.id} actualizado a {riesgo.estatus}",
        usuario_id=usuario.id,
    )
    return riesgo


@router.post("/riesgos-trabajo/{riesgo_id}/documento-calificado")
async def subir_documento_calificado(
    riesgo_id: int,
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Sube el documento de dictamen/calificación del IMSS para un riesgo."""
    result = await db.execute(select(RiesgoTrabajo).where(RiesgoTrabajo.id == riesgo_id))
    riesgo = result.scalar_one_or_none()
    if not riesgo:
        raise HTTPException(404, "Riesgo de trabajo no encontrado")

    ext = Path(archivo.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Extensión no permitida: {ext}")
    content = await archivo.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "Archivo muy grande. Máximo 10 MB")

    full_path = RIESGO_UPLOAD_DIR / f"cliente_{riesgo.cliente_id}" / f"riesgo_calificado_{riesgo.id}_{datetime.utcnow().timestamp()}{ext}"
    full_path.parent.mkdir(parents=True, exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(content)
    riesgo.documento_calificado_path = str(full_path)
    if riesgo.estatus == "pendiente":
        riesgo.estatus = "en_calificacion"

    await db.commit()
    await db.refresh(riesgo)
    return riesgo


@router.get("/riesgos-trabajo/{riesgo_id}/documento/{tipo}")
async def descargar_documento_riesgo(
    riesgo_id: int,
    tipo: str,  # "inicial" o "calificado"
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Descarga el documento inicial o calificado de un riesgo de trabajo."""
    result = await db.execute(select(RiesgoTrabajo).where(RiesgoTrabajo.id == riesgo_id))
    riesgo = result.scalar_one_or_none()
    if not riesgo:
        raise HTTPException(404, "Riesgo no encontrado")

    path = riesgo.documento_inicial_path if tipo == "inicial" else riesgo.documento_calificado_path
    if not path or not os.path.isfile(path):
        raise HTTPException(404, "Documento no encontrado")

    from fastapi.responses import FileResponse
    filename = os.path.basename(path)
    return FileResponse(path, media_type="application/octet-stream", filename=filename)


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

    # Auto-marcar empleado como pendiente de alta
    empleado_result = await db.execute(select(Empleado).where(Empleado.id == empleado_id))
    emp = empleado_result.scalar_one_or_none()
    if emp:
        emp.estatus_alta = "pendiente"
        await db.commit()

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
        # Si se completa el alta, marcar empleado como completado
        if estatus == "completado":
            emp_result = await db.execute(select(Empleado).where(Empleado.id == alta.empleado_id))
            emp = emp_result.scalar_one_or_none()
            if emp:
                emp.estatus_alta = "completado"
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

    # Riesgos de trabajo activos
    q_riesgos_activos = select(func.count(RiesgoTrabajo.id)).where(
        RiesgoTrabajo.estatus.in_(["pendiente", "en_calificacion"])
    )
    if cliente_id:
        q_riesgos_activos = q_riesgos_activos.where(RiesgoTrabajo.cliente_id == cliente_id)
    total_riesgos_activos = (await db.execute(q_riesgos_activos)).scalar() or 0

    # Riesgos sin calificar >30 días
    from datetime import timedelta
    q_riesgos_vencidos = select(func.count(RiesgoTrabajo.id)).where(
        RiesgoTrabajo.estatus.in_(["pendiente", "en_calificacion"]),
        RiesgoTrabajo.fecha_reporte < datetime.utcnow() - timedelta(days=30),
    )
    if cliente_id:
        q_riesgos_vencidos = q_riesgos_vencidos.where(RiesgoTrabajo.cliente_id == cliente_id)
    total_riesgos_vencidos = (await db.execute(q_riesgos_vencidos)).scalar() or 0

    # Empleados sin alta IMSS
    q_emp_sin_alta = select(func.count(Empleado.id)).where(Empleado.estatus_alta == "pendiente")
    if cliente_id:
        q_emp_sin_alta = q_emp_sin_alta.where(Empleado.id.in_(
            select(ImssAlta.empleado_id).where(ImssAlta.cliente_id == cliente_id)
        ))
    total_sin_alta = (await db.execute(q_emp_sin_alta)).scalar() or 0

    return {
        "cliente_id": cliente_id,
        "total_altas_pendientes": total_altas_pendientes,
        "total_bajas_pendientes": total_bajas_pendientes,
        "total_tramites_activos": total_tramites_activos,
        "total_riesgos_activos": total_riesgos_activos,
        "total_riesgos_vencidos": total_riesgos_vencidos,
        "total_empleados_sin_alta": total_sin_alta,
    }


# ═══════════════════════════════════════════════════
# Documentos Oficiales IMSS (AFIL, ST)
# ═══════════════════════════════════════════════════

from app.pdf.imss.afil_02 import generar_afil02
from app.pdf.imss.st_7 import generar_st7
from fastapi.responses import FileResponse as FileResp
from app.models import DocumentoOficial

DOCS_UPLOAD_DIR = Path("./storage/documentos_oficiales")
DOCS_ALLOWED_EXT = {".pdf", ".jpg", ".jpeg", ".png"}


async def _save_oficial_doc(entidad: str, entidad_id: int, tipo_formato: str,
                            version: str, archivo_bytes: bytes, extension: str,
                            despacho_id: int, usuario_id: int, db) -> DocumentoOficial:
    """Guarda un documento oficial en disco y crea registro en BD."""
    doc_dir = DOCS_UPLOAD_DIR / entidad / str(entidad_id)
    doc_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{tipo_formato}_{version}_{ts}{extension}"
    full_path = doc_dir / filename
    with open(full_path, "wb") as f:
        f.write(archivo_bytes)

    doc = DocumentoOficial(
        entidad=entidad, entidad_id=entidad_id,
        despacho_id=despacho_id,
        tipo_formato=tipo_formato, version=version,
        archivo_path=str(full_path),
        usuario_id=usuario_id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.post("/altas/{alta_id}/generar-afil02")
async def generar_afil02_endpoint(
    alta_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Genera PDF del AFIL-02 prellenado para una solicitud de alta."""
    result = await db.execute(select(ImssAlta).where(ImssAlta.id == alta_id))
    alta = result.scalar_one_or_none()
    if not alta:
        raise HTTPException(404, "Alta no encontrada")

    # Fetch related data
    emp_r = await db.execute(select(Empleado).where(Empleado.id == alta.empleado_id))
    empleado = emp_r.scalar_one_or_none()
    cli_r = await db.execute(select(Cliente).where(Cliente.id == alta.cliente_id))
    cliente = cli_r.scalar_one_or_none()

    if not empleado or not cliente:
        raise HTTPException(404, "Empleado o cliente no encontrado")

    pdf_bytes = generar_afil02(
        empleado={
            "nombre": empleado.nombre,
            "apellidos": empleado.apellidos,
            "rfc": empleado.rfc,
            "curp": empleado.curp,
            "fecha_nacimiento": empleado.fecha_nacimiento,
            "salario_diario": float(empleado.salario_diario or 0),
        },
        cliente={
            "razon_social": cliente.razon_social,
            "rfc": cliente.rfc,
            "regimen_fiscal": cliente.regimen_fiscal.value if hasattr(cliente.regimen_fiscal, 'value') else str(cliente.regimen_fiscal or ''),
        },
        alta={
            "id": alta.id,
            "nss": alta.nss,
            "fecha_efectiva": alta.fecha_efectiva,
            "tipo_movimiento": alta.tipo_movimiento.value if hasattr(alta.tipo_movimiento, 'value') else str(alta.tipo_movimiento or 'alta'),
        },
    )

    # Save as official document
    doc = await _save_oficial_doc(
        entidad="imss_alta", entidad_id=alta.id,
        tipo_formato="afil-02", version="generado",
        archivo_bytes=pdf_bytes, extension=".pdf",
        despacho_id=despacho_id, usuario_id=usuario.id, db=db,
    )

    await emitir_evento(
        entidad="imss", entidad_id=alta.id,
        accion="afil02_generado",
        descripcion=f"AFIL-02 generado para alta #{alta.id}",
        usuario_id=usuario.id,
    )

    return FileResp(
        path=doc.archivo_path,
        media_type="application/pdf",
        filename=f"AFIL02_alta_{alta_id}.pdf",
    )


@router.post("/riesgos-trabajo/{riesgo_id}/generar-st7")
async def generar_st7_endpoint(
    riesgo_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Genera PDF del ST-7 prellenado para un riesgo de trabajo."""
    result = await db.execute(select(RiesgoTrabajo).where(RiesgoTrabajo.id == riesgo_id))
    riesgo = result.scalar_one_or_none()
    if not riesgo:
        raise HTTPException(404, "Riesgo de trabajo no encontrado")

    emp_r = await db.execute(select(Empleado).where(Empleado.id == riesgo.empleado_id))
    empleado = emp_r.scalar_one_or_none()
    cli_r = await db.execute(select(Cliente).where(Cliente.id == riesgo.cliente_id))
    cliente = cli_r.scalar_one_or_none()

    if not empleado or not cliente:
        raise HTTPException(404, "Empleado o cliente no encontrado")

    pdf_bytes = generar_st7(
        empleado={
            "nombre": empleado.nombre,
            "apellidos": empleado.apellidos,
            "rfc": empleado.rfc,
            "curp": empleado.curp,
            "salario_diario": float(empleado.salario_diario or 0),
        },
        cliente={
            "razon_social": cliente.razon_social,
            "rfc": cliente.rfc,
        },
        riesgo={
            "id": riesgo.id,
            "tipo_riesgo": riesgo.tipo_riesgo or "otro",
            "descripcion": riesgo.descripcion,
            "fecha_reporte": riesgo.fecha_reporte,
        },
    )

    doc = await _save_oficial_doc(
        entidad="riesgo_trabajo", entidad_id=riesgo.id,
        tipo_formato="st-7", version="generado",
        archivo_bytes=pdf_bytes, extension=".pdf",
        despacho_id=despacho_id, usuario_id=usuario.id, db=db,
    )

    await emitir_evento(
        entidad="imss", entidad_id=riesgo.id,
        accion="st7_generado",
        descripcion=f"ST-7 generado para riesgo #{riesgo.id}",
        usuario_id=usuario.id,
    )

    return FileResp(
        path=doc.archivo_path,
        media_type="application/pdf",
        filename=f"ST7_riesgo_{riesgo_id}.pdf",
    )


@router.get("/documentos-oficiales")
async def listar_documentos_oficiales(
    entidad: Optional[str] = Query(None),
    entidad_id: Optional[int] = Query(None),
    tipo_formato: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Lista documentos oficiales IMSS. Filtrable por entidad, entidad_id y tipo_formato."""
    q = select(DocumentoOficial).order_by(DocumentoOficial.created_at.desc())
    if entidad:
        q = q.where(DocumentoOficial.entidad == entidad)
    if entidad_id:
        q = q.where(DocumentoOficial.entidad_id == entidad_id)
    if tipo_formato:
        q = q.where(DocumentoOficial.tipo_formato == tipo_formato)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/documentos-oficiales/{doc_id}/subir-firmado")
async def subir_documento_firmado(
    doc_id: int,
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Sube la versión firmada/escaneada de un documento oficial generado."""
    result = await db.execute(select(DocumentoOficial).where(DocumentoOficial.id == doc_id))
    doc_orig = result.scalar_one_or_none()
    if not doc_orig:
        raise HTTPException(404, "Documento no encontrado")

    ext = Path(archivo.filename).suffix.lower()
    if ext not in DOCS_ALLOWED_EXT:
        raise HTTPException(400, f"Extensión no permitida: {ext}")
    content = await archivo.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "Archivo muy grande. Máximo 10 MB")

    new_doc = await _save_oficial_doc(
        entidad=doc_orig.entidad, entidad_id=doc_orig.entidad_id,
        tipo_formato=doc_orig.tipo_formato, version="firmado",
        archivo_bytes=content, extension=ext,
        despacho_id=despacho_id, usuario_id=usuario.id, db=db,
    )
    return new_doc


@router.get("/documentos-oficiales/{doc_id}/descargar")
async def descargar_documento_oficial(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Descarga un documento oficial por su ID."""
    result = await db.execute(select(DocumentoOficial).where(DocumentoOficial.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    if not doc.archivo_path or not os.path.isfile(doc.archivo_path):
        raise HTTPException(404, "Archivo no encontrado en disco")
    filename = os.path.basename(doc.archivo_path)
    return FileResp(doc.archivo_path, media_type="application/octet-stream", filename=filename)
