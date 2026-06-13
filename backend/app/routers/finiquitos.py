"""Balance OS — Router de Finiquitos/Liquidaciones"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Finiquito, Empleado, TipoFiniquito
from app.schemas.finiquito import (
    FiniquitoCalcularRequest, FiniquitoResponse, FiniquitoPreview,
)
from app.finiquitos.calculo import (
    calcular_finiquito, calcular_dias_vacaciones_pendientes,
)
from app.routers.auth import verificar_token

router = APIRouter(prefix="/finiquitos", tags=["finiquitos"])


async def get_usuario(token: dict = Depends(verificar_token)) -> dict:
    return token


@router.post("/preview", response_model=FiniquitoPreview)
async def preview_finiquito(
    data: FiniquitoCalcularRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    """Calcula finiquito sin guardar (preview)."""
    emp = await db.execute(select(Empleado).where(Empleado.id == data.empleado_id))
    emp = emp.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if not emp.fecha_ingreso:
        raise HTTPException(status_code=400, detail="Empleado sin fecha de ingreso registrada")

    resultado = calcular_finiquito(
        salario_diario=emp.salario_diario,
        fecha_ingreso=emp.fecha_ingreso,
        fecha_baja=data.fecha_baja,
        tipo=data.tipo,
        dias_vacaciones_pend=data.dias_vacaciones_pendientes or 0,
        otros_pagos=data.otros_pagos or 0,
    )

    return FiniquitoPreview(**resultado)


@router.post("/calcular", response_model=FiniquitoResponse, status_code=201)
async def calcular_y_guardar(
    data: FiniquitoCalcularRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    """Calcula finiquito y lo guarda en DB."""
    emp = await db.execute(select(Empleado).where(Empleado.id == data.empleado_id))
    emp = emp.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    if not emp.fecha_ingreso:
        raise HTTPException(status_code=400, detail="Empleado sin fecha de ingreso registrada")

    resultado = calcular_finiquito(
        salario_diario=emp.salario_diario,
        fecha_ingreso=emp.fecha_ingreso,
        fecha_baja=data.fecha_baja,
        tipo=data.tipo,
        dias_vacaciones_pend=data.dias_vacaciones_pendientes or 0,
        otros_pagos=data.otros_pagos or 0,
    )

    finiquito = Finiquito(
        empleado_id=data.empleado_id,
        fecha_baja=data.fecha_baja,
        tipo=data.tipo,
        causa=data.causa or "",
        anios_servicio=resultado["anios_servicio"],
        salario_diario=resultado["salario_diario"],
        indemnizacion_3meses=resultado["indemnizacion_3meses"],
        indemnizacion_20dias_x_anio=resultado["indemnizacion_20dias_x_anio"],
        prima_antiguedad=resultado["prima_antiguedad"],
        vacaciones_pendientes=resultado["vacaciones_pendientes"],
        prima_vacacional=resultado["prima_vacacional"],
        aguinaldo_proporcional=resultado["aguinaldo_proporcional"],
        otras_percepciones=resultado["otras_percepciones"],
        total_percepciones=resultado["total_percepciones"],
        isr=resultado["isr"],
        isr_exento=resultado["isr_exento"],
        otras_deducciones=resultado["otras_deducciones"],
        total_deducciones=resultado["total_deducciones"],
        neto=resultado["neto"],
    )
    db.add(finiquito)
    await db.commit()
    await db.refresh(finiquito)
    return finiquito


@router.get("/", response_model=List[FiniquitoResponse])
async def listar_finiquitos(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(Finiquito).order_by(Finiquito.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{finiquito_id}", response_model=FiniquitoResponse)
async def obtener_finiquito(
    finiquito_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(select(Finiquito).where(Finiquito.id == finiquito_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Finiquito no encontrado")
    return f


@router.get("/empleado/{empleado_id}", response_model=List[FiniquitoResponse])
async def finiquitos_por_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(Finiquito)
        .where(Finiquito.empleado_id == empleado_id)
        .order_by(Finiquito.created_at.desc())
    )
    return result.scalars().all()
