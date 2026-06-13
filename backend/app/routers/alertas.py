"""
Balance OS — Router de Alertas (vencimientos FIEL, REPSE, PLD)
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import Cliente
from app.routers.auth import verificar_token

router = APIRouter(prefix="/alertas", tags=["alertas"])


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


def build_alerta(tipo: str, label: str, cliente, vencimiento) -> dict:
    dias_restantes = (vencimiento.date() - datetime.utcnow().date()).days
    return {
        "tipo": tipo,
        "label": label,
        "cliente_id": cliente.id,
        "cliente": cliente.razon_social,
        "rfc": cliente.rfc,
        "vencimiento": vencimiento.isoformat(),
        "dias_restantes": dias_restantes,
    }


@router.get("/")
async def obtener_alertas(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Retorna vencimientos agrupados: vencidos, próximos 30, 60 y 90 días."""
    hoy = datetime.utcnow()
    en_30 = hoy + timedelta(days=30)
    en_60 = hoy + timedelta(days=60)
    en_90 = hoy + timedelta(days=90)

    # Query base
    query = select(Cliente)

    # Filtro por permisos
    if usuario.get("rol") != "admin":
        query = query.where(Cliente.asesor_id == usuario["id"])

    result = await db.execute(query)
    clientes = result.scalars().all()

    vencidos = []
    proximos_30 = []
    proximos_60 = []
    proximos_90 = []

    TIPOS = [
        ("fiel", "FIEL", lambda c: c.fiel_vencimiento),
        ("repse", "REPSE", lambda c: c.repse_vencimiento),
        ("pld", "PLD", lambda c: c.pld_vencimiento),
    ]

    for c in clientes:
        for tipo, label, getter in TIPOS:
            venc = getter(c)
            if not venc:
                continue
            # Normalizar a datetime si es date
            if hasattr(venc, 'date'):
                venc_dt = venc
            else:
                venc_dt = datetime.combine(venc, datetime.min.time())

            alerta = build_alerta(tipo, label, c, venc_dt)

            if venc_dt < hoy:
                vencidos.append(alerta)
            elif venc_dt <= en_30:
                proximos_30.append(alerta)
            elif venc_dt <= en_60:
                proximos_60.append(alerta)
            elif venc_dt <= en_90:
                proximos_90.append(alerta)

    # Ordenar cada grupo por fecha más próxima
    for grupo in [vencidos, proximos_30, proximos_60, proximos_90]:
        grupo.sort(key=lambda a: a["dias_restantes"])

    return {
        "vencidos": vencidos,
        "proximos_30": proximos_30,
        "proximos_60": proximos_60,
        "proximos_90": proximos_90,
        "total_alertas": len(vencidos) + len(proximos_30) + len(proximos_60) + len(proximos_90),
    }
