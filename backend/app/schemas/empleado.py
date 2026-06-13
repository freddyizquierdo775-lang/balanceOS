"""Balance OS — Schemas de Empleados y Nómina"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, field_validator
import re


class EmpleadoCreate(BaseModel):
    rfc: str
    curp: str
    nombre: str
    apellidos: str
    fecha_nacimiento: Optional[datetime] = None
    fecha_ingreso: Optional[datetime] = None
    salario_diario: Decimal
    tipo_contrato: str = "base"
    tipo_jornada: str = "diurna"
    clase_riesgo: int = 1
    email: Optional[str] = None
    telefono: Optional[str] = None
    banco: Optional[str] = None
    cuenta_bancaria: Optional[str] = None
    clabe: Optional[str] = None

    @field_validator("rfc")
    @classmethod
    def validar_rfc(cls, v: str) -> str:
        v = v.upper().strip()
        if not re.match(r"^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$", v):
            raise ValueError("RFC invalido. Debe tener 12 o 13 caracteres")
        return v

    @field_validator("curp")
    @classmethod
    def validar_curp(cls, v: str) -> str:
        v = v.upper().strip()
        if not re.match(r"^[A-Z]{4}[0-9]{6}[A-Z]{6}[0-9A-Z]{2}$", v):
            raise ValueError("CURP invalida. Debe tener 18 caracteres")
        return v

    @field_validator("clase_riesgo")
    @classmethod
    def validar_riesgo(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Clase de riesgo debe ser 1-5")
        return v


class EmpleadoUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    salario_diario: Optional[Decimal] = None
    tipo_contrato: Optional[str] = None
    tipo_jornada: Optional[str] = None
    clase_riesgo: Optional[int] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    banco: Optional[str] = None
    cuenta_bancaria: Optional[str] = None
    clabe: Optional[str] = None
    estatus: Optional[str] = None
    activo: Optional[bool] = None

    @field_validator("clase_riesgo")
    @classmethod
    def validar_riesgo(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("Clase de riesgo debe ser 1-5")
        return v


class EmpleadoResponse(BaseModel):
    id: int
    rfc: str
    curp: str
    nombre: str
    apellidos: str
    fecha_nacimiento: Optional[datetime] = None
    fecha_ingreso: Optional[datetime] = None
    salario_diario: Decimal
    tipo_contrato: str
    tipo_jornada: str
    clase_riesgo: int
    estatus: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    banco: Optional[str] = None
    cuenta_bancaria: Optional[str] = None
    clabe: Optional[str] = None
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
