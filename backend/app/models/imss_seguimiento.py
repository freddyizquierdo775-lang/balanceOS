"""
Balance OS — Modelos de Seguimiento IMSS
Altas, Bajas, Trámites y Riesgos de Trabajo
"""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base


# ─── Enums ────────────────────────────────────────

class TipoMovimiento(str, enum.Enum):
    ALTA = "alta"
    REINGRESO = "reingreso"


class EstatusTramite(str, enum.Enum):
    PENDIENTE = "pendiente"
    EN_PROCESO = "en_proceso"
    COMPLETADO = "completado"
    RECHAZADO = "rechazado"


class MotivoBaja(str, enum.Enum):
    RENUNCIA = "renuncia"
    DESPIDO = "despido"
    FIN_CONTRATO = "fin_contrato"
    OTRO = "otro"


class TipoTramite(str, enum.Enum):
    RIESGO_TRABAJO = "riesgo_trabajo"
    MODIFICACION_SALARIO = "modificacion_salario"
    RECTIFICACION = "rectificacion"
    ACLARACION = "aclaracion"
    OTRO = "otro"


# ─── Modelos ──────────────────────────────────────

class ImssAlta(Base):
    """Solicitud de alta o reingreso de un trabajador ante el IMSS."""

    __tablename__ = "imss_altas"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    fecha_solicitud = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_efectiva = Column(DateTime, nullable=True)
    nss = Column(String(11), nullable=True)
    tipo_movimiento = Column(SAEnum(TipoMovimiento), default=TipoMovimiento.ALTA)
    estatus = Column(SAEnum(EstatusTramite), default=EstatusTramite.PENDIENTE)
    notas = Column(Text, nullable=True)
    acuse_path = Column(String(500), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empleado = relationship("Empleado")
    cliente = relationship("Cliente")
    usuario = relationship("Usuario")


class ImssBaja(Base):
    """Solicitud de baja de un trabajador ante el IMSS."""

    __tablename__ = "imss_bajas"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    fecha_solicitud = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_baja = Column(DateTime, nullable=True)
    motivo = Column(SAEnum(MotivoBaja), default=MotivoBaja.RENUNCIA)
    estatus = Column(SAEnum(EstatusTramite), default=EstatusTramite.PENDIENTE)
    notas = Column(Text, nullable=True)
    acuse_path = Column(String(500), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empleado = relationship("Empleado")
    cliente = relationship("Cliente")
    usuario = relationship("Usuario")


class ImssTramite(Base):
    """Trámite general ante el IMSS (rectificaciones, aclaraciones, etc.)."""

    __tablename__ = "imss_tramites"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    tipo = Column(SAEnum(TipoTramite), default=TipoTramite.OTRO)
    descripcion = Column(Text, nullable=True)
    estatus = Column(SAEnum(EstatusTramite), default=EstatusTramite.PENDIENTE)
    fecha_inicio = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_resolucion = Column(DateTime, nullable=True)
    notas = Column(Text, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cliente = relationship("Cliente")
    usuario = relationship("Usuario")
