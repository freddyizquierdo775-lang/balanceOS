"""Balance OS — Schemas de Nómina (Períodos + Recibos)"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class PeriodoCreate(BaseModel):
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    tipo: str = "quincenal"  # semanal, quincenal, mensual


class PeriodoResponse(BaseModel):
    """Período sin recibos (para create/list)."""
    id: int
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    tipo: str
    estatus: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PeriodoDetalleResponse(PeriodoResponse):
    """Período con recibos (para detail/calcular)."""
    recibos: List["ReciboResponse"] = []


class ReciboResponse(BaseModel):
    id: int
    periodo_id: int
    empleado_id: int
    salario_diario: Decimal
    dias_trabajados: int
    sbc: Decimal
    sueldo_base: Decimal
    aguinaldo: Decimal
    prima_vacacional: Decimal
    otras_percepciones: Decimal
    total_percepciones: Decimal
    imss_obrero: Decimal
    isr: Decimal
    subsidio_al_empleo: Decimal = Decimal("0")
    isr_neto: Decimal = Decimal("0")
    otras_deducciones: Decimal
    total_deducciones: Decimal
    neto: Decimal
    estatus: str
    created_at: datetime

    model_config = {"from_attributes": True}
