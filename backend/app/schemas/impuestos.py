"""
Balance OS — Schemas de Impuestos
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

class DeclaracionConceptoCreate(BaseModel):
    tipo: str
    concepto: str
    monto: Decimal = Decimal("0.00")
    base: Decimal = Decimal("0.00")
    tasa: Decimal = Decimal("0.00")
    impuesto: Decimal = Decimal("0.00")

class DeclaracionCreate(BaseModel):
    cliente_id: int
    tipo: str  # mensual / anual
    periodo_mes: int
    periodo_anio: int
    conceptos: List[DeclaracionConceptoCreate]

class DeclaracionConceptoResponse(BaseModel):
    id: int
    tipo: str
    concepto: str
    monto: Decimal
    base: Decimal
    tasa: Decimal
    impuesto: Decimal
    model_config = {"from_attributes": True}

class DeclaracionResponse(BaseModel):
    id: int
    cliente_id: int
    tipo: str
    periodo_mes: int
    periodo_anio: int
    fecha_presentacion: Optional[datetime] = None
    estatus: str
    created_at: datetime
    conceptos: List[DeclaracionConceptoResponse] = []
    model_config = {"from_attributes": True}

class CalculoImpuestosRequest(BaseModel):
    ingresos: Decimal = Decimal("0.00")
    deducciones: Decimal = Decimal("0.00")
    iva_trasladado: Decimal = Decimal("0.00")
    iva_acreditable: Decimal = Decimal("0.00")
    periodo_mes: int
    periodo_anio: int

class CalculoImpuestosResponse(BaseModel):
    iva_por_pagar: Decimal
    iva_a_favor: Decimal
    isr_bruto: Decimal
    isr_retenido: Decimal
    isr_neto: Decimal
    coeficiente: Optional[Decimal] = None

class DiotResponse(BaseModel):
    periodo_mes: int
    periodo_anio: int
    iva_acreditable: Decimal
    iva_trasladado: Decimal
    diferencia: Decimal
    proveedores: int
