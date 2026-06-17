"""Balance OS — Schemas de CFDI / Timbrado"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class CsdCertificadoCreate(BaseModel):
    alias: str
    rfc_emisor: str
    regimen_fiscal: str = "607"
    certificado_path: Optional[str] = None
    llave_path: Optional[str] = None
    contrasena: Optional[str] = None
    numero_certificado: Optional[str] = None
    fecha_validez_inicio: Optional[datetime] = None
    fecha_validez_fin: Optional[datetime] = None


class CsdCertificadoResponse(BaseModel):
    id: int
    alias: str
    rfc_emisor: str
    regimen_fiscal: str
    activo: bool
    fecha_validez_inicio: Optional[datetime] = None
    fecha_validez_fin: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CfdiReciboResponse(BaseModel):
    id: int
    recibo_id: int
    uuid: Optional[str] = None
    estatus: str
    serie: str
    folio: Optional[int] = None
    fecha_timbrado: Optional[datetime] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CfdiTimbrarRequest(BaseModel):
    recibo_id: int


class CfdiTimbrarResponse(BaseModel):
    cfdi: CfdiReciboResponse
    uuid: str
    xml_preview: str  # primeros 500 chars


class CfdiCancelarRequest(BaseModel):
    """Solicitud de cancelación de CFDI."""
    uuid: str
    rfc_emisor: str
    motivo: Optional[str] = None  # motivo de cancelación (opcional)
