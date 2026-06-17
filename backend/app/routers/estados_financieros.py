"""
Balance OS — Router de Estados Financieros
"""
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract
from typing import List

from app.database import get_db
from app.models import CuentaContable, Poliza, PolizaDetalle, MovimientoBancario, CuentaBancaria
from app.schemas.estados_financieros import (
    BalanceGeneralResponse, EstadoResultadosResponse,
    FlujoEfectivoResponse, SaldoCuenta,
    CategoriaBalance, ActivoNested, PasivoNested, CapitalNested,
)
from app.routers.auth import verificar_token
from app.dependencies import get_despacho_id
from app.utils.contabilidad import obtener_saldos_periodo

router = APIRouter(prefix="/estados-financieros", tags=["estados-financieros"])


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


def _saldo_deudora(cargos: Decimal, abonos: Decimal) -> Decimal:
    return cargos - abonos


def _saldo_acreedora(cargos: Decimal, abonos: Decimal) -> Decimal:
    return abonos - cargos


# ─── Balance General ───────────────────────────────


@router.get("/balance-general", response_model=BalanceGeneralResponse)
async def balance_general(
    mes: int = Query(...),
    anio: int = Query(...),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Genera el balance general desde la balanza (activo = pasivo + capital)."""
    # Saldos acumulados desde el inicio hasta el período actual
    saldos = await obtener_saldos_periodo(db, mes, anio, acumulado=True)

    cuentas = []
    activo_total = Decimal("0.00")
    pasivo_total = Decimal("0.00")
    capital_total = Decimal("0.00")
    activo_circulante = Decimal("0.00")
    activo_fijo = Decimal("0.00")
    pasivo_corto = Decimal("0.00")
    pasivo_largo = Decimal("0.00")

    # Build nested structures
    activo_circulante_items = []
    activo_fijo_items = []
    activo_diferido_items = []
    pasivo_corto_items = []
    pasivo_largo_items = []
    capital_items = []

    for sid, s in saldos.items():
        if s["naturaleza"] == "deudora":
            saldo_periodo = _saldo_deudora(s["cargos"], s["abonos"])
        else:
            saldo_periodo = _saldo_acreedora(s["cargos"], s["abonos"])

        saldo_actual = saldo_periodo  # acumulado: saldo_actual IS the accumulated balance

        sc = SaldoCuenta(
            cuenta_id=sid,
            codigo=s["codigo"],
            nombre=s["nombre"],
            tipo=s["tipo"],
            saldo_anterior=Decimal("0.00"),
            saldo_periodo=saldo_periodo,
            saldo_actual=saldo_actual,
        )
        cuentas.append(sc)

        if s["tipo"] == "activo":
            activo_total += saldo_actual
            if s["codigo"].startswith(("1",)):
                activo_circulante += saldo_actual
                activo_circulante_items.append(sc)
            else:
                activo_fijo += saldo_actual
                activo_fijo_items.append(sc)
        elif s["tipo"] == "pasivo":
            pasivo_total += saldo_actual
            if s["codigo"].startswith(("1",)):
                pasivo_corto += saldo_actual
                pasivo_corto_items.append(sc)
            else:
                pasivo_largo += saldo_actual
                pasivo_largo_items.append(sc)
        elif s["tipo"] == "capital":
            capital_total += saldo_actual
            capital_items.append(sc)

    activo_nested = ActivoNested(
        total=activo_total,
        circulante=CategoriaBalance(total=activo_circulante, items=activo_circulante_items),
        fijo=CategoriaBalance(total=activo_fijo, items=activo_fijo_items),
        diferido=CategoriaBalance(total=Decimal("0.00"), items=activo_diferido_items),
    )
    pasivo_nested = PasivoNested(
        total=pasivo_total,
        corto_plazo=CategoriaBalance(total=pasivo_corto, items=pasivo_corto_items),
        largo_plazo=CategoriaBalance(total=pasivo_largo, items=pasivo_largo_items),
    )
    capital_nested = CapitalNested(
        total=capital_total,
        items=capital_items,
    )

    return BalanceGeneralResponse(
        periodo_mes=mes,
        periodo_anio=anio,
        activo_total=activo_total,
        pasivo_total=pasivo_total,
        capital_total=capital_total,
        activo_circulante=activo_circulante,
        activo_fijo=activo_fijo,
        pasivo_corto_plazo=pasivo_corto,
        pasivo_largo_plazo=pasivo_largo,
        capital_contable=capital_total,
        cuentas=cuentas,
        activo=activo_nested,
        pasivo=pasivo_nested,
        capital=capital_nested,
    )


# ─── Estado de Resultados ──────────────────────────


@router.get("/estado-resultados", response_model=EstadoResultadosResponse)
async def estado_resultados(
    mes: int = Query(...),
    anio: int = Query(...),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Genera el estado de resultados (ingresos - costos - gastos)."""
    # Estado de resultados usa solo el período actual (no acumulado)
    saldos = await obtener_saldos_periodo(db, mes, anio, acumulado=False)

    cuentas = []
    ingresos_totales = Decimal("0.00")
    costos_totales = Decimal("0.00")
    gastos_totales = Decimal("0.00")
    ingresos_items = []
    costos_items = []
    gastos_items = []

    for sid, s in saldos.items():
        if s["naturaleza"] == "deudora":
            saldo_periodo = _saldo_deudora(s["cargos"], s["abonos"])
        else:
            saldo_periodo = _saldo_acreedora(s["cargos"], s["abonos"])

        saldo_anterior = Decimal("0.00")
        sc = SaldoCuenta(
            cuenta_id=sid,
            codigo=s["codigo"],
            nombre=s["nombre"],
            tipo=s["tipo"],
            saldo_anterior=saldo_anterior,
            saldo_periodo=saldo_periodo,
            saldo_actual=saldo_periodo,
        )
        cuentas.append(sc)

        if s["tipo"] == "ingresos":
            ingresos_totales += saldo_periodo
            ingresos_items.append(sc)
        elif s["tipo"] == "costos":
            costos_totales += saldo_periodo
            costos_items.append(sc)
        elif s["tipo"] == "gastos":
            gastos_totales += saldo_periodo
            gastos_items.append(sc)

    utilidad_bruta = ingresos_totales - costos_totales
    utilidad_operativa = utilidad_bruta - gastos_totales
    utilidad_neta = utilidad_operativa
    isr_estimado = (utilidad_neta * Decimal("0.30")).quantize(Decimal("0.01"))
    ptu_estimado = (utilidad_neta * Decimal("0.10")).quantize(Decimal("0.01"))

    return EstadoResultadosResponse(
        periodo_mes=mes,
        periodo_anio=anio,
        ingresos_totales=ingresos_totales,
        costos_totales=costos_totales,
        gastos_totales=gastos_totales,
        utilidad_bruta=utilidad_bruta,
        utilidad_operativa=utilidad_operativa,
        utilidad_neta=utilidad_neta,
        isr_estimado=isr_estimado,
        ptu_estimado=ptu_estimado,
        cuentas=cuentas,
        ingresos=CategoriaBalance(total=ingresos_totales, items=ingresos_items),
        costos=CategoriaBalance(total=costos_totales, items=costos_items),
        gastos=CategoriaBalance(total=gastos_totales, items=gastos_items),
    )


# ─── Flujo de Efectivo ─────────────────────────────


@router.get("/flujo-efectivo", response_model=FlujoEfectivoResponse)
async def flujo_efectivo(
    mes: int = Query(...),
    anio: int = Query(...),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Genera el flujo de efectivo simplificado."""
    # Obtener saldo inicial de cuentas activas
    cuentas_result = await db.execute(
        select(CuentaBancaria).where(CuentaBancaria.activo == True)
    )
    cuentas = cuentas_result.scalars().all()
    saldo_inicial = sum(c.saldo_inicial for c in cuentas)

    # Movimientos del período — usando extract() en lugar de func.strftime (portabilidad SQL)
    movs_result = await db.execute(
        select(MovimientoBancario)
        .where(
            extract("month", MovimientoBancario.fecha) == mes,
            extract("year", MovimientoBancario.fecha) == anio,
        )
    )
    movimientos = movs_result.scalars().all()

    total_ingresos = sum(m.monto for m in movimientos if m.tipo == "abono") or Decimal("0.00")
    total_egresos = sum(m.monto for m in movimientos if m.tipo == "cargo") or Decimal("0.00")

    # Simplificado: operativo = ingresos - egresos
    flujo_operativo = total_ingresos - total_egresos
    flujo_inversion = Decimal("0.00")
    flujo_financiamiento = Decimal("0.00")
    variacion_neta = flujo_operativo + flujo_inversion + flujo_financiamiento
    saldo_final = saldo_inicial + variacion_neta

    return FlujoEfectivoResponse(
        periodo_mes=mes,
        periodo_anio=anio,
        saldo_inicial=saldo_inicial,
        flujo_operativo=flujo_operativo,
        flujo_inversion=flujo_inversion,
        flujo_financiamiento=flujo_financiamiento,
        variacion_neta=variacion_neta,
        saldo_final=saldo_final,
        operativo=CategoriaBalance(total=flujo_operativo, items=[]),
        inversion=CategoriaBalance(total=flujo_inversion, items=[]),
        financiamiento=CategoriaBalance(total=flujo_financiamiento, items=[]),
    )
