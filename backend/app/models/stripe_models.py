"""
Balance OS — Modelos de Stripe (Planes y Suscripciones)
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Plan(Base):
    __tablename__ = "stripe_planes"

    id = Column(Integer, primary_key=True, index=True)
    stripe_price_id = Column(String(100), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(500))
    precio_mxn = Column(Integer, nullable=False)  # Precio en pesos MXN (entero)
    features = Column(JSON, default=list)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "stripe_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    stripe_subscription_id = Column(String(100), unique=True, nullable=True)
    stripe_customer_id = Column(String(100), unique=True, nullable=True)
    plan_id = Column(Integer, ForeignKey("stripe_planes.id"), nullable=True)
    status = Column(String(50), default="inactive")  # active, trialing, past_due, canceled, inactive
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    usuario = relationship("Usuario")
    plan = relationship("Plan")
