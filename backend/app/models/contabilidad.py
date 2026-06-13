"""
Balance OS — Modelos de Contabilidad Electrónica
"""
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum, Boolean, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class TipoCuenta(str, enum.Enum):
    ACTIVO = "activo"
    PASIVO = "pasivo"
    CAPITAL = "capital"
    INGRESOS = "ingresos"
    COSTOS = "costos"
    GASTOS = "gastos"

class NaturalezaCuenta(str, enum.Enum):
    DEUDORA = "deudora"
    ACREEDORA = "acreedora"

class TipoPoliza(str, enum.Enum):
    DIARIO = "diario"
    INGRESOS = "ingresos"
    EGRESOS = "egresos"
    TRASLADO = "traslado"


class CuentaContable(Base):
    __tablename__ = "cuentas_contables"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    tipo = Column(SAEnum(TipoCuenta), nullable=False)
    nivel = Column(Integer, nullable=False, default=1)
    padre_id = Column(Integer, ForeignKey("cuentas_contables.id"), nullable=True)
    naturaleza = Column(SAEnum(NaturalezaCuenta), nullable=False)
    acepta_movimientos = Column(Boolean, default=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    padre = relationship("CuentaContable", remote_side=[id], backref="hijos")


class Poliza(Base):
    __tablename__ = "polizas"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(SAEnum(TipoPoliza), nullable=False)
    fecha = Column(DateTime, nullable=False)
    concepto = Column(Text, nullable=False)
    periodo_mes = Column(Integer, nullable=False)
    periodo_anio = Column(Integer, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    detalles = relationship("PolizaDetalle", backref="poliza", cascade="all, delete-orphan")


class PolizaDetalle(Base):
    __tablename__ = "polizas_detalles"

    id = Column(Integer, primary_key=True, index=True)
    poliza_id = Column(Integer, ForeignKey("polizas.id"), nullable=False)
    cuenta_id = Column(Integer, ForeignKey("cuentas_contables.id"), nullable=False)
    cargo = Column(Numeric(14, 2), default=Decimal("0.00"))
    abono = Column(Numeric(14, 2), default=Decimal("0.00"))
    referencia = Column(String(100), nullable=True)

    cuenta = relationship("CuentaContable")
