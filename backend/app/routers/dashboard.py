"""Dashboard — KPIs y actividad reciente."""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import Cliente, Empleado, Evento
from app.routers.auth import verificar_token
from app.dependencies import get_despacho_id

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis")
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(verificar_token),
):
    # Clientes activos
    result = await db.execute(
        select(func.count()).select_from(Cliente).where(Cliente.estatus == "activo")
    )
    clientes_activos = result.scalar() or 0

    # Empleados totales
    result = await db.execute(select(func.count()).select_from(Empleado))
    empleados_total = result.scalar() or 0

    # Eventos hoy
    hoy = datetime.utcnow().date()
    result = await db.execute(
        select(func.count())
        .select_from(Evento)
        .where(func.date(Evento.created_at) == hoy)
    )
    eventos_hoy = result.scalar() or 0

    return {
        "clientes_activos": clientes_activos,
        "empleados_total": empleados_total,
        "eventos_hoy": eventos_hoy,
        "timbres_mes": 0,  # placeholder hasta integrar PAC real
        "iva_por_pagar": 0.0,  # placeholder
    }


@router.get("/actividad")
async def get_actividad(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(verificar_token),
):
    result = await db.execute(
        select(Evento).order_by(Evento.created_at.desc()).limit(limit)
    )
    eventos = result.scalars().all()
    return [
        {
            "id": e.id,
            "entidad": e.entidad,
            "accion": e.accion,
            "descripcion": e.descripcion,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in eventos
    ]


@router.get("/graficos")
async def get_graficos(
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(verificar_token),
):
    # Distribución de clientes por régimen
    result = await db.execute(
        select(Cliente.regimen_fiscal, func.count()).group_by(Cliente.regimen_fiscal)
    )
    regimenes = [{"regimen": str(r), "count": c} for r, c in result.all()]

    return {
        "regimenes": regimenes,
        "ingresos_mensuales": [],  # placeholder
    }
