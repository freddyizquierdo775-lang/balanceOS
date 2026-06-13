"""
Balance OS — Schemas de Contabilidad
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, field_validator

# --- Catálogo de Cuentas ---
class CuentaContableCreate(BaseModel):
    codigo: str
    nombre: str
    tipo: str  # activo, pasivo, capital, ingresos, costos, gastos
    nivel: int = 1
    padre_id: Optional[int] = None
    naturaleza: str  # deudora, acreedora
    acepta_movimientos: bool = True

    @field_validator("codigo")
    @classmethod
    def validar_codigo(cls, v):
        if not v.strip():
            raise ValueError("Código requerido")
        return v.strip()

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, v):
        allowed = ["activo","pasivo","capital","ingresos","costos","gastos"]
        if v not in allowed:
            raise ValueError(f"Tipo debe ser: {', '.join(allowed)}")
        return v

class CuentaContableUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    nivel: Optional[int] = None
    padre_id: Optional[int] = None
    naturaleza: Optional[str] = None
    acepta_movimientos: Optional[bool] = None
    activo: Optional[bool] = None

class CuentaContableResponse(BaseModel):
    id: int
    codigo: str
    nombre: str
    tipo: str
    nivel: int
    padre_id: Optional[int] = None
    naturaleza: str
    acepta_movimientos: bool
    activo: bool
    created_at: datetime
    model_config = {"from_attributes": True}

# --- Pólizas ---
class PolizaDetalleCreate(BaseModel):
    cuenta_id: int
    cargo: Decimal = Decimal("0.00")
    abono: Decimal = Decimal("0.00")
    referencia: Optional[str] = None

class PolizaCreate(BaseModel):
    tipo: str  # diario, ingresos, egresos, traslado
    fecha: str  # YYYY-MM-DD
    concepto: str
    periodo_mes: int
    periodo_anio: int
    cliente_id: Optional[int] = None
    detalles: List[PolizaDetalleCreate]

class PolizaDetalleResponse(BaseModel):
    id: int
    poliza_id: int
    cuenta_id: int
    cargo: Decimal
    abono: Decimal
    referencia: Optional[str] = None
    model_config = {"from_attributes": True}

class PolizaResponse(BaseModel):
    id: int
    tipo: str
    fecha: datetime
    concepto: str
    periodo_mes: int
    periodo_anio: int
    cliente_id: Optional[int] = None
    created_at: datetime
    detalles: List[PolizaDetalleResponse] = []
    model_config = {"from_attributes": True}

# --- Balanza ---
class CuentaSaldo(BaseModel):
    cuenta_id: int
    codigo: str
    nombre: str
    saldo_inicial: Decimal = Decimal("0.00")
    cargos: Decimal = Decimal("0.00")
    abonos: Decimal = Decimal("0.00")
    saldo_final: Decimal = Decimal("0.00")

class BalanzaResponse(BaseModel):
    periodo_mes: int
    periodo_anio: int
    total_cargos: Decimal
    total_abonos: Decimal
    cuentas: List[CuentaSaldo]
