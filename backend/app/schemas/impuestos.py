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
    utilidad_fiscal: Optional[Decimal] = None
    tasa_efectiva: Optional[Decimal] = None
    isr_retenciones: Optional[Decimal] = None
    isr_pago_provisional: Optional[Decimal] = None
    brackets: Optional[List["BracketDetalle"]] = None

class BracketDetalle(BaseModel):
    limite_inferior: Decimal
    limite_superior: Optional[Decimal] = None
    tasa: Decimal
    cuota_fija: Decimal
    base_gravable: Decimal
    impuesto: Decimal

class CalculoDetalladoResponse(BaseModel):
    utilidad_fiscal: Decimal
    tasa_efectiva: Decimal
    isr_bruto: Decimal
    isr_retenciones: Decimal
    isr_pago_provisional: Decimal
    isr_neto: Decimal
    brackets: List[BracketDetalle]

class DiotResponse(BaseModel):
    periodo_mes: int
    periodo_anio: int
    iva_acreditable: Decimal
    iva_trasladado: Decimal
    diferencia: Decimal
    proveedores: int


# ─── Estímulos Fiscales ───────────────────────────

class EstimuloFiscalCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    tipo: str  # credito, deduccion, exencion, tasa_reducida, diferimiento
    porcentaje: Decimal = Decimal("0.00")
    impuesto_aplicable: Optional[str] = None  # ISR, IVA, IEPS, etc.
    fundamento_legal: Optional[str] = None
    activo: bool = True


class EstimuloFiscalResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    tipo: str
    porcentaje: Decimal
    impuesto_aplicable: Optional[str] = None
    fundamento_legal: Optional[str] = None
    activo: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class ClienteEstimuloCreate(BaseModel):
    cliente_id: int
    estimulo_id: int
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    activo: bool = True


class ClienteEstimuloResponse(BaseModel):
    id: int
    cliente_id: int
    estimulo_id: int
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    activo: bool
    model_config = {"from_attributes": True}


class CalculoCompletoRequest(BaseModel):
    ingresos: Decimal = Decimal("0.00")
    deducciones: Decimal = Decimal("0.00")
    iva_trasladado: Decimal = Decimal("0.00")
    iva_acreditable: Decimal = Decimal("0.00")
    ieps_trasladado: Decimal = Decimal("0.00")
    ieps_acreditable: Decimal = Decimal("0.00")
    isn_base: Decimal = Decimal("0.00")
    periodo_mes: int
    periodo_anio: int
    estimulos_ids: List[int] = []


class ImpuestoDesglose(BaseModel):
    impuesto: str  # ISR, IVA, IEPS, ISN, etc.
    base: Decimal
    tasa: Decimal
    bruto: Decimal
    estimulo_aplicado: bool = False
    estimulo_tipo: Optional[str] = None
    estimulo_porcentaje: Optional[Decimal] = None
    ahorro_estimulo: Decimal = Decimal("0.00")
    neto: Decimal


class CalculoCompletoResponse(BaseModel):
    resumen: List[ImpuestoDesglose]
    total_impuestos_brutos: Decimal
    total_ahorro_estimulos: Decimal
    total_impuestos_netos: Decimal
