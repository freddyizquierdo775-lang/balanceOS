"""
Balance OS — Router CRM: Seguimientos, Notas, Timeline y Búsqueda Global
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional

from app.database import get_db
from app.models import Cliente, Usuario, Empleado, Documento
from app.models.crm import Seguimiento, Nota
from app.models.eventos import Evento
from app.routers.auth import verificar_token
from app.schemas.crm import (
    SeguimientoCreate,
    SeguimientoUpdate,
    SeguimientoResponse,
    NotaCreate,
    NotaResponse,
    EventoResponse,
    BusquedaResultado,
)

router = APIRouter(prefix="/crm", tags=["crm"])


# ─── Helper ────────────────────────────────────────


async def _usuario_id(token: dict = Depends(verificar_token)) -> int:
    """Extrae el ID del usuario del token."""
    return token.get("id")


# ══════════════════════════════════════════════════════
#  SEGUIMIENTOS
# ══════════════════════════════════════════════════════


@router.get("/seguimientos", response_model=List[SeguimientoResponse])
async def listar_seguimientos(
    cliente_id: Optional[int] = Query(None, description="Filtrar por cliente"),
    estado: Optional[str] = Query(None, description="Filtrar por estado (pendiente, en_proceso, completado, cancelado)"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo (general, imss, fiscal, nomina, juridico)"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(verificar_token),
):
    """Lista seguimientos con filtros opcionales."""
    query = select(Seguimiento)

    if cliente_id is not None:
        query = query.where(Seguimiento.cliente_id == cliente_id)
    if estado:
        query = query.where(Seguimiento.estado == estado)
    if tipo:
        query = query.where(Seguimiento.tipo == tipo)

    # Asesores solo ven sus seguimientos; admin ve todos
    if usuario.get("rol") != "admin":
        query = query.where(Seguimiento.usuario_id == usuario["id"])

    query = query.order_by(Seguimiento.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/seguimientos", response_model=SeguimientoResponse, status_code=201)
async def crear_seguimiento(
    data: SeguimientoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(verificar_token),
):
    """Crea un nuevo seguimiento."""
    # Validar cliente si se especifica
    if data.cliente_id is not None:
        cliente_result = await db.execute(select(Cliente).where(Cliente.id == data.cliente_id))
        if not cliente_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

    seguimiento = Seguimiento(
        cliente_id=data.cliente_id,
        titulo=data.titulo,
        descripcion=data.descripcion,
        tipo=data.tipo,
        prioridad=data.prioridad,
        estado=data.estado,
        fecha_limite=data.fecha_limite,
        usuario_id=usuario.get("id"),
    )
    db.add(seguimiento)
    await db.commit()
    await db.refresh(seguimiento)
    return seguimiento


@router.patch("/seguimientos/{seguimiento_id}", response_model=SeguimientoResponse)
async def actualizar_seguimiento(
    seguimiento_id: int,
    data: SeguimientoUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(verificar_token),
):
    """Actualiza un seguimiento (estado, titulo, etc.)."""
    result = await db.execute(select(Seguimiento).where(Seguimiento.id == seguimiento_id))
    seguimiento = result.scalar_one_or_none()
    if not seguimiento:
        raise HTTPException(status_code=404, detail="Seguimiento no encontrado")

    # Solo admin o el dueño pueden actualizar
    if usuario.get("rol") != "admin" and seguimiento.usuario_id != usuario.get("id"):
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar este seguimiento")

    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(seguimiento, campo, valor)

    await db.commit()
    await db.refresh(seguimiento)
    return seguimiento


# ══════════════════════════════════════════════════════
#  NOTAS
# ══════════════════════════════════════════════════════


@router.get("/notas", response_model=List[NotaResponse])
async def listar_notas(
    cliente_id: Optional[int] = Query(None, description="Filtrar por cliente"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(verificar_token),
):
    """Lista notas con filtro opcional por cliente."""
    query = select(Nota)

    if cliente_id is not None:
        query = query.where(Nota.cliente_id == cliente_id)

    # Asesores solo ven sus notas; admin ve todas
    if usuario.get("rol") != "admin":
        query = query.where(Nota.usuario_id == usuario["id"])

    query = query.order_by(Nota.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/notas", response_model=NotaResponse, status_code=201)
async def crear_nota(
    data: NotaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(verificar_token),
):
    """Crea una nueva nota."""
    if data.cliente_id is not None:
        cliente_result = await db.execute(select(Cliente).where(Cliente.id == data.cliente_id))
        if not cliente_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

    nota = Nota(
        cliente_id=data.cliente_id,
        titulo=data.titulo,
        contenido=data.contenido,
        modulo_origen=data.modulo_origen,
        usuario_id=usuario.get("id"),
    )
    db.add(nota)
    await db.commit()
    await db.refresh(nota)
    return nota


# ══════════════════════════════════════════════════════
#  TIMELINE (Eventos)
# ══════════════════════════════════════════════════════


@router.get("/timeline", response_model=List[EventoResponse])
async def consultar_timeline(
    cliente_id: Optional[int] = Query(None, description="Filtrar eventos relacionados a un cliente"),
    entidad: Optional[str] = Query(None, description="Filtrar por tipo de entidad (cliente, nomina, factura, etc.)"),
    limit: int = Query(50, ge=1, le=200, description="Máximo de eventos a retornar"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(verificar_token),
):
    """Consulta el timeline de eventos. Puede filtrarse por cliente y tipo de entidad.

    Cuando se filtra por cliente_id, se buscan eventos donde:
    - entidad = 'cliente' y entidad_id = cliente_id, o
    - metadata_json contiene referencia al cliente.
    """
    if cliente_id is not None:
        # Buscar eventos directamente del cliente + eventos relacionados via metadata
        query = select(Evento).where(
            or_(
                (Evento.entidad == "cliente") & (Evento.entidad_id == cliente_id),
                Evento.metadata_json.contains({"cliente_id": cliente_id}),
            )
        )
    else:
        query = select(Evento)

    if entidad:
        query = query.where(Evento.entidad == entidad)

    query = query.order_by(Evento.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


# ══════════════════════════════════════════════════════
#  BÚSQUEDA GLOBAL
# ══════════════════════════════════════════════════════


@router.get("/buscar", response_model=List[BusquedaResultado])
async def buscar_global(
    q: str = Query(..., min_length=2, description="Término de búsqueda (mínimo 2 caracteres)"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(verificar_token),
):
    """Búsqueda global: busca en clientes, empleados y documentos."""
    search = f"%{q}%"
    resultados: list = []

    # 1. Buscar en clientes
    clientes_query = select(Cliente).where(
        or_(
            Cliente.rfc.ilike(search),
            Cliente.razon_social.ilike(search),
            Cliente.email.ilike(search),
            Cliente.telefono.ilike(search),
        )
    )
    # Asesores solo ven sus clientes
    if usuario.get("rol") != "admin":
        clientes_query = clientes_query.where(Cliente.asesor_id == usuario["id"])
    clientes_query = clientes_query.limit(20)
    clientes_result = await db.execute(clientes_query)
    for c in clientes_result.scalars().all():
        resultados.append(BusquedaResultado(
            tipo="cliente",
            id=c.id,
            titulo=c.razon_social,
            subtitulo=f"RFC: {c.rfc} · {c.estatus}",
            extra={"rfc": c.rfc, "estatus": c.estatus},
        ))

    # 2. Buscar en empleados
    empleados_query = select(Empleado).where(
        or_(
            Empleado.rfc.ilike(search),
            Empleado.curp.ilike(search),
            Empleado.nombre.ilike(search),
            Empleado.apellidos.ilike(search),
        )
    ).limit(20)
    empleados_result = await db.execute(empleados_query)
    for e in empleados_result.scalars().all():
        resultados.append(BusquedaResultado(
            tipo="empleado",
            id=e.id,
            titulo=f"{e.nombre} {e.apellidos}",
            subtitulo=f"RFC: {e.rfc} · {e.estatus}",
            extra={"rfc": e.rfc, "estatus": e.estatus},
        ))

    # 3. Buscar en documentos
    docs_query = select(Documento).where(
        or_(
            Documento.nombre.ilike(search),
            Documento.tipo.ilike(search),
        )
    ).limit(20)
    docs_result = await db.execute(docs_query)
    for d in docs_result.scalars().all():
        resultados.append(BusquedaResultado(
            tipo="documento",
            id=d.id,
            titulo=d.nombre,
            subtitulo=f"Tipo: {d.tipo or 'general'} · Cliente ID: {d.cliente_id}",
            extra={"tipo": d.tipo, "cliente_id": d.cliente_id},
        ))

    return resultados
