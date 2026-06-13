"""
Balance OS — Schemas de Estados Financieros
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

class SaldoCuenta(BaseModel):
    cuenta_id: int
    codigo: str
    nombre: str
    tipo: str
    saldo_anterior: Decimal = Decimal("0.00")
    saldo_periodo: Decimal = Decimal("0.00")
    saldo_actual: Decimal = Decimal("0.00")

class BalanceGeneralResponse(BaseModel):
    periodo_mes: int
    periodo_anio: int
    activo_total: Decimal
    pasivo_total: Decimal
    capital_total: Decimal
    activo_circulante: Decimal
    activo_fijo: Decimal
    pasivo_corto_plazo: Decimal
    pasivo_largo_plazo: Decimal
    capital_contable: Decimal
    cuentas: List[SaldoCuenta]

class EstadoResultadosResponse(BaseModel):
    periodo_mes: int
    periodo_anio: int
    ingresos_totales: Decimal
    costos_totales: Decimal
    gastos_totales: Decimal
    utilidad_bruta: Decimal
    utilidad_operativa: Decimal
    utilidad_neta: Decimal
    isr_estimado: Decimal
    ptu_estimado: Decimal
    cuentas: List[SaldoCuenta]

class FlujoEfectivoResponse(BaseModel):
    periodo_mes: int
    periodo_anio: int
    saldo_inicial: Decimal
    flujo_operativo: Decimal
    flujo_inversion: Decimal
    flujo_financiamiento: Decimal
    variacion_neta: Decimal
    saldo_final: Decimal
