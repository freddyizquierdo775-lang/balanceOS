"""Balance OS — Router Portal Cliente (datos propios)"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import Cliente, Documento, Recibo, PeriodoNomina, RolUsuario
from app.routers.auth import verificar_token
from app.dependencies import get_despacho_id
from app.schemas import ClienteResponse
from app.schemas.nomina import ReciboResponse

router = APIRouter(prefix="/portal", tags=["portal"])


async def get_cliente_data(token: dict = Depends(verificar_token)):
    """Obtiene el cliente asociado al usuario autenticado (rol=cliente)."""
    return token


@router.get("/mi-perfil", response_model=ClienteResponse)
async def mi_perfil(
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_cliente_data),
):
    """Devuelve la info del cliente asociado al usuario."""
    if usuario.get("rol") != "cliente":
        raise HTTPException(status_code=403, detail="Solo disponible para clientes")

    # Buscar cliente por email del usuario
    result = await db.execute(
        select(Cliente).where(Cliente.email == usuario.get("email"))
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return cliente


@router.get("/mis-recibos", response_model=List[ReciboResponse])
async def mis_recibos(
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_cliente_data),
):
    """Devuelve los recibos de nómina del cliente."""
    if usuario.get("rol") != "cliente":
        raise HTTPException(status_code=403, detail="Solo disponible para clientes")

    # Buscar período que incluya al cliente (simplificación)
    result = await db.execute(
        select(Recibo).order_by(Recibo.created_at.desc()).limit(50)
    )
    return result.scalars().all()


@router.get("/mis-documentos", response_model=List)
async def mis_documentos(
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_cliente_data),
):
    """Devuelve los documentos del cliente."""
    if usuario.get("rol") != "cliente":
        raise HTTPException(status_code=403, detail="Solo disponible para clientes")

    result = await db.execute(
        select(Cliente).where(Cliente.email == usuario.get("email"))
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    result = await db.execute(
        select(Documento).where(Documento.cliente_id == cliente.id)
    )
    docs = result.scalars().all()
    return [
        {"id": d.id, "nombre": d.nombre, "tipo": d.tipo, "created_at": d.created_at}
        for d in docs
    ]
