"""
Balance OS — Modelos de Impuestos
"""
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum, Boolean, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class TipoDeclaracion(str, enum.Enum):
    MENSUAL = "mensual"
    ANUAL = "anual"

class TipoConcepto(str, enum.Enum):
    INGRESO = "ingreso"
    DEDUCCION = "deduccion"
    IVA_ACREDITABLE = "iva_acreditable"
    IVA_TRASLADADO = "iva_trasladado"
    ISR_RETENIDO = "isr_retenido"
    IVA_RETENIDO = "iva_retenido"


class Declaracion(Base):
    __tablename__ = "declaraciones"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    tipo = Column(SAEnum(TipoDeclaracion), nullable=False)
    periodo_mes = Column(Integer, nullable=False)
    periodo_anio = Column(Integer, nullable=False)
    fecha_presentacion = Column(DateTime, nullable=True)
    estatus = Column(String(20), default="pendiente")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("cliente_id", "tipo", "periodo_mes", "periodo_anio", name="uq_declaracion"),)
    conceptos = relationship("DeclaracionConcepto", backref="declaracion", cascade="all, delete-orphan")


class DeclaracionConcepto(Base):
    __tablename__ = "declaraciones_conceptos"

    id = Column(Integer, primary_key=True, index=True)
    declaracion_id = Column(Integer, ForeignKey("declaraciones.id"), nullable=False)
    tipo = Column(SAEnum(TipoConcepto), nullable=False)
    concepto = Column(String(200), nullable=False)
    monto = Column(Numeric(14, 2), default=Decimal("0.00"))
    base = Column(Numeric(14, 2), default=Decimal("0.00"))
    tasa = Column(Numeric(6, 4), default=Decimal("0.00"))
    impuesto = Column(Numeric(14, 2), default=Decimal("0.00"))


class ConfiguracionDiot(Base):
    __tablename__ = "config_diot"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    periodo_mes = Column(Integer, nullable=False)
    periodo_anio = Column(Integer, nullable=False)
    iva_acreditable = Column(Numeric(14, 2), default=Decimal("0.00"))
    iva_trasladado = Column(Numeric(14, 2), default=Decimal("0.00"))
    iva_por_acreditar = Column(Numeric(14, 2), default=Decimal("0.00"))
    generated_at = Column(DateTime, default=datetime.utcnow)
