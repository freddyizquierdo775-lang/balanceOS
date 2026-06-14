"""
Balance OS — Schemas para CRM
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ─── Seguimientos ──────────────────────────────────

class SeguimientoCreate(BaseModel):
    cliente_id: Optional[int] = None
    titulo: str
    descripcion: Optional[str] = None
    tipo: str = "general"  # general, imss, fiscal, nomina, juridico
    prioridad: str = "media"  # alta, media, baja
    estado: str = "pendiente"  # pendiente, en_proceso, completado, cancelado
    fecha_limite: Optional[datetime] = None


class SeguimientoUpdate(BaseModel):
    estado: Optional[str] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    prioridad: Optional[str] = None
    fecha_limite: Optional[datetime] = None


class SeguimientoResponse(BaseModel):
    id: int
    cliente_id: Optional[int] = None
    titulo: str
    descripcion: Optional[str] = None
    tipo: str
    prioridad: str
    estado: str
    fecha_limite: Optional[datetime] = None
    usuario_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Notas ─────────────────────────────────────────

class NotaCreate(BaseModel):
    cliente_id: Optional[int] = None
    titulo: str
    contenido: Optional[str] = None
    modulo_origen: Optional[str] = None


class NotaResponse(BaseModel):
    id: int
    cliente_id: Optional[int] = None
    titulo: str
    contenido: Optional[str] = None
    modulo_origen: Optional[str] = None
    usuario_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Eventos / Timeline ────────────────────────────

class EventoResponse(BaseModel):
    id: int
    entidad: str
    entidad_id: int
    accion: str
    estado_anterior: Optional[str] = None
    estado_nuevo: Optional[str] = None
    descripcion: Optional[str] = None
    metadata_json: Optional[dict] = None
    usuario_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Búsqueda Global ───────────────────────────────

class BusquedaResultado(BaseModel):
    tipo: str  # cliente, empleado, documento
    id: int
    titulo: str
    subtitulo: Optional[str] = None
    extra: Optional[dict] = None
