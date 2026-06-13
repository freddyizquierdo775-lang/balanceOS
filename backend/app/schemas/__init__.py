"""
Balance OS — Schemas Pydantic para API
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, field_validator
import re

# ─── Auth ─────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: dict

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str = "asesor"
    telefono: Optional[str] = None

class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    telefono: Optional[str] = None
    activo: int
    created_at: datetime

    model_config = {"from_attributes": True}

# ─── Clientes ─────────────────────────────────────

class ClienteCreate(BaseModel):
    rfc: str
    razon_social: str
    regimen_fiscal: str
    tipo_persona: str = "fisica"
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None
    tiene_repse: Optional[int] = 0
    repse_vencimiento: Optional[datetime] = None
    tiene_pld: Optional[int] = 0
    pld_vencimiento: Optional[datetime] = None
    fiel_vencimiento: Optional[datetime] = None

    @field_validator("rfc")
    @classmethod
    def validar_rfc(cls, v: str) -> str:
        v = v.upper().strip()
        if not re.match(r"^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$", v):
            raise ValueError("RFC invalido. Debe tener 12 o 13 caracteres")
        return v

class ClienteUpdate(BaseModel):
    rfc: Optional[str] = None
    razon_social: Optional[str] = None
    regimen_fiscal: Optional[str] = None
    tipo_persona: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    estatus: Optional[str] = None
    tiene_repse: Optional[int] = None
    repse_vencimiento: Optional[datetime] = None
    tiene_pld: Optional[int] = None
    pld_vencimiento: Optional[datetime] = None
    fiel_vencimiento: Optional[datetime] = None
    notas: Optional[str] = None

    @field_validator("rfc")
    @classmethod
    def validar_rfc_update(cls, v: str) -> str:
        if v is not None:
            v = v.upper().strip()
            if not re.match(r"^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$", v):
                raise ValueError("RFC invalido. Debe tener 12 o 13 caracteres")
        return v

class ClienteResponse(BaseModel):
    id: int
    rfc: str
    razon_social: str
    regimen_fiscal: str
    tipo_persona: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    estatus: str
    tiene_repse: int
    tiene_pld: int
    repse_vencimiento: Optional[datetime] = None
    pld_vencimiento: Optional[datetime] = None
    fiel_vencimiento: Optional[datetime] = None
    asesor_id: Optional[int] = None
    notas: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

# ─── Documentos ───────────────────────────────────

class DocumentoResponse(BaseModel):
    id: int
    cliente_id: int
    nombre: str
    tipo: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
