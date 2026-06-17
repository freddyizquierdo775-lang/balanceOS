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
import base64
import logging
import xml.etree.ElementTree as ET
import requests
from datetime import datetime

logger = logging.getLogger(__name__)


# ─── Config ───────────────────────────────────────

class PacConfig:
    """Configuración del PAC desde variables de entorno."""
    provider: str = os.getenv("PAC_PROVIDER", "mock")
    api_key: str = os.getenv("PAC_API_KEY", "")
    api_secret: str = os.getenv("PAC_API_SECRET", "")
    account: str = os.getenv("PAC_ACCOUNT", "")
    endpoint: str = ""
    sandbox: bool = False

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
            cfg.endpoint = "https://facturacion.finkok.com/servicios/soap"
            cfg.sandbox = os.getenv("FINKOK_SANDBOX", "true").lower() == "true"
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
    """Integración real con Finkok PAC vía SOAP.

    Documentación oficial SOAP de Finkok:
      - Endpoint producción: https://facturacion.finkok.com/servicios/soap/stamp
      - Métodos: stamp, stamped, cancel, quick_stamp
      - Auth: usuario (RFC emisor) + contraseña (Finkok password) en SOAP body
      - Input stamp: XML CFDI en base64 dentro del envelope
      - Output: Incidencia (success/error), UUID, xml timbrado, fecha, codEstatus

    Errores comunes Finkok:
      301: XML mal formado
      302: Certificado inválido
      303: CFDI ya timbrado
      205: Credenciales inválidas
    """

    # Namespace usado en respuestas SOAP de Finkok
    NS = {
        "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
        "apps": "apps.services.soap.core.views",
    }

    def __init__(self, cfg: PacConfig):
        self.cfg = cfg
        self.username = os.getenv("FINKOK_USERNAME", "")   # RFC del emisor
        self.password = os.getenv("FINKOK_PASSWORD", "")   # Contraseña Finkok
        self.sandbox = os.getenv("FINKOK_SANDBOX", "true").lower() == "true"
        # Endpoint base SOAP (sin el método, que se agrega en cada llamada)
        self.base_endpoint = cfg.endpoint  # https://facturacion.finkok.com/servicios/soap
        logger.info(
            "FinkokAdapter inicializado: sandbox=%s, endpoint=%s, usuario=%s",
            self.sandbox, self.base_endpoint, self.username[:4] + "***" if self.username else "N/A",
        )

    # ── Helpers SOAP ──────────────────────────────────

    def _build_soap_envelope(self, body_xml: str) -> str:
        """Construye el SOAP envelope completo alrededor del body XML."""
        return (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
            'xmlns:apps="apps.services.soap.core.views">\n'
            '  <soapenv:Body>\n'
            f'    {body_xml}\n'
            '  </soapenv:Body>\n'
            '</soapenv:Envelope>'
        )

    def _post_soap(self, endpoint: str, envelope: str, soap_action: str = "") -> requests.Response:
        """Envía request SOAP a Finkok con Content-Type text/xml."""
        headers = {"Content-Type": "text/xml; charset=utf-8"}
        if soap_action:
            headers["SOAPAction"] = soap_action

        try:
            resp = requests.post(endpoint, data=envelope, headers=headers, timeout=30)
            return resp
        except requests.Timeout as e:
            raise RuntimeError(f"Timeout en llamada SOAP a Finkok ({endpoint}): {e}") from e
        except requests.ConnectionError as e:
            raise RuntimeError(f"Error de conexión a Finkok ({endpoint}): {e}") from e
        except requests.RequestException as e:
            raise RuntimeError(f"Error en llamada SOAP a Finkok ({endpoint}): {e}") from e

    def _parse_soap_response(self, response_xml: str) -> dict:
        """Parsea respuesta SOAP de Finkok.

        Extrae campos comunes:
          - Incidencia: "success" o código de error
          - UUID, xml, fecha, codEstatus
          - Mensaje de error si Incidencia != success

        Retorna un diccionario con los campos encontrados.
        """
        result: Dict[str, Any] = {}
        try:
            root = ET.fromstring(response_xml)
        except ET.ParseError as e:
            logger.error("Error parseando respuesta XML de Finkok: %s", e)
            return {"success": False, "error": f"XML inválido: {e}", "raw_response": response_xml[:500]}

        # Buscar Incidencia bajo cualquier profundidad y namespace
        incidencia_el = root.find(".//apps:Incidencia", self.NS) or root.find(".//{apps.services.soap.core.views}Incidencia")
        if incidencia_el is not None and incidencia_el.text:
            result["Incidencia"] = incidencia_el.text.strip()
        else:
            # Fallback: buscar sin namespace
            for el in root.iter():
                if el.tag.endswith("Incidencia") and el.text:
                    result["Incidencia"] = el.text.strip()
                    break

        # Mapeo de tags a buscar
        tags = [
            "UUID", "xml", "Fecha", "CodEstatus", "Codigo", "Error",
            "EstatusUUID", "EstatusCancelacion", "Acuse", "noCertificadoSAT",
        ]
        for tag in tags:
            el = root.find(f".//apps:{tag}", self.NS) or root.find(f".//{{apps.services.soap.core.views}}{tag}")
            if el is None:
                # Fallback sin namespace
                for elem in root.iter():
                    if elem.tag.endswith(tag) and elem.text:
                        el = elem
                        break
            if el is not None and el.text:
                result[tag] = el.text.strip()

        # Determinar éxito
        incidencia = result.get("Incidencia", "")
        result["success"] = incidencia.lower() == "success"

        if not result["success"]:
            result["error"] = result.get("Error", f"Incidencia: {incidencia}")
            logger.warning("Finkok SOAP respuesta no exitosa: %s", result.get("error"))

        return result

    # ── Métodos del adapter ──────────────────────────

    def timbrar(
        self, xml: str,
        csd_pem: str = "", llave_pem: str = "", contrasena: str = "",
    ) -> Dict[str, Any]:
        """Timbra un CFDI vía Finkok SOAP (método stamp).

        1. Valida credenciales configuradas.
        2. Codifica el XML CFDI a base64.
        3. Arma el SOAP body con <apps:stamp>.
        4. Envía POST al endpoint /stamp con Content-Type: text/xml.
        5. Parsea la respuesta y retorna los datos del timbrado.

        Retorna dict con:
          - success: bool
          - uuid: str
          - xml_timbrado: str (XML con el timbre fiscal)
          - fecha_timbrado: str (fecha del timbrado)
          - cod_estatus: str (código de estatus SAT)
          - error: str (si hay error)
          - pac_provider: "finkok"
        """
        if not self.username or not self.password:
            raise RuntimeError(
                "PAC Finkok no configurado. "
                "Configura FINKOK_USERNAME (RFC emisor) y FINKOK_PASSWORD en .env, "
                "o usa PAC_PROVIDER=mock para desarrollo."
            )

        # Codificar XML a base64 (Finkok espera base64 en el body)
        xml_b64 = base64.b64encode(xml.encode("utf-8")).decode("ascii")

        # Armar SOAP body para stamp
        body = (
            f'<apps:stamp>'
            f'<xml>{xml_b64}</xml>'
            f'<username>{self.username}</username>'
            f'<password>{self.password}</password>'
            f'</apps:stamp>'
        )
        envelope = self._build_soap_envelope(body)

        endpoint = f"{self.base_endpoint}/stamp"
        logger.info("Tim brando CFDI en Finkok (%s)...", "sandbox" if self.sandbox else "producción")

        try:
            resp = self._post_soap(endpoint, envelope)
        except RuntimeError:
            raise

        if resp.status_code != 200:
            raise RuntimeError(
                f"Finkok stamp error HTTP {resp.status_code}: {resp.text[:500]}"
            )

        parsed = self._parse_soap_response(resp.text)

        if not parsed.get("success"):
            cod_error = parsed.get("Codigo", parsed.get("Incidencia", "desconocido"))
            msg_error = parsed.get("error", "Error desconocido")
            return {
                "success": False,
                "uuid": parsed.get("UUID", ""),
                "xml_timbrado": "",
                "fecha_timbrado": "",
                "cod_estatus": cod_error,
                "error": f"Finkok [{cod_error}]: {msg_error}",
                "pac_provider": "finkok",
            }

        return {
            "success": True,
            "uuid": parsed.get("UUID", ""),
            "xml_timbrado": parsed.get("xml", ""),
            "fecha_timbrado": parsed.get("Fecha", datetime.utcnow().isoformat()),
            "cod_estatus": parsed.get("CodEstatus", ""),
            "pac_provider": "finkok",
        }

    def cancelar(
        self, uuid: str, rfc_emisor: str,
        csd_pem: str = "", llave_pem: str = "", contrasena: str = "",
    ) -> Dict[str, Any]:
        """Cancela un CFDI vía Finkok SOAP (método cancel).

        Requiere:
          - uuid: UUID del CFDI a cancelar
          - rfc_emisor: RFC del emisor
          - csd_pem: contenido del archivo .cer en texto (se codifica a base64)
          - llave_pem: contenido del archivo .key en texto (se codifica a base64)
          - contrasena: contraseña de la llave privada (opcional)

        Usa endpoint: /cancel

        Retorna dict con:
          - success: bool
          - uuid: str
          - estatus: str (estado de la cancelación)
          - acuse: str (XML de acuse si disponible)
          - error: str (si hay error)
        """
        if not self.username or not self.password:
            raise RuntimeError("PAC Finkok no configurado para cancelación.")

        if not uuid:
            raise ValueError("UUID requerido para cancelación")
        if not rfc_emisor:
            raise ValueError("RFC emisor requerido para cancelación")

        # Codificar certificado y llave a base64
        cer_b64 = ""
        key_b64 = ""
        if csd_pem:
            cer_b64 = base64.b64encode(csd_pem.encode("utf-8")).decode("ascii")
        if llave_pem:
            key_b64 = base64.b64encode(llave_pem.encode("utf-8")).decode("ascii")

        # Determinar RFC emisor
        rfc = rfc_emisor or self.username

        # Armar SOAP body para cancel
        body = (
            f'<apps:cancel>'
            f'<uuid>{uuid}</uuid>'
            f'<username>{self.username}</username>'
            f'<password>{self.password}</password>'
            f'<rfc_emisor>{rfc}</rfc_emisor>'
            f'<cer>{cer_b64}</cer>'
            f'<key>{key_b64}</key>'
            f'<store_pending>true</store_pending>'
            f'</apps:cancel>'
        )
        envelope = self._build_soap_envelope(body)

        endpoint = f"{self.base_endpoint}/cancel"
        logger.info("Cancelando CFDI %s en Finkok...", uuid)

        try:
            resp = self._post_soap(endpoint, envelope)
        except RuntimeError:
            raise

        if resp.status_code != 200:
            raise RuntimeError(
                f"Finkok cancel error HTTP {resp.status_code}: {resp.text[:500]}"
            )

        parsed = self._parse_soap_response(resp.text)

        estatus_cancelacion = parsed.get("EstatusCancelacion", "")
        acuse = parsed.get("Acuse", "")

        if not parsed.get("success"):
            return {
                "success": False,
                "uuid": uuid,
                "estatus": estatus_cancelacion or "error",
                "acuse": acuse,
                "error": parsed.get("error", "Error en cancelación"),
            }

        return {
            "success": True,
            "uuid": uuid,
            "estatus": estatus_cancelacion or "cancelado",
            "acuse": acuse,
        }

    def consultar(self, uuid: str, rfc_emisor: str = "") -> Dict[str, Any]:
        """Consulta el estatus de un CFDI timbrado vía Finkok SOAP (método stamped).

        Retorna dict con:
          - success: bool
          - uuid: str
          - estatus: str (EstatusUUID)
          - cod_estatus: str (CodEstatus)
          - xml: str (XML del CFDI si disponible)
          - error: str (si hay error)
        """
        if not self.username or not self.password:
            raise RuntimeError("PAC Finkok no configurado para consulta.")

        if not uuid:
            raise ValueError("UUID requerido para consulta")

        rfc = rfc_emisor or self.username

        # Armar SOAP body para stamped
        body = (
            f'<apps:stamped>'
            f'<uuid>{uuid}</uuid>'
            f'<username>{self.username}</username>'
            f'<password>{self.password}</password>'
            f'<rfc_emisor>{rfc}</rfc_emisor>'
            f'</apps:stamped>'
        )
        envelope = self._build_soap_envelope(body)

        endpoint = f"{self.base_endpoint}/stamped"
        logger.info("Consultando CFDI %s en Finkok...", uuid)

        try:
            resp = self._post_soap(endpoint, envelope)
        except RuntimeError:
            raise

        if resp.status_code != 200:
            raise RuntimeError(
                f"Finkok stamped error HTTP {resp.status_code}: {resp.text[:500]}"
            )

        parsed = self._parse_soap_response(resp.text)

        estatus_uuid = parsed.get("EstatusUUID", "")
        cod_estatus = parsed.get("CodEstatus", "")

        if not parsed.get("success"):
            return {
                "success": False,
                "uuid": uuid,
                "estatus": estatus_uuid or "error",
                "cod_estatus": cod_estatus,
                "xml": parsed.get("xml", ""),
                "error": parsed.get("error", "Error en consulta"),
            }

        return {
            "success": True,
            "uuid": uuid,
            "estatus": estatus_uuid,
            "cod_estatus": cod_estatus,
            "xml": parsed.get("xml", ""),
            "error": None,
        }
