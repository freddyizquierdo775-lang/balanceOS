"""
Balance OS — Modelos CRM: Seguimientos y Notas
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Seguimiento(Base):
    """Seguimiento / tarea asociada a un cliente."""

    __tablename__ = "seguimientos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    tipo = Column(String(30), default="general")  # general, imss, fiscal, nomina, juridico
    prioridad = Column(String(20), default="media")  # alta, media, baja
    estado = Column(String(20), default="pendiente")  # pendiente, en_proceso, completado, cancelado
    fecha_limite = Column(DateTime, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cliente = relationship("Cliente")
    usuario = relationship("Usuario")


class Nota(Base):
    """Nota interna asociada a un cliente."""

    __tablename__ = "notas"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True, index=True)
    titulo = Column(String(200), nullable=False)
    contenido = Column(Text, nullable=True)
    modulo_origen = Column(String(50), nullable=True)  # modulo que generó la nota
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cliente = relationship("Cliente")
    usuario = relationship("Usuario")
