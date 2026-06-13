"""
Balance OS — Modelos de Facturación de Ingresos
"""
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum, Boolean, Numeric
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class EstatusCfdi(str, enum.Enum):
    ACTIVO = "activo"
    CANCELADO = "cancelado"

class TipoComprobante(str, enum.Enum):
    INGRESO = "I"
    EGRESO = "E"
    TRASLADO = "T"
    PAGO = "P"
    NOMINA = "N"

class TipoRelacion(str, enum.Enum):
    NOTA_CREDITO = "01"
    NOTA_DEBITO = "02"
    SUSTITUCION = "03"
    COMPLEMENTO_PAGO = "04"


class CfdiIngreso(Base):
    __tablename__ = "cfdi_ingresos"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    emisor_rfc = Column(String(13), nullable=False)
    emisor_nombre = Column(String(300), nullable=False)
    receptor_rfc = Column(String(13), nullable=False)
    receptor_nombre = Column(String(300), nullable=False)
    fecha_emision = Column(DateTime, nullable=False)
    serie = Column(String(20), nullable=True)
    folio = Column(String(20), nullable=True)
    tipo_comprobante = Column(SAEnum(TipoComprobante), default=TipoComprobante.INGRESO)
    forma_pago = Column(String(2), nullable=True)
    metodo_pago = Column(String(3), nullable=True)
    uso_cfdi = Column(String(3), nullable=True)
    moneda = Column(String(3), default="MXN")
    tipo_cambio = Column(Numeric(10, 4), nullable=True)
    lugar_expedicion = Column(String(5), nullable=True)
    subtotal = Column(Numeric(14, 2), default=Decimal("0.00"))
    descuento = Column(Numeric(14, 2), default=Decimal("0.00"))
    total = Column(Numeric(14, 2), default=Decimal("0.00"))
    total_traslados = Column(Numeric(14, 2), default=Decimal("0.00"))
    total_retenciones = Column(Numeric(14, 2), default=Decimal("0.00"))
    estatus = Column(SAEnum(EstatusCfdi), default=EstatusCfdi.ACTIVO)
    xml_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conceptos = relationship("CfdiIngresoConcepto", backref="cfdi", cascade="all, delete-orphan")
    impuestos = relationship("CfdiIngresoImpuesto", backref="cfdi", cascade="all, delete-orphan")


class CfdiIngresoConcepto(Base):
    __tablename__ = "cfdi_ingresos_conceptos"

    id = Column(Integer, primary_key=True, index=True)
    cfdi_id = Column(Integer, ForeignKey("cfdi_ingresos.id"), nullable=False)
    clave_prod_serv = Column(String(8), nullable=False)
    no_identificacion = Column(String(100), nullable=True)
    cantidad = Column(Numeric(14, 4), default=Decimal("1.00"))
    clave_unidad = Column(String(3), nullable=False, default="H87")
    unidad = Column(String(50), nullable=True)
    descripcion = Column(String(1000), nullable=False)
    valor_unitario = Column(Numeric(14, 2), default=Decimal("0.00"))
    importe = Column(Numeric(14, 2), default=Decimal("0.00"))
    descuento = Column(Numeric(14, 2), default=Decimal("0.00"))
    objeto_imp = Column(String(2), default="02")


class CfdiIngresoImpuesto(Base):
    __tablename__ = "cfdi_ingresos_impuestos"

    id = Column(Integer, primary_key=True, index=True)
    cfdi_id = Column(Integer, ForeignKey("cfdi_ingresos.id"), nullable=False)
    tipo = Column(String(10), nullable=False)  # traslado / retencion
    base = Column(Numeric(14, 2), default=Decimal("0.00"))
    impuesto = Column(String(3), nullable=False)  # IVA / ISR / IEPS
    tasa_cuota = Column(Numeric(6, 4), default=Decimal("0.00"))
    importe = Column(Numeric(14, 2), default=Decimal("0.00"))


# --- Complementos de Pago ---
class CfdiComplementoPago(Base):
    __tablename__ = "cfdi_complementos_pago"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    emisor_rfc = Column(String(13), nullable=False)
    receptor_rfc = Column(String(13), nullable=False)
    fecha_pago = Column(DateTime, nullable=False)
    forma_pago = Column(String(2), nullable=True)
    moneda = Column(String(3), default="MXN")
    tipo_cambio = Column(Numeric(10, 4), nullable=True)
    monto_total = Column(Numeric(14, 2), default=Decimal("0.00"))
    estatus = Column(SAEnum(EstatusCfdi), default=EstatusCfdi.ACTIVO)
    xml_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    detalles = relationship("CfdiPagoDetalle", backref="complemento", cascade="all, delete-orphan")


class CfdiPagoDetalle(Base):
    __tablename__ = "cfdi_pagos_detalles"

    id = Column(Integer, primary_key=True, index=True)
    complemento_id = Column(Integer, ForeignKey("cfdi_complementos_pago.id"), nullable=False)
    cfdi_relacionado_uuid = Column(String(36), nullable=False)
    importe_pagado = Column(Numeric(14, 2), default=Decimal("0.00"))
    importe_insoluto = Column(Numeric(14, 2), default=Decimal("0.00"))
    numero_parcialidad = Column(Integer, default=1)
