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


class RiesgoTrabajo(Base):
    """Riesgo de trabajo — seguimiento de calificación IMSS con documentos."""

    __tablename__ = "imss_riesgos_trabajo"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    despacho_id = Column(Integer, ForeignKey("despachos.id"), nullable=True, index=True)

    # Report info
    fecha_reporte = Column(DateTime, nullable=False, default=datetime.utcnow)
    tipo_riesgo = Column(String(50), default="accidente")
    descripcion = Column(Text, nullable=True)

    # Status lifecycle
    estatus = Column(String(20), default="pendiente")  # pendiente, en_calificacion, calificado, rechazado

    # Documents
    documento_inicial_path = Column(String(500), nullable=True)      # ST-7 / aviso
    documento_calificado_path = Column(String(500), nullable=True)   # dictamen IMSS

    # Tracking
    fecha_calificacion = Column(DateTime, nullable=True)
    dictamen = Column(Text, nullable=True)

    notas = Column(Text, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    empleado = relationship("Empleado")
    cliente = relationship("Cliente")
    usuario = relationship("Usuario")


class DocumentoOficial(Base):
    """Documento oficial IMSS (AFIL-xx, ST-x) vinculado polimórficamente."""

    __tablename__ = "documentos_oficiales"

    id = Column(Integer, primary_key=True, index=True)
    entidad = Column(String(30), nullable=False, index=True)
    entidad_id = Column(Integer, nullable=False, index=True)
    despacho_id = Column(Integer, ForeignKey("despachos.id"), nullable=True, index=True)

    tipo_formato = Column(String(10), nullable=False)  # afil-02, afil-03, afil-04, st-7, st-2, st-3
    version = Column(String(20), default="generado")   # generado, firmado, acuse
    archivo_path = Column(String(500), nullable=True)

    notas = Column(Text, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario")
