"""
IMSS Engine — Tipos de datos
"""
from datetime import date
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field


class DatosTrabajador(BaseModel):
    salario_diario: Decimal = Field(..., gt=0, description="Salario diario base del trabajador")
    dias_aguinaldo: int = Field(default=15, ge=0, le=30, description="Días de aguinaldo anual")
    prima_vacacional_pct: Decimal = Field(default=Decimal("0.25"), description="% prima vacacional (0.25 = 25%)")
    factor_integracion: Optional[Decimal] = Field(None, description="Factor de integración (calculado si no se provee)")
    clase_riesgo: int = Field(default=1, ge=1, le=5, description="Clase de riesgo (I a V)")
    dias_trabajados: int = Field(default=365, ge=1, le=365, description="Días laborados en el año")


class ResultadoSBC(BaseModel):
    salario_diario: Decimal
    factor_integracion: Decimal
    sbc_diario: Decimal
    sbc_mensual: Decimal
    excede_uma: bool
    tope_aplicado: bool
    detalle: str


class CuotaObreroPatronal(BaseModel):
    concepto: str
    tasa_patronal: Decimal
    tasa_obrera: Decimal
    monto_patronal: Decimal
    monto_obrero: Decimal
    base_cotizacion: Decimal


class ResultadoCuotas(BaseModel):
    sbc_diario: Decimal
    sbc_mensual: Decimal
    umas: Decimal
    cuotas: List[CuotaObreroPatronal]
    total_patronal: Decimal
    total_obrero: Decimal
    gran_total: Decimal
