"""
Balance OS — Schemas de Facturación de Ingresos
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

class ConceptoFacturaCreate(BaseModel):
    clave_prod_serv: str = "84111506"
    no_identificacion: Optional[str] = None
    cantidad: Decimal = Decimal("1.00")
    clave_unidad: str = "ACT"
    unidad: str = "Actividad"
    descripcion: str
    valor_unitario: Decimal
    importe: Decimal
    descuento: Decimal = Decimal("0.00")
    objeto_imp: str = "02"
    iva: Optional[float] = None
    impuestos: List[dict] = []

class FacturaCreate(BaseModel):
    cliente_id: Optional[int] = None
    receptor_rfc: str
    receptor_nombre: str
    uso_cfdi: str = "G03"
    forma_pago: str = "99"
    metodo_pago: str = "PUE"
    serie: Optional[str] = "F"
    folio: Optional[str] = None
    lugar_expedicion: str = "77500"
    moneda: str = "MXN"
    tipo_cambio: Optional[Decimal] = None
    descuento: Decimal = Decimal("0.00")
    conceptos: List[ConceptoFacturaCreate]

class CfdiIngresoResponse(BaseModel):
    id: int
    uuid: str
    emisor_rfc: str
    emisor_nombre: str
    receptor_rfc: str
    receptor_nombre: str
    fecha_emision: datetime
    serie: Optional[str]
    folio: Optional[str]
    tipo_comprobante: str
    subtotal: Decimal
    descuento: Decimal
    total: Decimal
    estatus: str
    created_at: datetime
    xml_path: Optional[str] = None
    model_config = {"from_attributes": True}

class ComplementoPagoCreate(BaseModel):
    cliente_id: Optional[int] = None
    receptor_rfc: str
    receptor_nombre: str
    forma_pago: str = "01"
    moneda: str = "MXN"
    pagos: List[dict]  # [{cfdi_uuid, importe_pagado, importe_insoluto, parcialidad}]
