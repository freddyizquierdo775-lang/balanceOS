"""
Balance OS — Router de Email
Endpoints para prueba y verificación de configuración SMTP.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.routers.auth import verificar_usuario_actual
from app.models import Usuario
from app.services.email_service import send_email
from app.config import SMTP_PASSWORD, SMTP_HOST, SMTP_PORT, SMTP_FROM

router = APIRouter(prefix="/email", tags=["email"])


class EmailTestRequest(BaseModel):
    subject: str
    message: str


@router.post("/test")
async def email_test(
    body: EmailTestRequest,
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Envía un email de prueba al email del usuario autenticado (solo admin)."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol admin")

    if not usuario.email:
        raise HTTPException(status_code=400, detail="El usuario no tiene email registrado")

    # Usamos el template de alerta con el mensaje recibido
    from datetime import datetime

    success = await send_email(
        to_email=usuario.email,
        subject=body.subject,
        template_name="alerta.html",
        context={
            "titulo": body.subject,
            "mensaje": body.message,
            "timestamp": datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC"),
        },
    )

    if success:
        return {
            "status": "ok",
            "message": f"Email de prueba enviado a {usuario.email}",
        }
    else:
        raise HTTPException(status_code=500, detail="Error al enviar el email de prueba")


@router.get("/config")
async def email_config(
    usuario: Usuario = Depends(verificar_usuario_actual),
):
    """Retorna el estado de la configuración SMTP (solo admin)."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol admin")

    return {
        "configurado": bool(SMTP_PASSWORD),
        "host": SMTP_HOST,
        "puerto": SMTP_PORT,
        "remitente": SMTP_FROM,
        "modo": "produccion" if SMTP_PASSWORD else "dev (consola)",
    }
