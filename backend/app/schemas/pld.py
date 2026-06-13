"""Balance OS — Schemas de PLD (Cuestionario Riesgo, Documentos)"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class PldCuestionarioCreate(BaseModel):
    cliente_id: int
    ingresos_anuales: Decimal
    volumen_operaciones: Decimal = Decimal("0")
    transacciones_internacionales: bool = False
    tipo_operacion: str = "nacional"
    expuesto_politicamente: bool = False
    sector_riesgo_alto: bool = False
    origen_fondos_documentado: bool = True
    antigüedad_relacion: int = 0  # meses


class PldCuestionarioResponse(BaseModel):
    id: int
    cliente_id: int
    fecha_aplicacion: Optional[datetime] = None
    ingresos_anuales: Decimal
    volumen_operaciones: Decimal
    transacciones_internacionales: bool
    tipo_operacion: str
    expuesto_politicamente: bool
    sector_riesgo_alto: bool
    origen_fondos_documentado: bool
    antigüedad_relacion: int
    puntaje: Decimal
    nivel_riesgo: str
    recomendacion: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PldDocumentoCreate(BaseModel):
    cliente_id: int
    tipo: str  # identificacion, comprobante_domicilio, acta_constitutiva, poder_notarial


class PldDocumentoResponse(BaseModel):
    id: int
    cliente_id: int
    tipo: str
    archivo_path: Optional[str] = None
    verificado: bool
    fecha_verificacion: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PldClienteResumen(BaseModel):
    cliente_id: int
    cliente_nombre: str
    cliente_rfc: str
    ultimo_cuestionario: Optional[PldCuestionarioResponse] = None
    documentos_completos: int
    documentos_pendientes: int
    riesgo: Optional[str] = None
