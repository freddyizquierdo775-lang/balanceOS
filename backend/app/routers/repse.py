"""Balance OS — Router de REPSE (Registro, Personal, Avisos Trimestrales)"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from app.database import get_db
from app.models import (
    RepseRegistro, RepsePersonal, RepseAviso,
    EstatusRepse, TipoPersonalRepse, Cliente,
)
from app.schemas.repse import (
    RepseRegistroCreate, RepseRegistroUpdate, RepseRegistroResponse,
    RepsePersonalCreate, RepsePersonalUpdate, RepsePersonalOut,
    RepseAvisoCreate, RepseAvisoOut,
    RepseStats,
)
from app.routers.auth import verificar_token
from app.dependencies import get_despacho_id

router = APIRouter(prefix="/repse", tags=["repse"])


async def get_usuario(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Registros REPSE ──────────────────────────────


@router.post("/registros", response_model=RepseRegistroResponse, status_code=201)
async def crear_registro(
    data: RepseRegistroCreate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    # Validar cliente existe
    cliente = await db.execute(select(Cliente).where(Cliente.id == data.cliente_id))
    if not cliente.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Validar número único
    existente = await db.execute(
        select(RepseRegistro).where(RepseRegistro.numero_registro == data.numero_registro)
    )
    if existente.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Número de registro REPSE ya existe")

    registro = RepseRegistro(**data.model_dump())
    db.add(registro)
    await db.commit()
    await db.refresh(registro)

    # Actualizar cliente
    cliente_obj = (await db.execute(select(Cliente).where(Cliente.id == data.cliente_id))).scalar_one()
    cliente_obj.tiene_repse = True
    cliente_obj.repse_vencimiento = data.fecha_vencimiento
    await db.commit()

    return await _cargar_completo(registro.id, db)


@router.get("/registros", response_model=List[RepseRegistroResponse])
async def listar_registros(
    cliente_id: Optional[int] = None,
    estatus: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    query = select(RepseRegistro).options(
        selectinload(RepseRegistro.personal),
        selectinload(RepseRegistro.avisos),
    )
    if cliente_id:
        query = query.where(RepseRegistro.cliente_id == cliente_id)
    if estatus:
        query = query.where(RepseRegistro.estatus == estatus)
    query = query.order_by(RepseRegistro.fecha_vencimiento)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/registros/{registro_id}", response_model=RepseRegistroResponse)
async def obtener_registro(
    registro_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    return await _cargar_completo(registro_id, db)


@router.put("/registros/{registro_id}", response_model=RepseRegistroResponse)
async def actualizar_registro(
    registro_id: int,
    data: RepseRegistroUpdate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(select(RepseRegistro).where(RepseRegistro.id == registro_id))
    registro = result.scalar_one_or_none()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro REPSE no encontrado")

    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(registro, campo, valor)

    await db.commit()
    return await _cargar_completo(registro_id, db)


@router.delete("/registros/{registro_id}", status_code=204)
async def eliminar_registro(
    registro_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(RepseRegistro).where(RepseRegistro.id == registro_id)
    )
    registro = result.scalar_one_or_none()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro REPSE no encontrado")
    await db.delete(registro)
    await db.commit()


# ─── Personal REPSE ────────────────────────────────


@router.post("/personal", response_model=RepsePersonalOut, status_code=201)
async def asignar_personal(
    data: RepsePersonalCreate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    asignacion = RepsePersonal(**data.model_dump())
    db.add(asignacion)
    await db.commit()
    await db.refresh(asignacion)
    return await _personal_con_nombre(asignacion.id, db)


@router.get("/personal/{registro_id}", response_model=List[RepsePersonalOut])
async def listar_personal(
    registro_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(RepsePersonal)
        .where(RepsePersonal.registro_id == registro_id)
        .order_by(RepsePersonal.tipo, RepsePersonal.id)
    )
    items = result.scalars().all()
    resultado = []
    for item in items:
        emp = await db.execute(
            select(RepsePersonal.empleado).select_from(select(RepsePersonal).where(RepsePersonal.id == item.id).subquery())
        )
        # Simpler: just get empleado by id
        from app.models import Empleado
        emp_result = await db.execute(select(Empleado).where(Empleado.id == item.empleado_id))
        emp = emp_result.scalar_one_or_none()
        out = RepsePersonalOut.model_validate(item)
        if emp:
            out.empleado_nombre = f"{emp.nombre} {emp.apellidos}"
        resultado.append(out)
    return resultado


@router.put("/personal/{personal_id}", response_model=RepsePersonalOut)
async def actualizar_personal(
    personal_id: int,
    data: RepsePersonalUpdate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(select(RepsePersonal).where(RepsePersonal.id == personal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)
    await db.commit()
    await db.refresh(item)
    return await _personal_con_nombre(item.id, db)


# ─── Avisos REPSE ──────────────────────────────────


@router.post("/avisos", response_model=RepseAvisoOut, status_code=201)
async def crear_aviso(
    data: RepseAvisoCreate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    # Calcular porcentaje de personal especializado
    total = data.total_personal
    pct_especializado = Decimal("0")
    if total > 0:
        pct_especializado = (Decimal(data.operativos) / Decimal(total) * Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    aviso = RepseAviso(
        **data.model_dump(),
        porcentaje_especializado=pct_especializado,
    )
    db.add(aviso)
    await db.commit()
    await db.refresh(aviso)
    return aviso


@router.get("/avisos/{registro_id}", response_model=List[RepseAvisoOut])
async def listar_avisos(
    registro_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(RepseAviso)
        .where(RepseAviso.registro_id == registro_id)
        .order_by(RepseAviso.periodo.desc())
    )
    return result.scalars().all()


# ─── Stats ─────────────────────────────────────────


@router.get("/stats", response_model=RepseStats)
async def obtener_stats(
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    total = await db.execute(select(func.count(RepseRegistro.id)))
    activos = await db.execute(
        select(func.count(RepseRegistro.id)).where(RepseRegistro.estatus == EstatusRepse.ACTIVO)
    )
    vencidos = await db.execute(
        select(func.count(RepseRegistro.id)).where(RepseRegistro.estatus == EstatusRepse.VENCIDO)
    )
    ahora = datetime.utcnow()
    en_30d = ahora + timedelta(days=30)
    por_vencer = await db.execute(
        select(func.count(RepseRegistro.id)).where(
            and_(
                RepseRegistro.estatus == EstatusRepse.ACTIVO,
                RepseRegistro.fecha_vencimiento <= en_30d,
            )
        )
    )
    avisos_pend = await db.execute(
        select(func.count(RepseAviso.id)).where(RepseAviso.presentado == False)
    )

    return RepseStats(
        total_registros=total.scalar(),
        activos=activos.scalar(),
        vencidos=vencidos.scalar(),
        por_vencer_30d=por_vencer.scalar(),
        avisos_pendientes=avisos_pend.scalar(),
    )


# ─── Helpers ───────────────────────────────────────


async def _cargar_completo(registro_id: int, db: AsyncSession) -> RepseRegistroResponse:
    result = await db.execute(
        select(RepseRegistro)
        .options(
            selectinload(RepseRegistro.personal),
            selectinload(RepseRegistro.avisos),
        )
        .where(RepseRegistro.id == registro_id)
    )
    registro = result.scalar_one_or_none()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro REPSE no encontrado")
    return registro


async def _personal_con_nombre(personal_id: int, db: AsyncSession) -> RepsePersonalOut:
    result = await db.execute(select(RepsePersonal).where(RepsePersonal.id == personal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    from app.models import Empleado
    emp = (await db.execute(select(Empleado).where(Empleado.id == item.empleado_id))).scalar_one_or_none()
    out = RepsePersonalOut.model_validate(item)
    if emp:
        out.empleado_nombre = f"{emp.nombre} {emp.apellidos}"
    return out
