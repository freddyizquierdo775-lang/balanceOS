"""Balance OS — Router de Nómina (Períodos + Recibos + Cálculo)"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import PeriodoNomina, Recibo, Empleado
from app.schemas.nomina import PeriodoCreate, PeriodoResponse, PeriodoDetalleResponse, ReciboResponse
from app.routers.auth import verificar_token
from app.nomina.calculo import procesar_periodo

router = APIRouter(prefix="/nomina", tags=["nomina"])


async def get_usuario(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Períodos ─────────────────────────────────────

@router.post("/periodos", response_model=PeriodoResponse, status_code=201)
async def crear_periodo(
    data: PeriodoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    periodo = PeriodoNomina(
        nombre=data.nombre,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        tipo=data.tipo,
    )
    db.add(periodo)
    await db.commit()
    await db.refresh(periodo)
    return periodo


@router.get("/periodos", response_model=List[PeriodoDetalleResponse])
async def listar_periodos(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(PeriodoNomina)
        .options(selectinload(PeriodoNomina.recibos))
        .order_by(PeriodoNomina.fecha_inicio.desc())
    )
    return result.scalars().all()


@router.get("/periodos/{periodo_id}", response_model=PeriodoDetalleResponse)
async def obtener_periodo(
    periodo_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(PeriodoNomina)
        .options(selectinload(PeriodoNomina.recibos))
        .where(PeriodoNomina.id == periodo_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Período no encontrado")
    return p


@router.post("/periodos/{periodo_id}/calcular", response_model=PeriodoDetalleResponse)
async def calcular_periodo(
    periodo_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    """Ejecuta el cálculo de nómina para un período: crea recibos para todos los empleados activos."""
    result = await db.execute(
        select(PeriodoNomina).where(PeriodoNomina.id == periodo_id)
    )
    periodo = result.scalar_one_or_none()
    if not periodo:
        raise HTTPException(status_code=404, detail="Período no encontrado")

    # Obtener empleados activos
    result = await db.execute(
        select(Empleado).where(Empleado.activo == True)
    )
    empleados = result.scalars().all()

    if not empleados:
        raise HTTPException(status_code=400, detail="No hay empleados activos para calcular")

    # Ejecutar cálculo
    recibos = await procesar_periodo(periodo, empleados, db)

    # Devolver período con recibos cargados
    result = await db.execute(
        select(PeriodoNomina)
        .options(selectinload(PeriodoNomina.recibos))
        .where(PeriodoNomina.id == periodo_id)
    )
    return result.scalar_one()


# ─── Recibos ───────────────────────────────────────

@router.get("/recibos", response_model=List[ReciboResponse])
async def listar_recibos(
    periodo_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    query = select(Recibo).order_by(Recibo.id)
    if periodo_id:
        query = query.where(Recibo.periodo_id == periodo_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/recibos/{recibo_id}", response_model=ReciboResponse)
async def obtener_recibo(
    recibo_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(select(Recibo).where(Recibo.id == recibo_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recibo no encontrado")
    return r
