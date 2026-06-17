"""
Balance OS — Dependencias reutilizables (multi-tenancy, permisos, etc.)
"""
from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Usuario
from app.routers.auth import verificar_token


async def get_despacho_id(
    usuario: dict = Depends(verificar_token),
    db: AsyncSession = Depends(get_db),
) -> int:
    """Obtiene el despacho_id del usuario autenticado."""
    result = await db.execute(
        select(Usuario.despacho_id).where(Usuario.id == usuario["id"])
    )
    despacho_id = result.scalar_one_or_none()
    if not despacho_id:
        raise HTTPException(status_code=400, detail="Usuario sin despacho asignado")
    return despacho_id
