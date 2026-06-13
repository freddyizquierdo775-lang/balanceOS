"""
Balance OS — Schemas de Tesorería y Alertas EFOS
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

# --- Tesorería ---
class CuentaBancariaCreate(BaseModel):
    cliente_id: int
    banco: str
    numero_cuenta: str
    clabe: Optional[str] = None
    tipo: str = "cheques"
    saldo_inicial: Decimal = Decimal("0.00")

class CuentaBancariaResponse(BaseModel):
    id: int
    cliente_id: int
    banco: str
    numero_cuenta: str
    clabe: Optional[str] = None
    tipo: str
    saldo_inicial: Decimal
    saldo_actual: Decimal
    activo: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class MovimientoCreate(BaseModel):
    cuenta_id: int
    fecha: str
    tipo: str  # cargo / abono
    concepto: str
    monto: Decimal
    referencia: Optional[str] = None

class MovimientoResponse(BaseModel):
    id: int
    cuenta_id: int
    fecha: datetime
    tipo: str
    concepto: str
    monto: Decimal
    referencia: Optional[str] = None
    conciliado: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class ConciliacionRequest(BaseModel):
    cuenta_id: int
    periodo_mes: int
    periodo_anio: int
    saldo_estado_cuenta: Decimal
    notas: Optional[str] = None

class ConciliacionResponse(BaseModel):
    id: int
    cuenta_id: int
    periodo_mes: int
    periodo_anio: int
    saldo_estado_cuenta: Decimal
    saldo_sistema: Decimal
    diferencia: Decimal
    conciliado: bool
    notas: Optional[str] = None
    model_config = {"from_attributes": True}

class EstadoCuentaResponse(BaseModel):
    cuenta: CuentaBancariaResponse
    movimientos: List[MovimientoResponse]
    saldo_inicial_periodo: Decimal
    total_cargos: Decimal
    total_abonos: Decimal
    saldo_final: Decimal

# --- EFOS ---
class ListaEfosCreate(BaseModel):
    rfc: str
    tipo_lista: str
    fecha_publicacion: Optional[str] = None

class AlertaEfosResponse(BaseModel):
    id: int
    cliente_id: int
    rfc: str
    tipo_lista: str
    fecha_alerta: datetime
    resuelto: bool
    model_config = {"from_attributes": True}

class VerificacionEfosResponse(BaseModel):
    rfc: str
    cliente: str
    en_lista: bool
    tipo_lista: Optional[str] = None
    alerta_existente: bool
