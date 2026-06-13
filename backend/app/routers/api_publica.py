"""
Balance OS — API Pública (acceso con API key)
"""
import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import Cliente

router = APIRouter(prefix="/api/v1", tags=["api-publica"])

API_PUBLIC_KEY = os.getenv("API_PUBLIC_KEY", "clave-publica-secreta-por-defecto")


async def verificar_api_key(api_key: str = Query(..., alias="api_key")):
    """Valida la API key pública."""
    if api_key != API_PUBLIC_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key inválida",
        )
    return True


@router.get("/clientes", response_model=List[dict])
async def listar_clientes_publicos(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verificar_api_key),
):
    """Lista pública de clientes (solo datos básicos)."""
    result = await db.execute(
        select(Cliente).order_by(Cliente.razon_social)
    )
    clientes = result.scalars().all()
    return [
        {
            "id": c.id,
            "rfc": c.rfc,
            "razon_social": c.razon_social,
            "regimen_fiscal": c.regimen_fiscal.value if c.regimen_fiscal else None,
        }
        for c in clientes
    ]


@router.get("/clientes/{rfc}", response_model=dict)
async def consultar_cliente_por_rfc(
    rfc: str,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verificar_api_key),
):
    """Consulta un cliente por RFC (solo datos básicos)."""
    result = await db.execute(
        select(Cliente).where(Cliente.rfc == rfc)
    )
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return {
        "id": cliente.id,
        "rfc": cliente.rfc,
        "razon_social": cliente.razon_social,
        "regimen_fiscal": cliente.regimen_fiscal.value if cliente.regimen_fiscal else None,
        "estatus": cliente.estatus.value if cliente.estatus else None,
    }


@router.post("/webhook", response_model=dict)
async def recibir_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verificar_api_key),
):
    """Recibe un callback/webhook externo."""
    # Procesar webhook (log, almacenar, etc.)
    return {
        "status": "received",
        "detail": "Webhook procesado correctamente",
    }
