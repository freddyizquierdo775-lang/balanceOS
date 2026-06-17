"""
Balance OS — Motor de Eventos Centralizado

Emite eventos a la tabla `eventos` para trazabilidad y timeline.
Otros módulos pueden escuchar eventos suscribiéndose a este motor.
"""
from app.models.eventos import Evento
from app.database import async_session
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# ─── Email integration ────────────────────────────

try:
    from app.services.email_service import send_email
except ImportError:
    send_email = None
    logger.warning("email_service no disponible — notificaciones por email deshabilitadas")

# ─── Listeners (extensibles) ───────────────────────

_listeners: list = []


def registrar_listener(listener):
    """Registra una función callback que será invocada en cada evento emitido.

    La función debe ser async y recibir el objeto Evento ya persistido.
    """
    _listeners.append(listener)


# ─── Email automático ─────────────────────────────

async def _enviar_email_evento(evento):
    """Envía email automático según el tipo de evento, si el servicio está disponible."""
    if send_email is None:
        return

    try:
        metadata = evento.metadata_json or {}

        # Usuario registrado → welcome
        if evento.entidad == "usuario" and evento.accion == "registrado":
            to_email = metadata.get("email")
            if to_email:
                await send_email(
                    to_email=to_email,
                    subject="¡Bienvenido a Balance OS!",
                    template_name="welcome.html",
                    context={"nombre": metadata.get("nombre", "Usuario")},
                )

        # Factura emitida → factura
        elif evento.entidad == "factura" and evento.accion == "emitida":
            to_email = metadata.get("email")
            if to_email:
                await send_email(
                    to_email=to_email,
                    subject=f"Factura {metadata.get('folio', 'N/A')} emitida",
                    template_name="factura.html",
                    context={
                        "folio": metadata.get("folio", "N/A"),
                        "cliente": metadata.get("cliente", "Cliente"),
                        "total": metadata.get("total", "$0.00"),
                        "fecha": metadata.get("fecha", ""),
                        "descarga_url": metadata.get("descarga_url", "#"),
                    },
                )

    except Exception as e:
        logger.warning(f"Error al enviar email automático para evento {evento.id}: {e}")


# ─── Emisión ───────────────────────────────────────


async def emitir_evento(
    entidad: str,
    entidad_id: int,
    accion: str,
    estado_anterior: str = None,
    estado_nuevo: str = None,
    descripcion: str = None,
    metadata_json: dict = None,
    usuario_id: int = None,
):
    """Emite un evento al motor centralizado y lo persiste en DB.

    Args:
        entidad: Tipo de entidad ('cliente', 'nomina', 'finiquito', 'factura', etc.)
        entidad_id: ID de la entidad afectada
        accion: Acción realizada ('creado', 'actualizado', 'eliminado', 'completado', etc.)
        estado_anterior: Estado previo (opcional)
        estado_nuevo: Nuevo estado (opcional)
        descripcion: Texto descriptivo legible
        metadata_json: Diccionario con datos extra
        usuario_id: ID del usuario que realizó la acción
    """
    try:
        async with async_session() as session:
            evento = Evento(
                entidad=entidad,
                entidad_id=entidad_id,
                accion=accion,
                estado_anterior=estado_anterior,
                estado_nuevo=estado_nuevo,
                descripcion=descripcion,
                metadata_json=metadata_json,
                usuario_id=usuario_id,
                created_at=datetime.utcnow(),
            )
            session.add(evento)
            await session.commit()

        # ─── Email automático ──────────────────────────
        await _enviar_email_evento(evento)

        # Notificar listeners (fire-and-forget, no bloquea al emisor)
        for listener in _listeners:
            try:
                await listener(evento)
            except Exception as e:
                logger.warning(f"Listener falló al procesar evento {evento.id}: {e}")

    except Exception as e:
        logger.error(f"Error al emitir evento: {e}")
