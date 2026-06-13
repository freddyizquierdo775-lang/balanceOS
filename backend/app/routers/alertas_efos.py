"""
Balance OS — Router de Alertas EFOS (Listas negras SAT)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import ListaEfos, AlertaEfos, Cliente
from app.schemas.tesoreria import ListaEfosCreate, AlertaEfosResponse, VerificacionEfosResponse
from app.routers.auth import verificar_token

router = APIRouter(prefix="/alertas-efos", tags=["alertas-efos"])


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Listas Negras ─────────────────────────────────


@router.post("/listas", response_model=dict, status_code=status.HTTP_201_CREATED)
async def subir_rfc_lista(
    data: ListaEfosCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Agrega un RFC a una lista negra (69, 69-B, definitivos, sentencias)."""
    fecha_pub = None
    if data.fecha_publicacion:
        try:
            fecha_pub = datetime.strptime(data.fecha_publicacion, "%Y-%m-%d")
        except ValueError:
            pass

    entrada = ListaEfos(
        rfc=data.rfc,
        tipo_lista=data.tipo_lista,
        fecha_publicacion=fecha_pub,
    )
    db.add(entrada)
    await db.commit()
    return {"detail": "RFC agregado a lista negra", "id": entrada.id}


@router.get("/listas", response_model=List[dict])
async def listar_listas_efos(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista los RFCs en listas negras."""
    result = await db.execute(
        select(ListaEfos).where(ListaEfos.activo == True).order_by(ListaEfos.created_at.desc())
    )
    items = result.scalars().all()
    return [
        {
            "id": i.id,
            "rfc": i.rfc,
            "tipo_lista": i.tipo_lista,
            "fecha_publicacion": i.fecha_publicacion.isoformat() if i.fecha_publicacion else None,
            "fecha_consulta": i.fecha_consulta.isoformat(),
        }
        for i in items
    ]


# ─── Verificación ──────────────────────────────────


@router.post("/verificar/{cliente_id}", response_model=VerificacionEfosResponse)
async def verificar_cliente_en_listas(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Verifica si el RFC de un cliente está en las listas negras y genera alerta."""
    # Obtener cliente
    cli_result = await db.execute(
        select(Cliente).where(Cliente.id == cliente_id)
    )
    cliente = cli_result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    # Buscar en listas
    lista_result = await db.execute(
        select(ListaEfos)
        .where(ListaEfos.rfc == cliente.rfc)
        .where(ListaEfos.activo == True)
    )
    entrada = lista_result.scalar_one_or_none()

    en_lista = entrada is not None
    tipo_lista = entrada.tipo_lista if entrada else None

    # Verificar si ya existe alerta para este cliente
    alerta_result = await db.execute(
        select(AlertaEfos)
        .where(AlertaEfos.cliente_id == cliente_id)
        .where(AlertaEfos.rfc == cliente.rfc)
        .where(AlertaEfos.resuelto == False)
    )
    alerta_existente = alerta_result.scalar_one_or_none() is not None

    # Generar alerta si no existe
    if en_lista and not alerta_existente:
        alerta = AlertaEfos(
            cliente_id=cliente_id,
            lista_id=entrada.id,
            rfc=cliente.rfc,
            tipo_lista=tipo_lista,
        )
        db.add(alerta)
        await db.commit()

    return VerificacionEfosResponse(
        rfc=cliente.rfc,
        cliente=cliente.razon_social,
        en_lista=en_lista,
        tipo_lista=tipo_lista,
        alerta_existente=alerta_existente or en_lista,
    )


async def _check_rfc_in_listas(rfc: str, db: AsyncSession):
    """Busca un RFC en las listas EFOS activas. Devuelve la ListaEfos si existe."""
    result = await db.execute(
        select(ListaEfos)
        .where(ListaEfos.rfc == rfc)
        .where(ListaEfos.activo == True)
    )
    return result.scalar_one_or_none()


@router.post("/verificar/todos", response_model=List[dict])
async def verificar_todos_los_clientes(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(verificar_token),
):
    """Verifica TODOS los clientes activos contra las listas EFOS."""
    result = await db.execute(select(Cliente).where(Cliente.activo == 1))
    clientes = result.scalars().all()

    resultados = []
    for c in clientes:
        en_lista = await _check_rfc_in_listas(c.rfc, db)
        resultados.append({
            "rfc": c.rfc,
            "cliente": c.razon_social,
            "en_lista": en_lista is not None,
            "tipo_lista": en_lista.tipo_lista if en_lista else None,
        })
    return resultados


# ─── Alertas ───────────────────────────────────────


@router.get("/alertas", response_model=List[AlertaEfosResponse])
async def listar_alertas_efos(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista las alertas EFOS generadas."""
    result = await db.execute(
        select(AlertaEfos).order_by(AlertaEfos.fecha_alerta.desc())
    )
    return result.scalars().all()


@router.put("/alertas/{alerta_id}/resolver", response_model=dict)
async def resolver_alerta(
    alerta_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Marca una alerta EFOS como resuelta."""
    result = await db.execute(
        select(AlertaEfos).where(AlertaEfos.id == alerta_id)
    )
    alerta = result.scalar_one_or_none()
    if not alerta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada")

    alerta.resuelto = True
    alerta.fecha_resolucion = datetime.utcnow()
    await db.commit()
    return {"detail": "Alerta resuelta correctamente"}
