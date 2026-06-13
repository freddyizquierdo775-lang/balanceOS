"""
Balance OS — Router de Tesorería
"""
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.database import get_db
from app.models import CuentaBancaria, MovimientoBancario, ConciliacionBancaria
from app.schemas.tesoreria import (
    CuentaBancariaCreate, CuentaBancariaResponse,
    MovimientoCreate, MovimientoResponse,
    ConciliacionRequest, ConciliacionResponse, EstadoCuentaResponse,
)
from app.routers.auth import verificar_token

router = APIRouter(prefix="/tesoreria", tags=["tesoreria"])


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Cuentas Bancarias ─────────────────────────────


@router.post("/cuentas", response_model=CuentaBancariaResponse, status_code=status.HTTP_201_CREATED)
async def crear_cuenta_bancaria(
    data: CuentaBancariaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Crea una nueva cuenta bancaria."""
    cuenta = CuentaBancaria(
        cliente_id=data.cliente_id,
        banco=data.banco,
        numero_cuenta=data.numero_cuenta,
        clabe=data.clabe,
        tipo=data.tipo,
        saldo_inicial=data.saldo_inicial,
        saldo_actual=data.saldo_inicial,
    )
    db.add(cuenta)
    await db.commit()
    await db.refresh(cuenta)
    return cuenta


@router.get("/cuentas", response_model=List[CuentaBancariaResponse])
async def listar_cuentas_bancarias(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista las cuentas bancarias."""
    result = await db.execute(
        select(CuentaBancaria).where(CuentaBancaria.activo == True)
    )
    return result.scalars().all()


# ─── Movimientos ───────────────────────────────────


@router.post("/movimientos", response_model=MovimientoResponse, status_code=status.HTTP_201_CREATED)
async def registrar_movimiento(
    data: MovimientoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Registra un movimiento bancario y actualiza el saldo de la cuenta."""
    # Validar cuenta
    cuenta_result = await db.execute(
        select(CuentaBancaria).where(CuentaBancaria.id == data.cuenta_id)
    )
    cuenta = cuenta_result.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta bancaria no encontrada")

    fecha = datetime.strptime(data.fecha, "%Y-%m-%d")
    monto = data.monto

    movimiento = MovimientoBancario(
        cuenta_id=data.cuenta_id,
        fecha=fecha,
        tipo=data.tipo,
        concepto=data.concepto,
        monto=monto,
        referencia=data.referencia,
    )
    db.add(movimiento)

    # Actualizar saldo actual
    if data.tipo == "abono":
        cuenta.saldo_actual += monto
    else:  # cargo
        cuenta.saldo_actual -= monto

    await db.commit()
    await db.refresh(movimiento)
    return movimiento


@router.get("/movimientos", response_model=List[MovimientoResponse])
async def listar_movimientos(
    cuenta_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista movimientos bancarios, opcionalmente filtrados por cuenta."""
    query = select(MovimientoBancario)
    if cuenta_id:
        query = query.where(MovimientoBancario.cuenta_id == cuenta_id)
    query = query.order_by(MovimientoBancario.fecha.desc())
    result = await db.execute(query)
    return result.scalars().all()


# ─── Conciliación ──────────────────────────────────


@router.post("/conciliar", response_model=ConciliacionResponse)
async def conciliar_cuenta(
    data: ConciliacionRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Realiza la conciliación bancaria de una cuenta para un período."""
    cuenta_result = await db.execute(
        select(CuentaBancaria).where(CuentaBancaria.id == data.cuenta_id)
    )
    cuenta = cuenta_result.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta bancaria no encontrada")

    saldo_sistema = cuenta.saldo_actual
    diferencia = data.saldo_estado_cuenta - saldo_sistema

    conciliacion = ConciliacionBancaria(
        cuenta_id=data.cuenta_id,
        periodo_mes=data.periodo_mes,
        periodo_anio=data.periodo_anio,
        saldo_estado_cuenta=data.saldo_estado_cuenta,
        saldo_sistema=saldo_sistema,
        diferencia=diferencia,
        conciliado=diferencia == Decimal("0.00"),
        fecha_conciliacion=datetime.utcnow() if diferencia == Decimal("0.00") else None,
        notas=data.notas,
    )
    db.add(conciliacion)

    # Marcar movimientos como conciliados si la diferencia es cero
    if diferencia == Decimal("0.00"):
        mov_result = await db.execute(
            select(MovimientoBancario).where(MovimientoBancario.cuenta_id == data.cuenta_id)
        )
        movs = mov_result.scalars().all()
        for m in movs:
            m.conciliado = True
            m.fecha_conciliacion = datetime.utcnow()

    await db.commit()
    await db.refresh(conciliacion)
    return conciliacion


# ─── Estado de Cuenta ──────────────────────────────


@router.get("/estado-cuenta/{cuenta_id}", response_model=EstadoCuentaResponse)
async def estado_cuenta(
    cuenta_id: int,
    mes: int = Query(...),
    anio: int = Query(...),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Obtiene el estado de cuenta con movimientos y saldos del período."""
    cuenta_result = await db.execute(
        select(CuentaBancaria).where(CuentaBancaria.id == cuenta_id)
    )
    cuenta = cuenta_result.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta bancaria no encontrada")

    # Movimientos del período
    mov_result = await db.execute(
        select(MovimientoBancario)
        .where(MovimientoBancario.cuenta_id == cuenta_id)
        .where(func.strftime("%m", MovimientoBancario.fecha) == f"{mes:02d}")
        .where(func.strftime("%Y", MovimientoBancario.fecha) == str(anio))
        .order_by(MovimientoBancario.fecha)
    )
    movimientos = mov_result.scalars().all()

    total_cargos = sum(m.monto for m in movimientos if m.tipo == "cargo") or Decimal("0.00")
    total_abonos = sum(m.monto for m in movimientos if m.tipo == "abono") or Decimal("0.00")

    # Saldo inicial del período (saldo actual - movimientos del periodo)
    saldo_inicial_periodo = cuenta.saldo_actual - total_abonos + total_cargos
    saldo_final = cuenta.saldo_actual

    return EstadoCuentaResponse(
        cuenta=cuenta,
        movimientos=movimientos,
        saldo_inicial_periodo=saldo_inicial_periodo,
        total_cargos=total_cargos,
        total_abonos=total_abonos,
        saldo_final=saldo_final,
    )
