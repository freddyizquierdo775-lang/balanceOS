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
            "created_at": i.created_at.isoformat(),
        }
        for i in items
    ]


# ─── Actualización desde SAT ─────────────────────

@router.post("/actualizar", response_model=dict)
async def actualizar_desde_sat(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """
    ACTUALIZA las listas EFOS desde el portal del SAT.
    
    Descarga las listas 69, 69-B, definitivos y sentencias
    y las inserta/actualiza en la base de datos.
    """
    from app.services.efos_scraper import actualizar_listas_efos
    from app.database import async_session
    
    result = await actualizar_listas_efos(async_session)
    
    return {
        "exitoso": result.exitoso,
        "total_rfcs": result.total_rfcs,
        "nuevos": result.nuevos,
        "actualizados": result.actualizados,
        "errores": result.errores,
        "fuente": result.fuente,
        "mensaje": result.mensaje,
    }


@router.post("/carga-csv", response_model=dict)
async def cargar_csv_lista(
    tipo_lista: str = Query(..., description="69, 69-B, definitivos, sentencias"),
    contenido: str = Query(..., description="Contenido CSV con RFCs"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """
    Carga masiva de RFCs desde un CSV.
    
    El CSV debe tener los RFCs en la primera columna.
    """
    if tipo_lista not in ("69", "69-B", "definitivos", "sentencias"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de lista inválido. Use: 69, 69-B, definitivos, sentencias"
        )
    
    from app.services.efos_scraper import cargar_desde_csv
    from app.database import async_session
    
    result = await cargar_desde_csv(contenido, tipo_lista, async_session)
    
    return {
        "exitoso": result.exitoso,
        "total_rfcs": result.total_rfcs,
        "nuevos": result.nuevos,
        "actualizados": result.actualizados,
        "errores": result.errores,
        "mensaje": result.mensaje,
    }


# ─── Seed ──────────────────────────────────────────


@router.post("/seed", response_model=dict)
async def seed_listas_efos(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Siembra datos de prueba en la tabla listas_efos (RFCs 69-B del SAT)."""
    from sqlalchemy import func, select as sa_select

    # Solo sembrar si la tabla está vacía
    count_result = await db.execute(sa_select(func.count()).select_from(ListaEfos))
    count = count_result.scalar()
    if count > 0:
        return {"detail": f"La tabla ya tiene {count} registros. Seed omitido."}

    rfcs_prueba = [
        ("ABC010101XXX", "69-B", datetime(2025, 1, 15)),
        ("XYZ020202XXX", "69-B", datetime(2025, 3, 20)),
        ("DEF030303XXX", "69", datetime(2025, 6, 10)),
        ("GHI040404XXX", "definitivos", datetime(2025, 9, 1)),
        ("JKL050505XXX", "sentencias", datetime(2025, 11, 15)),
        ("MNO060606XXX", "69-B", datetime(2025, 2, 10)),
        ("PQR070707XXX", "69-B", datetime(2025, 4, 5)),
        ("STU080808XXX", "69", datetime(2025, 7, 22)),
        ("VWX090909XXX", "definitivos", datetime(2025, 10, 30)),
        ("YZA101010XXX", "sentencias", datetime(2025, 12, 1)),
        ("BCD111111XXX", "69-B", datetime(2025, 8, 14)),
        ("EFG121212XXX", "69", datetime(2025, 5, 18)),
        ("HIJ131313XXX", "69-B", datetime(2025, 6, 25)),
        ("KLM141414XXX", "definitivos", datetime(2025, 11, 8)),
        ("NOP151515XXX", "sentencias", datetime(2025, 3, 2)),
    ]

    for rfc, tipo, fecha_pub in rfcs_prueba:
        entrada = ListaEfos(
            rfc=rfc,
            tipo_lista=tipo,
            fecha_publicacion=fecha_pub,
        )
        db.add(entrada)

    await db.commit()
    return {"detail": f"Seed completado: {len(rfcs_prueba)} RFCs insertados en listas_efos."}


# ─── Helpers ────────────────────────────────────────


async def _check_rfc_in_listas(rfc: str, db: AsyncSession):
    """Busca un RFC en las listas EFOS activas. Devuelve la ListaEfos si existe."""
    result = await db.execute(
        select(ListaEfos)
        .where(ListaEfos.rfc == rfc)
        .where(ListaEfos.activo == True)
    )
    return result.scalar_one_or_none()


# ─── Verificación ──────────────────────────────────
# IMPORTANTE: /verificar/todos DEBE ir antes de /verificar/{cliente_id}
# para que FastAPI no haga match con el parámetro de ruta.


@router.post("/verificar/todos", response_model=dict)
async def verificar_todos_los_clientes(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Verifica TODOS los clientes activos contra las listas EFOS."""
    result = await db.execute(select(Cliente).where(Cliente.activo == 1))
    clientes = result.scalars().all()

    resultados = []
    encontrados = 0
    for c in clientes:
        en_lista = await _check_rfc_in_listas(c.rfc, db)
        esta_en_lista = en_lista is not None
        if esta_en_lista:
            encontrados += 1
        resultados.append({
            "rfc": c.rfc,
            "cliente": c.razon_social,
            "en_lista": esta_en_lista,
            "tipo_lista": en_lista.tipo_lista if en_lista else None,
        })

    total = len(clientes)
    return {
        "total": total,
        "verificados": total,
        "en_lista": encontrados,
        "limpios": total - encontrados,
        "resultados": resultados,
    }


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
