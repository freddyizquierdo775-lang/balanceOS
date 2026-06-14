"""Balance OS — Schemas de Finiquitos/Liquidaciones"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class FiniquitoCalcularRequest(BaseModel):
    empleado_id: int
    fecha_baja: datetime
    tipo: str  # despido_injustificado, renuncia, terminacion_mutuo, terminacion_temporal
    causa: Optional[str] = None
    dias_vacaciones_pendientes: Optional[int] = None  # auto-calculado si no se provee
    otros_pagos: Optional[Decimal] = Decimal("0")


class FiniquitoResponse(BaseModel):
    id: int
    empleado_id: int
    fecha_baja: datetime
    tipo: str
    causa: Optional[str] = None
    anios_servicio: int
    salario_diario: Decimal
    indemnizacion_3meses: Decimal
    indemnizacion_20dias_x_anio: Decimal
    prima_antiguedad: Decimal
    vacaciones_pendientes: Decimal
    prima_vacacional: Decimal
    aguinaldo_proporcional: Decimal
    otras_percepciones: Decimal
    total_percepciones: Decimal
    isr: Decimal
    isr_exento: Decimal
    otras_deducciones: Decimal
    total_deducciones: Decimal
    neto: Decimal
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class FiniquitoPreview(BaseModel):
    """Resultado de cálculo preview (no guardado)."""
    anios_servicio: int
    salario_diario: Decimal
    indemnizacion_3meses: Decimal
    indemnizacion_20dias_x_anio: Decimal
    prima_antiguedad: Decimal
    vacaciones_pendientes: Decimal
    prima_vacacional: Decimal
    aguinaldo_proporcional: Decimal
    otras_percepciones: Decimal
    total_percepciones: Decimal
    isr: Decimal
    isr_exento: Decimal
    otras_deducciones: Decimal
    total_deducciones: Decimal
    neto: Decimal
    isr_detalle: Optional[dict] = None


# ─── Schemas para buscador de trabajadores ──────────

class TrabajadorBusquedaItem(BaseModel):
    """Item devuelto por el buscador de trabajadores."""
    id: int
    nombre: str
    apellidos: str
    rfc: str
    fecha_ingreso: Optional[datetime] = None
    salario_diario: Decimal
    estatus: str

    model_config = {"from_attributes": True}


class TrabajadorDatosResponse(BaseModel):
    """Datos completos del trabajador para pre-llenar cálculo de finiquito."""
    empleado_id: int
    nombre: str
    apellidos: str
    rfc: str
    fecha_ingreso: Optional[datetime] = None
    salario_diario: Decimal
    estatus: str
    # Campos calculados (requieren fecha_baja como query param)
    dias_vacaciones_pendientes: int = 0
    aguinaldo_proporcional: Decimal = Decimal("0")
    prima_vacacional_proporcional: Decimal = Decimal("0")
    anios_servicio: int = 0
    saldo_pendiente: Decimal = Decimal("0")

    model_config = {"from_attributes": True}
