"""
Balance OS — Modelo de Despacho (Multi-tenancy)
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, func
from app.database import Base


class Despacho(Base):
    __tablename__ = "despachos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(200), unique=True, nullable=False)
    rfc = Column(String(13), nullable=True)
    email = Column(String(200), nullable=True)
    plan = Column(String(20), default="starter")  # starter, pro, enterprise
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
