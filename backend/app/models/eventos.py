"""
Balance OS — Modelo de Eventos (Event Sourcing ligero)
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Evento(Base):
    """Registro de eventos del sistema para trazabilidad y timeline."""

    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, index=True)
    entidad = Column(String(50), nullable=False, index=True)  # 'cliente', 'nomina', 'finiquito', 'factura', etc.
    entidad_id = Column(Integer, nullable=False, index=True)
    accion = Column(String(50), nullable=False)  # 'creado', 'actualizado', 'eliminado', 'completado', etc.
    estado_anterior = Column(String(50), nullable=True)
    estado_nuevo = Column(String(50), nullable=True)
    descripcion = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)  # datos extra
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    usuario = relationship("Usuario")
