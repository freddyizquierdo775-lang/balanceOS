"""
Balance OS — Servicio de Email
Envía emails HTML usando aiosmtplib + Jinja2.
En modo dev (sin SMTP_PASSWORD) loguea en consola.
"""
import logging
from pathlib import Path
from typing import Optional

import aiosmtplib
from jinja2 import Environment, FileSystemLoader

from app.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM,
    SMTP_FROM_NAME,
)

logger = logging.getLogger(__name__)

# ─── Jinja2 ────────────────────────────────────────

TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "email"

_jinja_env: Optional[Environment] = None


def _get_jinja_env() -> Environment:
    global _jinja_env
    if _jinja_env is None:
        if TEMPLATES_DIR.is_dir():
            _jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
        else:
            _jinja_env = Environment(loader=FileSystemLoader("."))
            logger.warning(f"Directorio de templates no encontrado: {TEMPLATES_DIR}")
    return _jinja_env


# ─── Envío ─────────────────────────────────────────


async def send_email(
    to_email: str,
    subject: str,
    template_name: str,
    context: dict = None,
) -> bool:
    """Envía un email HTML usando el template indicado.

    Args:
        to_email: Dirección de correo del destinatario
        subject: Asunto del correo
        template_name: Nombre del archivo de template (ej: 'welcome.html')
        context: Diccionario con variables para el template

    Returns:
        True si se envió correctamente (o se logueó en modo dev), False si hubo error.
    """
    if context is None:
        context = {}

    # Renderizar template
    try:
        env = _get_jinja_env()
        template = env.get_template(template_name)
        html_body = template.render(**context)
    except Exception as e:
        logger.error(f"Error al renderizar template '{template_name}': {e}")
        return False

    # Construir mensaje
    message = aiosmtplib.EmailMessage()
    message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content("Tu cliente de correo no soporta HTML.")
    message.add_alternative(html_body, subtype="html")

    # Modo dev: si no hay SMTP_PASSWORD, loguear en consola
    if not SMTP_PASSWORD:
        logger.info("=" * 60)
        logger.info(f"[MODO DEV] Email NO enviado (SMTP_PASSWORD vacío)")
        logger.info(f"  Para:    {to_email}")
        logger.info(f"  Asunto:  {subject}")
        logger.info(f"  Template: {template_name}")
        logger.info(f"  Context:  {context}")
        logger.info("=" * 60)
        return True

    # Modo producción: enviar vía SMTP
    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info(f"Email enviado a {to_email} — asunto: '{subject}'")
        return True
    except Exception as e:
        logger.error(f"Error al enviar email a {to_email}: {e}")
        return False
