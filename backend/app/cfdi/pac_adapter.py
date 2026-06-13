"""
Balance OS — PAC Adapter Interface
====================================
Interfaz común para Proveedores Autorizados de Certificación (PAC).

PACs soportados:
  - Facturaxion (producción)
  - SW SAPS (producción)
  - Finkok (producción)

Para activar un PAC, configurar en backend/.env:
  PAC_PROVIDER=facturaxion
  PAC_API_KEY=...
  PAC_API_SECRET=...
  PAC_ACCOUNT=...   # RFC o cuenta según PAC
"""
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Optional, Dict, Any
import os
import requests
from datetime import datetime


# ─── Config ───────────────────────────────────────

class PacConfig:
    """Configuración del PAC desde variables de entorno."""
    provider: str = os.getenv("PAC_PROVIDER", "mock")
    api_key: str = os.getenv("PAC_API_KEY", "")
    api_secret: str = os.getenv("PAC_API_SECRET", "")
    account: str = os.getenv("PAC_ACCOUNT", "")
    endpoint: str = ""

    @classmethod
    def cargar(cls) -> "PacConfig":
        cfg = cls()
        if cfg.provider == "facturaxion":
            cfg.endpoint = os.getenv(
                "PAC_ENDPOINT",
                "https://api.facturaxion.com/v1"
            )
        elif cfg.provider == "swsaps":
            cfg.endpoint = "https://facturacion.sw.com.mx/api"
        elif cfg.provider == "finkok":
            cfg.endpoint = "https://api.finkok.com/servicios"
        return cfg


# ─── Interfaz ─────────────────────────────────────

class PacAdapter(ABC):
    """Clase base para integración con PAC."""

    @abstractmethod
    def timbrar(self, xml: str, csd_pem: str, llave_pem: str, contrasena: str) -> Dict[str, Any]:
        """Timbra un CFDI XML y devuelve UUID + XML timbrado."""
        ...

    @abstractmethod
    def cancelar(self, uuid: str, rfc_emisor: str, csd_pem: str, llave_pem: str, contrasena: str) -> Dict[str, Any]:
        """Cancela un CFDI por UUID."""
        ...

    @classmethod
    def crear(cls) -> "PacAdapter":
        """Factory: crea el adapter según configuración."""
        cfg = PacConfig.cargar()
        if cfg.provider == "facturaxion":
            return FacturaxionAdapter(cfg)
        elif cfg.provider == "swsaps":
            return SwSapsAdapter(cfg)
        elif cfg.provider == "finkok":
            return FinkokAdapter(cfg)
        else:
            return MockAdapter(cfg)


# ─── Mock (desarrollo) ────────────────────────────

class MockAdapter(PacAdapter):
    def __init__(self, cfg: PacConfig):
        self.cfg = cfg

    def timbrar(self, xml: str, **kwargs) -> Dict[str, Any]:
        import hashlib, uuid
        uuid_str = str(uuid.uuid4()).upper()
        hash_sello = hashlib.sha256(xml.encode()).hexdigest().upper()
        return {
            "success": True,
            "uuid": uuid_str,
            "xml_timbrado": xml.replace(
                "</cfdi:Comprobante>",
                f"<tfd:TimbreFiscalDigital UUID=\"{uuid_str}\" SelloCFD=\"{hash_sello[:100]}\"/></cfdi:Comprobante>"
            ),
            "cadena_original": "MOCK-CADENA",
            "no_certificado_sat": "MOCK-SAT-CERT",
            "fecha_timbrado": datetime.utcnow().isoformat(),
            "pac_provider": "mock",
        }

    def cancelar(self, uuid: str, **kwargs) -> Dict[str, Any]:
        return {"success": True, "uuid": uuid, "estatus": "cancelado", "acuse": "<xml>MOCK</xml>"}


# ─── Facturaxion ──────────────────────────────────

class FacturaxionAdapter(PacAdapter):
    """Integración con Facturaxion PAC.
    
    Documentación: https://docs.facturaxion.com/
    Planes: https://www.facturaxion.com/planes
    """
    def __init__(self, cfg: PacConfig):
        self.cfg = cfg
        self.api_url = cfg.endpoint
        self.headers = {
            "X-API-Key": cfg.api_key,
            "X-API-Secret": cfg.api_secret,
            "Content-Type": "application/xml",
        }

    def timbrar(self, xml: str, csd_pem: str = "", llave_pem: str = "", contrasena: str = "") -> Dict[str, Any]:
        """Timbra CFDI vía Facturaxion API."""
        if not self.cfg.api_key or self.cfg.api_key == "":
            raise RuntimeError(
                "PAC Facturaxion no configurado. "
                "Configura PAC_API_KEY y PAC_API_SECRET en .env, "
                "o usa PAC_PROVIDER=mock para desarrollo."
            )

        payload = {
            "xml": xml,
            "certificado": csd_pem,
            "llave": llave_pem,
            "contrasena": contrasena,
        }
        resp = requests.post(
            f"{self.api_url}/cfdi/timbrar",
            headers=self.headers,
            json=payload,
            timeout=30,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Facturaxion error {resp.status_code}: {resp.text}")

        data = resp.json()
        return {
            "success": True,
            "uuid": data.get("uuid", ""),
            "xml_timbrado": data.get("xml", ""),
            "cadena_original": data.get("cadena_original", ""),
            "no_certificado_sat": data.get("no_certificado_sat", ""),
            "fecha_timbrado": data.get("fecha_timbrado", datetime.utcnow().isoformat()),
            "pac_provider": "facturaxion",
        }

    def cancelar(self, uuid: str, rfc_emisor: str, csd_pem: str = "", llave_pem: str = "", contrasena: str = "") -> Dict[str, Any]:
        if not self.cfg.api_key:
            raise RuntimeError("PAC Facturaxion no configurado")

        resp = requests.post(
            f"{self.api_url}/cfdi/cancelar",
            headers=self.headers,
            json={
                "uuid": uuid,
                "rfc_emisor": rfc_emisor,
                "certificado": csd_pem,
                "llave": llave_pem,
                "contrasena": contrasena,
            },
            timeout=30,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Facturaxion cancel error: {resp.text}")
        return {"success": True, "uuid": uuid, "estatus": "cancelado", "acuse": resp.text}


# ─── SW SAPS ──────────────────────────────────────

class SwSapsAdapter(PacAdapter):
    """Integración con SW SAPS (Soluciones Web SAPS)."""
    def __init__(self, cfg: PacConfig):
        self.cfg = cfg
        self.api_url = cfg.endpoint

    def timbrar(self, xml: str, **kwargs) -> Dict[str, Any]:
        if not self.cfg.api_key:
            raise RuntimeError("PAC SW SAPS no configurado. Configura PAC_API_KEY.")
        resp = requests.post(
            f"{self.api_url}/timbrar",
            headers={"Authorization": f"Bearer {self.cfg.api_key}"},
            json={"xml": xml},
            timeout=30,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"SW SAPS error: {resp.text}")
        data = resp.json()
        return {
            "success": True,
            "uuid": data.get("UUID", ""),
            "xml_timbrado": data.get("xmlTimbrado", ""),
            "pac_provider": "swsaps",
        }

    def cancelar(self, uuid: str, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError("Cancelación SW SAPS pendiente de implementar")


# ─── Finkok ────────────────────────────────────────

class FinkokAdapter(PacAdapter):
    """Integración con Finkok PAC."""
    def __init__(self, cfg: PacConfig):
        self.cfg = cfg
        self.api_url = cfg.endpoint

    def timbrar(self, xml: str, **kwargs) -> Dict[str, Any]:
        if not self.cfg.api_key:
            raise RuntimeError("PAC Finkok no configurado")
        resp = requests.post(
            f"{self.api_url}/stamp",
            headers={"Authorization": f"Bearer {self.cfg.api_key}"},
            data=xml,
            timeout=30,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Finkok error: {resp.text}")
        return {"success": True, "uuid": resp.json().get("UUID", ""), "pac_provider": "finkok"}

    def cancelar(self, uuid: str, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError("Cancelación Finkok pendiente de implementar")
