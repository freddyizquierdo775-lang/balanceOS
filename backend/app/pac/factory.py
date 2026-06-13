"""
Balance OS — PAC Factory
=========================
Factory function que devuelve el adapter según PAC_PROVIDER.
"""
import logging
from app.cfdi.pac_adapter import PacAdapter, PacConfig, MockAdapter

logger = logging.getLogger(__name__)


def get_pac_adapter() -> PacAdapter:
    """Devuelve el adapter PAC según configuración de entorno.

    Usa el factory PacAdapter.crear() del módulo cfdi para obtener
    el adapter correspondiente (mock, facturaxion, swsaps, finkok).
    """
    return PacAdapter.crear()
