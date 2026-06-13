"""Balance OS — Schemas de REPSE (Registro, Personal, Avisos)"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


# ─── Registro REPSE ────────────────────────────────

class RepseRegistroCreate(BaseModel):
    cliente_id: int
    numero_registro: str
    fecha_registro: datetime
    fecha_vencimiento: datetime
    actividad_economica: Optional[str] = None


class RepseRegistroUpdate(BaseModel):
    numero_registro: Optional[str] = None
    fecha_registro: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None
    estatus: Optional[str] = None
    actividad_economica: Optional[str] = None


class RepsePersonalOut(BaseModel):
    id: int
    registro_id: int
    empleado_id: int
    tipo: str
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    activo: bool
    empleado_nombre: Optional[str] = None

    model_config = {"from_attributes": True}


class RepseAvisoOut(BaseModel):
    id: int
    registro_id: int
    periodo: str
    total_personal: int
    administrativos: int
    operativos: int
    porcentaje_especializado: Decimal
    presentado: bool
    fecha_presentacion: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RepseRegistroResponse(BaseModel):
    id: int
    cliente_id: int
    numero_registro: str
    fecha_registro: datetime
    fecha_vencimiento: datetime
    estatus: str
    actividad_economica: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    personal: List[RepsePersonalOut] = []
    avisos: List[RepseAvisoOut] = []

    model_config = {"from_attributes": True}


# ─── Personal REPSE ────────────────────────────────

class RepsePersonalCreate(BaseModel):
    registro_id: int
    empleado_id: int
    tipo: str  # administrativo, operativo


class RepsePersonalUpdate(BaseModel):
    tipo: Optional[str] = None
    fecha_fin: Optional[datetime] = None
    activo: Optional[bool] = None


# ─── Avisos REPSE ──────────────────────────────────

class RepseAvisoCreate(BaseModel):
    registro_id: int
    periodo: str
    total_personal: int
    administrativos: int
    operativos: int
    presentado: bool = False
    fecha_presentacion: Optional[datetime] = None


# ─── Stats ─────────────────────────────────────────

class RepseStats(BaseModel):
    total_registros: int
    activos: int
    vencidos: int
    por_vencer_30d: int
    avisos_pendientes: int
