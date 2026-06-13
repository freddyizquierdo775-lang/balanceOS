"""Balance OS — Router de Empleados"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional

from app.database import get_db
from app.models import Empleado, TipoContrato, TipoJornada, EstatusEmpleado
from app.schemas.empleado import EmpleadoCreate, EmpleadoUpdate, EmpleadoResponse
from app.routers.auth import verificar_token

router = APIRouter(prefix="/empleados", tags=["empleados"])


async def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


@router.get("/", response_model=List[EmpleadoResponse])
async def listar_empleados(
    q: Optional[str] = Query(None, description="Busqueda por RFC, nombre, apellidos o CURP"),
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    query = select(Empleado)

    if q:
        search = f"%{q}%"
        query = query.where(
            or_(
                Empleado.rfc.ilike(search),
                Empleado.nombre.ilike(search),
                Empleado.apellidos.ilike(search),
                Empleado.curp.ilike(search),
            )
        )

    if activo is not None:
        query = query.where(Empleado.activo == activo)

    query = query.order_by(Empleado.apellidos, Empleado.nombre)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{empleado_id}", response_model=EmpleadoResponse)
async def obtener_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    result = await db.execute(select(Empleado).where(Empleado.id == empleado_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


@router.post("/", response_model=EmpleadoResponse, status_code=201)
async def crear_empleado(
    data: EmpleadoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    # Validar RFC duplicado
    existente = await db.execute(select(Empleado).where(Empleado.rfc == data.rfc))
    if existente.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Ya existe un empleado con RFC {data.rfc}")

    # Validar tipo_contrato
    valores_contrato = {e.value for e in TipoContrato}
    if data.tipo_contrato not in valores_contrato:
        raise HTTPException(status_code=400, detail=f"Tipo contrato invalido. Opciones: {', '.join(valores_contrato)}")

    # Validar tipo_jornada
    valores_jornada = {e.value for e in TipoJornada}
    if data.tipo_jornada not in valores_jornada:
        raise HTTPException(status_code=400, detail=f"Tipo jornada invalido. Opciones: {', '.join(valores_jornada)}")

    emp = Empleado(**data.model_dump())
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.put("/{empleado_id}", response_model=EmpleadoResponse)
async def actualizar_empleado(
    empleado_id: int,
    data: EmpleadoUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    result = await db.execute(select(Empleado).where(Empleado.id == empleado_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(emp, campo, valor)

    await db.commit()
    await db.refresh(emp)
    return emp


@router.delete("/{empleado_id}", status_code=204)
async def eliminar_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    result = await db.execute(select(Empleado).where(Empleado.id == empleado_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Soft delete: marcar como inactivo
    emp.activo = False
    emp.estatus = "baja"
    await db.commit()
