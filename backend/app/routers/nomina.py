"""Balance OS — Router de Nómina (Períodos + Recibos + Cálculo)"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import PeriodoNomina, Recibo, Empleado, CfdiRecibo
from app.schemas.nomina import PeriodoCreate, PeriodoResponse, PeriodoDetalleResponse, ReciboResponse
from app.routers.auth import verificar_token
from app.dependencies import get_despacho_id
from app.nomina.calculo import procesar_periodo
from app.pdf.nomina import generar_pdf_nomina

router = APIRouter(prefix="/nomina", tags=["nomina"])


async def get_usuario(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Períodos ─────────────────────────────────────

@router.post("/periodos", response_model=PeriodoResponse, status_code=201)
async def crear_periodo(
    data: PeriodoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
    despacho_id: int = Depends(get_despacho_id),
):
    periodo = PeriodoNomina(
        nombre=data.nombre,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        tipo=data.tipo,
        despacho_id=despacho_id,
    )
    db.add(periodo)
    await db.commit()
    await db.refresh(periodo)
    return periodo


@router.get("/periodos", response_model=List[PeriodoDetalleResponse])
async def listar_periodos(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
    despacho_id: int = Depends(get_despacho_id),
):
    result = await db.execute(
        select(PeriodoNomina)
        .options(selectinload(PeriodoNomina.recibos))
        .where(PeriodoNomina.despacho_id == despacho_id)
        .order_by(PeriodoNomina.fecha_inicio.desc())
    )
    return result.scalars().all()


@router.get("/periodos/{periodo_id}", response_model=PeriodoDetalleResponse)
async def obtener_periodo(
    periodo_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
    despacho_id: int = Depends(get_despacho_id),
):
    result = await db.execute(
        select(PeriodoNomina)
        .options(selectinload(PeriodoNomina.recibos))
        .where(PeriodoNomina.id == periodo_id, PeriodoNomina.despacho_id == despacho_id)
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
    despacho_id: int = Depends(get_despacho_id),
):
    """Ejecuta el cálculo de nómina para un período: crea recibos para todos los empleados activos."""
    result = await db.execute(
        select(PeriodoNomina).where(PeriodoNomina.id == periodo_id, PeriodoNomina.despacho_id == despacho_id)
    )
    periodo = result.scalar_one_or_none()
    if not periodo:
        raise HTTPException(status_code=404, detail="Período no encontrado")

    # Obtener empleados activos del mismo despacho
    result = await db.execute(
        select(Empleado).where(Empleado.activo == True, Empleado.despacho_id == despacho_id)
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
    despacho_id: int = Depends(get_despacho_id),
):
    query = select(Recibo).where(Recibo.despacho_id == despacho_id).order_by(Recibo.id)
    if periodo_id:
        query = query.where(Recibo.periodo_id == periodo_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/recibos/{recibo_id}", response_model=ReciboResponse)
async def obtener_recibo(
    recibo_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
    despacho_id: int = Depends(get_despacho_id),
):
    result = await db.execute(
        select(Recibo).where(Recibo.id == recibo_id, Recibo.despacho_id == despacho_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recibo no encontrado")
    return r


# ─── PDF ───────────────────────────────────────────

@router.get("/recibos/{recibo_id}/pdf")
async def descargar_pdf_nomina(
    recibo_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
    despacho_id: int = Depends(get_despacho_id),
):
    """Descarga el recibo de nómina en PDF."""
    # Cargar recibo con relaciones
    result = await db.execute(
        select(Recibo)
        .options(selectinload(Recibo.periodo), selectinload(Recibo.empleado))
        .where(Recibo.id == recibo_id, Recibo.despacho_id == despacho_id)
    )
    recibo = result.scalar_one_or_none()
    if not recibo:
        raise HTTPException(status_code=404, detail="Recibo no encontrado")

    # Buscar CFDI asociado (opcional)
    cfdi_result = await db.execute(
        select(CfdiRecibo).where(CfdiRecibo.recibo_id == recibo_id, CfdiRecibo.despacho_id == despacho_id)
    )
    cfdi = cfdi_result.scalar_one_or_none()

    pdf_bytes = generar_pdf_nomina(recibo, recibo.empleado, cfdi, recibo.periodo)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                f"attachment; filename=recibo_nomina_{recibo_id}.pdf"
        },
    )
