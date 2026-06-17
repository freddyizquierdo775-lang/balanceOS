"""
Balance OS — Router de Stripe (Planes, Checkout, Webhook, Portal, Cancelación)
"""
import json
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Usuario, Plan, Subscription
from app.routers.auth import verificar_usuario_actual
from app.config import (
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_STARTER,
    STRIPE_PRICE_PRO,
    STRIPE_PRICE_ENTERPRISE,
)

router = APIRouter(prefix="/stripe", tags=["stripe"])

# ─── Inicializar Stripe (si hay API key) ─────────
_stripe = None
if STRIPE_SECRET_KEY:
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        _stripe = stripe
    except ImportError:
        pass


# ─── Planes hardcodeados (precios en MXN) ────────

PLANES = [
    {
        "id": "starter",
        "stripe_price_id": STRIPE_PRICE_STARTER,
        "nombre": "Starter",
        "descripcion": "Ideal para emprendedores y pequeños negocios que inician con la gestión fiscal.",
        "precio_mxn": 29,
        "precio_mxn_aprox": 499,  # ~$499 MXN
        "clientes": 3,
        "nominas_mes": 10,
        "soporte": "Email",
        "features": [
            "Hasta 3 clientes activos",
            "10 nóminas por mes",
            "Soporte por email",
            "Dashboard básico",
            "Contabilidad electrónica",
            "Facturación CFDI 4.0 básica",
        ],
    },
    {
        "id": "pro",
        "stripe_price_id": STRIPE_PRICE_PRO,
        "nombre": "Pro",
        "descripcion": "Para despachos contables y fiscalistas con volumen medio de operaciones.",
        "precio_mxn": 79,
        "precio_mxn_aprox": 1399,  # ~$1,399 MXN
        "clientes": "ilimitados",
        "nominas_mes": 100,
        "soporte": "Prioritario (chat + email)",
        "features": [
            "Clientes ilimitados",
            "100 nóminas por mes",
            "Soporte prioritario",
            "API access",
            "IMSS, REPSE, PLD completos",
            "Estados financieros avanzados",
            "Alertas EFOS",
        ],
    },
    {
        "id": "enterprise",
        "stripe_price_id": STRIPE_PRICE_ENTERPRISE,
        "nombre": "Enterprise",
        "descripcion": "Solución personalizada para firmas grandes, corporativos y necesidades a medida.",
        "precio_mxn": None,  # Contactar
        "precio_mxn_aprox": None,
        "clientes": "ilimitados",
        "nominas_mes": "ilimitadas",
        "soporte": "Dedicado 24/7 + SLA",
        "features": [
            "Todo ilimitado",
            "Soporte dedicado 24/7",
            "SLA garantizado",
            "Onboarding personalizado",
            "Integraciones a medida",
            "API dedicada",
            "Reportes custom",
            "Múltiples usuarios",
        ],
    },
]


# ─── Schemas ──────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan_id: str


# ─── GET /stripe/plans ────────────────────────────

@router.get("/plans")
async def listar_planes():
    """Retorna la lista de planes disponibles con precios en MXN."""
    return PLANES


# ─── POST /stripe/create-checkout ─────────────────

@router.post("/create-checkout")
async def crear_checkout(
    data: CheckoutRequest,
    usuario: Usuario = Depends(verificar_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """
    Crea una sesión de checkout de Stripe y retorna la URL de pago.
    Si STRIPE_SECRET_KEY no está configurada, opera en modo mock.
    """
    plan = next((p for p in PLANES if p["id"] == data.plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    if plan["id"] == "enterprise":
        return {"url": "/contacto-ventas", "mode": "enterprise"}

    # ─── Modo mock (sin Stripe configurado) ────────
    if not STRIPE_SECRET_KEY or not _stripe:
        # Crear/actualizar suscripción mock en BD
        return await _mock_checkout(usuario, plan, db)

    # ─── Modo real: Stripe Checkout Session ────────
    try:
        # Buscar o crear customer en Stripe
        result = await db.execute(
            select(Subscription).where(Subscription.usuario_id == usuario.id)
        )
        sub = result.scalar_one_or_none()

        if sub and sub.stripe_customer_id:
            customer_id = sub.stripe_customer_id
        else:
            customer = _stripe.Customer.create(
                email=usuario.email,
                name=usuario.nombre,
                metadata={"usuario_id": str(usuario.id)},
            )
            customer_id = customer.id

        success_url = os.getenv("FRONTEND_URL", "http://localhost:5173") + "/dashboard?checkout=success"
        cancel_url = os.getenv("FRONTEND_URL", "http://localhost:5173") + "/pricing?checkout=canceled"

        session = _stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": plan["stripe_price_id"],
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "usuario_id": str(usuario.id),
                "plan_id": plan["id"],
            },
        )

        # Guardar stripe_customer_id en BD
        if not sub:
            sub = Subscription(
                usuario_id=usuario.id,
                stripe_customer_id=customer_id,
                status="pending",
            )
            db.add(sub)
        else:
            sub.stripe_customer_id = customer_id
            sub.status = "pending"
        await db.commit()

        return {"url": session.url}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear checkout: {str(e)}")


async def _mock_checkout(usuario, plan, db):
    """Modo desarrollo: checkout simulado sin Stripe."""

    result = await db.execute(
        select(Subscription).where(Subscription.usuario_id == usuario.id)
    )
    sub = result.scalar_one_or_none()

    now = datetime.utcnow()
    period_end = datetime(now.year, now.month + 1, now.day) if now.month < 12 else datetime(now.year + 1, 1, now.day)

    if not sub:
        sub = Subscription(
            usuario_id=usuario.id,
            stripe_subscription_id=f"mock_sub_{usuario.id}",
            stripe_customer_id=f"mock_cus_{usuario.id}",
            plan_id=None,
            status="active",
            current_period_end=period_end,
        )
        db.add(sub)
    else:
        sub.stripe_subscription_id = f"mock_sub_{usuario.id}"
        sub.stripe_customer_id = f"mock_cus_{usuario.id}"
        sub.status = "active"
        sub.current_period_end = period_end

    await db.commit()

    mock_url = f"/dashboard?checkout=success&mock=true&plan={plan['id']}"
    return {"url": mock_url, "mode": "mock"}


# ─── POST /stripe/webhook ─────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Recibe eventos de Stripe (webhook).
    Maneja: checkout.session.completed, customer.subscription.updated,
    customer.subscription.deleted.
    En modo dev (sin STRIPE_WEBHOOK_SECRET), acepta sin verificar firma.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if STRIPE_WEBHOOK_SECRET and _stripe and sig_header:
        try:
            event = _stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Firma inválida: {str(e)}")
    else:
        # Modo dev: aceptar sin verificar
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Payload inválido")

    event_type = event.get("type", "")
    event_data = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(event_data, db)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(event_data, db)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(event_data, db)

    return {"status": "ok"}


async def _handle_checkout_completed(session_data: dict, db: AsyncSession):
    """Crea/actualiza la suscripción cuando el checkout se completa."""
    usuario_id = session_data.get("metadata", {}).get("usuario_id")
    customer_id = session_data.get("customer")
    subscription_id = session_data.get("subscription")

    if not usuario_id:
        return

    result = await db.execute(
        select(Subscription).where(Subscription.usuario_id == int(usuario_id))
    )
    sub = result.scalar_one_or_none()

    if not sub:
        sub = Subscription(usuario_id=int(usuario_id))
        db.add(sub)

    sub.stripe_customer_id = customer_id
    sub.stripe_subscription_id = subscription_id
    sub.status = "active"
    await db.commit()


async def _handle_subscription_updated(sub_data: dict, db: AsyncSession):
    """Actualiza el estado de la suscripción desde Stripe."""
    subscription_id = sub_data.get("id")
    if not subscription_id:
        return

    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == subscription_id
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return

    sub.status = sub_data.get("status", sub.status)
    if sub_data.get("current_period_end"):
        sub.current_period_end = datetime.utcfromtimestamp(
            sub_data["current_period_end"]
        )
    await db.commit()


async def _handle_subscription_deleted(sub_data: dict, db: AsyncSession):
    """Marca la suscripción como cancelada."""
    subscription_id = sub_data.get("id")
    if not subscription_id:
        return

    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == subscription_id
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = "canceled"
        await db.commit()


# ─── GET /stripe/subscription ─────────────────────

@router.get("/subscription")
async def obtener_subscription(
    usuario: Usuario = Depends(verificar_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """Retorna la suscripción actual del usuario autenticado."""
    result = await db.execute(
        select(Subscription).where(Subscription.usuario_id == usuario.id)
    )
    sub = result.scalar_one_or_none()

    if not sub or sub.status in ("inactive", "canceled"):
        return {"active": False}

    # Buscar info del plan
    plan_info = None
    plan = None
    if sub.plan_id:
        plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
        plan = plan_result.scalar_one_or_none()

    # Intentar matchear por stripe_price_id si hay sub de Stripe
    if sub.stripe_subscription_id and STRIPE_SECRET_KEY and _stripe:
        try:
            stripe_sub = _stripe.Subscription.retrieve(sub.stripe_subscription_id)
            plan_info = {
                "id": stripe_sub.get("id"),
                "status": stripe_sub.get("status"),
                "current_period_end": stripe_sub.get("current_period_end"),
            }
        except Exception:
            pass

    return {
        "active": sub.status in ("active", "trialing", "past_due"),
        "status": sub.status,
        "plan": {
            "id": plan.id if plan else None,
            "nombre": plan.nombre if plan else "Plan",
        } if plan else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "stripe_subscription_id": sub.stripe_subscription_id,
    }


# ─── GET /stripe/portal ───────────────────────────

@router.get("/portal")
async def portal_clientes(
    usuario: Usuario = Depends(verificar_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """
    Crea una sesión del Customer Portal de Stripe y retorna la URL.
    """
    result = await db.execute(
        select(Subscription).where(Subscription.usuario_id == usuario.id)
    )
    sub = result.scalar_one_or_none()

    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No tienes una suscripción activa")

    # ─── Modo mock ──────────────────────────────────
    if not STRIPE_SECRET_KEY or not _stripe:
        return {"url": "/dashboard?portal=mock"}

    try:
        return_url = os.getenv("FRONTEND_URL", "http://localhost:5173") + "/dashboard"

        session = _stripe.billing_portal.Session.create(
            customer=sub.stripe_customer_id,
            return_url=return_url,
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear portal: {str(e)}")


# ─── POST /stripe/cancel ──────────────────────────

@router.post("/cancel")
async def cancelar_subscription(
    usuario: Usuario = Depends(verificar_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """Cancela la suscripción del usuario en Stripe."""
    result = await db.execute(
        select(Subscription).where(Subscription.usuario_id == usuario.id)
    )
    sub = result.scalar_one_or_none()

    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No tienes una suscripción activa")

    # ─── Modo mock ──────────────────────────────────
    if not STRIPE_SECRET_KEY or not _stripe:
        sub.status = "canceled"
        await db.commit()
        return {"status": "canceled", "mode": "mock"}

    try:
        _stripe.Subscription.delete(sub.stripe_subscription_id)
        sub.status = "canceled"
        await db.commit()
        return {"status": "canceled"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al cancelar: {str(e)}")
