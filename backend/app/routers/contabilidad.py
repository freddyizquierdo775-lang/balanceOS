"""
Balance OS — Router de Contabilidad Electrónica
"""
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete
from typing import List, Optional

from app.database import get_db
from app.models import CuentaContable, Poliza, PolizaDetalle
from app.schemas.contabilidad import (
    CuentaContableCreate, CuentaContableUpdate, CuentaContableResponse,
    PolizaCreate, PolizaDetalleCreate, PolizaResponse, PolizaDetalleResponse,
    BalanzaResponse, CuentaSaldo,
)
from app.routers.auth import verificar_token

router = APIRouter(prefix="/contabilidad", tags=["contabilidad"])


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Catálogo de Cuentas ───────────────────────────


@router.get("/cuentas", response_model=List[CuentaContableResponse])
async def listar_cuentas(
    arbol: Optional[bool] = Query(False, description="Incluir estructura jerárquica"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista el catálogo de cuentas contables."""
    result = await db.execute(
        select(CuentaContable).order_by(CuentaContable.codigo)
    )
    cuentas = result.scalars().all()
    return cuentas


@router.post("/cuentas", response_model=CuentaContableResponse, status_code=status.HTTP_201_CREATED)
async def crear_cuenta(
    data: CuentaContableCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Crea una nueva cuenta contable."""
    # Verificar si el código ya existe
    existe = await db.execute(
        select(CuentaContable).where(CuentaContable.codigo == data.codigo)
    )
    if existe.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El código '{data.codigo}' ya existe",
        )
    cuenta = CuentaContable(
        codigo=data.codigo,
        nombre=data.nombre,
        tipo=data.tipo,
        nivel=data.nivel,
        padre_id=data.padre_id,
        naturaleza=data.naturaleza,
        acepta_movimientos=data.acepta_movimientos,
    )
    db.add(cuenta)
    await db.commit()
    await db.refresh(cuenta)
    return cuenta


@router.put("/cuentas/{cuenta_id}", response_model=CuentaContableResponse)
async def editar_cuenta(
    cuenta_id: int,
    data: CuentaContableUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Edita una cuenta contable."""
    result = await db.execute(
        select(CuentaContable).where(CuentaContable.id == cuenta_id)
    )
    cuenta = result.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cuenta, key, value)

    await db.commit()
    await db.refresh(cuenta)
    return cuenta


@router.delete("/cuentas/{cuenta_id}")
async def desactivar_cuenta(
    cuenta_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Desactiva una cuenta contable (borrado lógico)."""
    result = await db.execute(
        select(CuentaContable).where(CuentaContable.id == cuenta_id)
    )
    cuenta = result.scalar_one_or_none()
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada")

    cuenta.activo = False
    await db.commit()
    return {"detail": "Cuenta desactivada correctamente"}


# ─── Pólizas ───────────────────────────────────────


@router.post("/polizas", response_model=PolizaResponse, status_code=status.HTTP_201_CREATED)
async def crear_poliza(
    data: PolizaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Crea una póliza con sus detalles contables."""
    # Validar que los detalles sumen (cargos == abonos)
    total_cargos = sum(d.cargo for d in data.detalles)
    total_abonos = sum(d.abono for d in data.detalles)
    if total_cargos != total_abonos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Los cargos ({total_cargos}) deben ser igual a los abonos ({total_abonos})",
        )

    fecha = datetime.strptime(data.fecha, "%Y-%m-%d")
    poliza = Poliza(
        tipo=data.tipo,
        fecha=fecha,
        concepto=data.concepto,
        periodo_mes=data.periodo_mes,
        periodo_anio=data.periodo_anio,
        cliente_id=data.cliente_id,
        usuario_id=usuario["id"],
    )
    db.add(poliza)
    await db.flush()

    for det in data.detalles:
        detalle = PolizaDetalle(
            poliza_id=poliza.id,
            cuenta_id=det.cuenta_id,
            cargo=det.cargo,
            abono=det.abono,
            referencia=det.referencia,
        )
        db.add(detalle)

    await db.commit()
    await db.refresh(poliza)
    return poliza


@router.get("/polizas", response_model=List[PolizaResponse])
async def listar_polizas(
    periodo_mes: Optional[int] = Query(None),
    periodo_anio: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista las pólizas con filtros opcionales."""
    query = select(Poliza)

    if periodo_mes:
        query = query.where(Poliza.periodo_mes == periodo_mes)
    if periodo_anio:
        query = query.where(Poliza.periodo_anio == periodo_anio)

    query = query.order_by(Poliza.fecha.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/polizas/{poliza_id}", response_model=PolizaResponse)
async def obtener_poliza(
    poliza_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Obtiene una póliza con sus detalles."""
    result = await db.execute(
        select(Poliza).where(Poliza.id == poliza_id)
    )
    poliza = result.scalar_one_or_none()
    if not poliza:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Póliza no encontrada")
    return poliza


@router.delete("/polizas/{poliza_id}")
async def eliminar_poliza(
    poliza_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Elimina una póliza y sus detalles (borrado físico)."""
    result = await db.execute(
        select(Poliza).where(Poliza.id == poliza_id)
    )
    poliza = result.scalar_one_or_none()
    if not poliza:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Póliza no encontrada")

    await db.delete(poliza)
    await db.commit()
    return {"detail": "Póliza eliminada correctamente"}


# ─── Balanza de Comprobación ───────────────────────


@router.get("/balanza", response_model=BalanzaResponse)
async def calcular_balanza(
    mes: int = Query(..., alias="mes"),
    anio: int = Query(..., alias="anio"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Calcula la balanza de comprobación para un período (cargos/abonos por cuenta)."""
    # Obtener todas las cuentas activas
    cuentas_result = await db.execute(
        select(CuentaContable).where(CuentaContable.activo == True).order_by(CuentaContable.codigo)
    )
    cuentas = cuentas_result.scalars().all()

    # Obtener movimientos (detalles de pólizas) del período
    detalles_result = await db.execute(
        select(PolizaDetalle, Poliza.fecha, Poliza.periodo_mes, Poliza.periodo_anio)
        .join(Poliza, PolizaDetalle.poliza_id == Poliza.id)
        .where(Poliza.periodo_mes == mes)
        .where(Poliza.periodo_anio == anio)
    )
    filas = detalles_result.all()

    # Acumular saldos por cuenta
    saldos = {}
    for c in cuentas:
        saldos[c.id] = {"cargos": Decimal("0.00"), "abonos": Decimal("0.00")}

    for det, _, _, _ in filas:
        if det.cuenta_id in saldos:
            saldos[det.cuenta_id]["cargos"] += det.cargo
            saldos[det.cuenta_id]["abonos"] += det.abono

    cuentas_saldo = []
    total_cargos = Decimal("0.00")
    total_abonos = Decimal("0.00")

    for c in cuentas:
        cargos = saldos[c.id]["cargos"]
        abonos = saldos[c.id]["abonos"]

        # Calcular saldo según naturaleza
        if c.naturaleza == "deudora":
            saldo_final = cargos - abonos
        else:
            saldo_final = abonos - cargos

        total_cargos += cargos
        total_abonos += abonos

        cuentas_saldo.append(CuentaSaldo(
            cuenta_id=c.id,
            codigo=c.codigo,
            nombre=c.nombre,
            saldo_inicial=Decimal("0.00"),
            cargos=cargos,
            abonos=abonos,
            saldo_final=saldo_final,
        ))

    return BalanzaResponse(
        periodo_mes=mes,
        periodo_anio=anio,
        total_cargos=total_cargos,
        total_abonos=total_abonos,
        cuentas=cuentas_saldo,
    )
