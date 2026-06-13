"""
Balance OS — Modelos de Tesorería y Alertas EFOS
"""
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum, Boolean, Numeric
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class TipoCuentaBanco(str, enum.Enum):
    CHEQUES = "cheques"
    AHORRO = "ahorro"
    INVERSION = "inversion"


class CuentaBancaria(Base):
    __tablename__ = "cuentas_bancarias"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    banco = Column(String(100), nullable=False)
    numero_cuenta = Column(String(30), nullable=False)
    clabe = Column(String(18), nullable=True)
    tipo = Column(SAEnum(TipoCuentaBanco), default=TipoCuentaBanco.CHEQUES)
    saldo_inicial = Column(Numeric(14, 2), default=Decimal("0.00"))
    saldo_actual = Column(Numeric(14, 2), default=Decimal("0.00"))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class MovimientoBancario(Base):
    __tablename__ = "movimientos_bancarios"

    id = Column(Integer, primary_key=True, index=True)
    cuenta_id = Column(Integer, ForeignKey("cuentas_bancarias.id"), nullable=False, index=True)
    fecha = Column(DateTime, nullable=False)
    tipo = Column(String(10), nullable=False)  # cargo / abono
    concepto = Column(String(500), nullable=False)
    monto = Column(Numeric(14, 2), nullable=False)
    referencia = Column(String(100), nullable=True)
    poliza_id = Column(Integer, ForeignKey("polizas.id"), nullable=True, index=True)
    conciliado = Column(Boolean, default=False)
    fecha_conciliacion = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cuenta = relationship("CuentaBancaria", backref="movimientos")


class ConciliacionBancaria(Base):
    __tablename__ = "conciliaciones_bancarias"

    id = Column(Integer, primary_key=True, index=True)
    cuenta_id = Column(Integer, ForeignKey("cuentas_bancarias.id"), nullable=False)
    periodo_mes = Column(Integer, nullable=False)
    periodo_anio = Column(Integer, nullable=False)
    saldo_estado_cuenta = Column(Numeric(14, 2), default=Decimal("0.00"))
    saldo_sistema = Column(Numeric(14, 2), default=Decimal("0.00"))
    diferencia = Column(Numeric(14, 2), default=Decimal("0.00"))
    conciliado = Column(Boolean, default=False)
    fecha_conciliacion = Column(DateTime, nullable=True)
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# --- Alertas EFOS ---
class ListaEfos(Base):
    __tablename__ = "listas_efos"

    id = Column(Integer, primary_key=True, index=True)
    rfc = Column(String(13), nullable=False, index=True)
    tipo_lista = Column(String(20), nullable=False)  # "69", "69-B", "definitivos", "sentencias"
    fecha_publicacion = Column(DateTime, nullable=True)
    fecha_consulta = Column(DateTime, default=datetime.utcnow)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AlertaEfos(Base):
    __tablename__ = "alertas_efos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    lista_id = Column(Integer, ForeignKey("listas_efos.id"), nullable=True)
    rfc = Column(String(13), nullable=False)
    tipo_lista = Column(String(20), nullable=False)
    fecha_alerta = Column(DateTime, default=datetime.utcnow)
    resuelto = Column(Boolean, default=False)
    fecha_resolucion = Column(DateTime, nullable=True)
