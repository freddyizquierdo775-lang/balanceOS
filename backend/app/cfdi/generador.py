"""
Balance OS — Generador de CFDI 4.0 de Nómina
=============================================
Genera XML CFDI 4.0 para recibos de nómina según el Anexo 20 del SAT.

Para timbrado real se necesita:
  1. CSD (Certificado de Sello Digital) del emisor
  2. PAC contratado (Facturaxion, SW SAPS, Finkok, etc.)
  3. Conexión al PAC para timbrar

Este módulo genera el XML + cadena original + sellado (mock en dev).
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date
from typing import Optional
import hashlib
import base64
import os

from app.models import Recibo, Empleado, CsdCertificado, CfdiRecibo

_DOS = Decimal("0.01")
XMLNS_CFDI = "http://www.sat.gob.mx/cfd/4"
XMLNS_NOMINA12 = "http://www.sat.gob.mx/nomina12"
SCHEMA_LOCATION = (
    "http://www.sat.gob.mx/cfd/4 "
    "http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd "
    "http://www.sat.gob.mx/nomina12 "
    "http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd"
)
# PAC por defecto (mock/desarrollo)
PAC_INFO = {
    "nombre": "DESARROLLO (MOCK PAC)",
    "rfc_pac": "MOCK000101MOCK",
    "no_certificado_pac": "00000000000000000000",
}


def generar_uuid() -> str:
    """Genera UUID v4 para timbre fiscal (mock)."""
    import uuid
    return str(uuid.uuid4())


def formatear_fecha_sat(dt: datetime) -> str:
    """Formatea fecha a ISO 8601 (SAT format)."""
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _xml_escape(s: str) -> str:
    """Escapa caracteres especiales para XML."""
    s = s.replace("&", "&amp;")
    s = s.replace("<", "&lt;")
    s = s.replace(">", "&gt;")
    s = s.replace('"', "&quot;")
    s = s.replace("'", "&apos;")
    return s


def generar_cfdi_nomina(
    recibo: Recibo,
    empleado: Empleado,
    emisor: CsdCertificado,
    serie: str = "N",
    folio: int = 1,
    pac_info: Optional[dict] = None,
) -> dict:
    """Genera el CFDI 4.0 de nómina completo.

    Returns:
        dict con {xml, cadena_original, sello, uuid}
    """
    pac = pac_info or PAC_INFO
    now = datetime.utcnow()
    uuid = generar_uuid()
    periodo = recibo.periodo

    # ── Datos del emisor ──
    rfc_emisor = _xml_escape(emisor.rfc_emisor)
    regimen = emisor.regimen_fiscal
    no_certificado = emisor.numero_certificado or "00000000000000000000"

    # ── Datos del receptor (empleado) ──
    rfc_receptor = _xml_escape(empleado.rfc)
    nombre_receptor = _xml_escape(f"{empleado.nombre} {empleado.apellidos}")
    curp_receptor = _xml_escape(empleado.curp or "XEXX010101000")

    # ── Totales ──
    total = float(recibo.total_percepciones)
    subtotal = total
    descuento = float(recibo.total_deducciones)
    iva = 0.0  # nómina exenta de IVA
    total_factura = subtotal  # IVA 0%

    # ── Período de nómina ──
    fecha_inicio = formatear_fecha_sat(periodo.fecha_inicio)
    fecha_fin = formatear_fecha_sat(periodo.fecha_fin)
    fecha_pago = formatear_fecha_sat(now)

    # ── Construir XML ──
    xmlns_cfdi = XMLNS_CFDI
    xmlns_nom = XMLNS_NOMINA12
    schema_loc = SCHEMA_LOCATION

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
    xmlns:cfdi="{xmlns_cfdi}"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:nomina12="{xmlns_nom}"
    xsi:schemaLocation="{schema_loc}"
    Version="4.0"
    Serie="{_xml_escape(serie)}"
    Folio="{folio}"
    Fecha="{formatear_fecha_sat(now)}"
    Sello=""
    FormaPago="99"
    NoCertificado="{no_certificado}"
    Certificado=""
    SubTotal="{subtotal:.2f}"
    Descuento="{descuento:.2f}"
    Moneda="MXN"
    Total="{total_factura:.2f}"
    TipoDeComprobante="E"
    Exportacion="01"
    MetodoPago="PUE"
    LugarExpedicion="77500">
    <cfdi:Emisor
        Rfc="{rfc_emisor}"
        Nombre="{nombre_receptor}"
        RegimenFiscal="{regimen}"/>
    <cfdi:Receptor
        Rfc="{rfc_receptor}"
        Nombre="{nombre_receptor}"
        DomicilioFiscalReceptor="77500"
        RegimenFiscalReceptor="608"
        UsoCFDI="CN81"/>
    <cfdi:Conceptos>
        <cfdi:Concepto
            ClaveProdServ="84111506"
            Cantidad="1"
            ClaveUnidad="ACT"
            Descripcion="Pago de nómina"
            ValorUnitario="{subtotal:.2f}"
            Importe="{subtotal:.2f}"
            ObjetoImp="01"
            Descuento="{descuento:.2f}"/>
    </cfdi:Conceptos>
    <cfdi:Impuestos
        TotalImpuestosTrasladados="0.00"
        TotalImpuestosRetenidos="{descuento:.2f}">
        <cfdi:Retenciones>
            <cfdi:Retencion Impuesto="001" Importe="{float(recibo.isr):.2f}"/>
            <cfdi:Retencion Impuesto="002" Importe="{float(recibo.imss_obrero):.2f}"/>
        </cfdi:Retenciones>
    </cfdi:Impuestos>
    <cfdi:Complemento>
        <nomina12:Nomina
            Version="1.2"
            TipoNomina="O"
            FechaPago="{fecha_pago}"
            FechaInicialPago="{fecha_inicio}"
            FechaFinalPago="{fecha_fin}"
            NumDiasPagados="{recibo.dias_trabajados}"
            TotalPercepciones="{float(recibo.total_percepciones):.2f}"
            TotalDeducciones="{float(recibo.total_deducciones):.2f}">
            <nomina12:Emisor>
                <nomina12:EntidadSNCF OrigenRecurso="IP"/>
            </nomina12:Emisor>
            <nomina12:Receptor
                Curp="{curp_receptor}"
                NumSeguridadSocial=""
                FechaInicioRelLaboral="2020-01-01"
                Antigüedad="P1Y"
                TipoContrato="{empleado.tipo_contrato.value if hasattr(empleado.tipo_contrato, 'value') else 'base'}"
                Sindicalizado="No"
                TipoJornada="{empleado.tipo_jornada.value if hasattr(empleado.tipo_jornada, 'value') else 'Diurna'}"
                TipoRegimen="02"
                NumEmpleado="{empleado.id}"
                Departamento="General"
                Puesto="Empleado"
                RiesgoPuesto="{empleado.clase_riesgo}"
                PeriodicidadPago="{periodo.tipo}"
                SalarioBaseCotApor="{float(recibo.sbc):.2f}"
                SalarioDiarioIntegrado="{float(recibo.sbc):.2f}">
                <nomina12:Percepciones
                    TotalSueldos="{float(recibo.sueldo_base):.2f}"
                    TotalAguinaldo="{float(recibo.aguinaldo):.2f}"
                    TotalOtrasPercepciones="{float(recibo.prima_vacacional) + float(recibo.otras_percepciones):.2f}">
                    <nomina12:Percepcion
                        TipoPercepcion="001"
                        Clave="001"
                        Concepto="Sueldo Base"
                        ImporteGravado="{float(recibo.sueldo_base):.2f}"
                        ImporteExento="0.00"/>
                    <nomina12:Percepcion
                        TipoPercepcion="002"
                        Clave="002"
                        Concepto="Aguinaldo"
                        ImporteGravado="{float(recibo.aguinaldo):.2f}"
                        ImporteExento="{float(recibo.aguinaldo):.2f}"/>
                    <nomina12:Percepcion
                        TipoPercepcion="003"
                        Clave="003"
                        Concepto="Prima Vacacional"
                        ImporteGravado="{float(recibo.prima_vacacional):.2f}"
                        ImporteExento="{float(recibo.prima_vacacional):.2f}"/>
                </nomina12:Percepciones>
                <nomina12:Deducciones
                    TotalOtrasDeducciones="{float(recibo.otras_deducciones):.2f}"
                    TotalImpuestosRetenidos="{float(recibo.isr):.2f}"
                    TotalISR="{float(recibo.isr):.2f}">
                    <nomina12:Deduccion
                        TipoDeduccion="002"
                        Clave="002"
                        Concepto="ISR"
                        Importe="{float(recibo.isr):.2f}"/>
                    <nomina12:Deduccion
                        TipoDeduccion="001"
                        Clave="001"
                        Concepto="Seguridad Social"
                        Importe="{float(recibo.imss_obrero):.2f}"/>
                </nomina12:Deducciones>
            </nomina12:Receptor>
        </nomina12:Nomina>
    </cfdi:Complemento>
</cfdi:Comprobante>"""

    # ── Cadena original (simplificada) ──
    # En producción: usar las transformaciones XSLT oficiales del SAT
    cadena_original = f"||4.0|{serie}|{folio}|{formatear_fecha_sat(now)}|99|{no_certificado}||{subtotal:.2f}|{descuento:.2f}|MXN|{total_factura:.2f}|E|01|PUE|77500|{rfc_emisor}|{nombre_receptor}|{regimen}|{rfc_receptor}|{nombre_receptor}|77500|608|CN81|84111506|1|ACT|Pago de nómina|{subtotal:.2f}|{subtotal:.2f}|01|{descuento:.2f}|{descuento:.2f}|001|{float(recibo.isr):.2f}|002|{float(recibo.imss_obrero):.2f}||"

    # ── Sello digital (mock — en producción se firma con CSD) ──
    # SHA256 del XML como placeholder del sello
    hash_sello = hashlib.sha256(xml.encode("utf-8")).hexdigest().upper()

    # Insertar sello en XML
    xml = xml.replace('Sello=""', f'Sello="{hash_sello}"')
    # Certificado mock
    xml = xml.replace('Certificado=""', f'Certificado="{hash_sello[:200]}"')

    # Agregar Timbre Fiscal (mock)
    timbre_xml = f"""
    <tfd:TimbreFiscalDigital
        xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
        xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd"
        Version="1.1"
        UUID="{uuid}"
        FechaTimbrado="{formatear_fecha_sat(now)}"
        RfcProvCertif="{pac['rfc_pac']}"
        SelloCFD="{hash_sello}"
        NoCertificadoSAT="20001000000300022815"
        SelloSAT="{hash_sello[:300]}"/>"""

    # Insertar timbre antes de cerrar Complemento
    xml = xml.replace("</cfdi:Complemento>", f"{timbre_xml}\n    </cfdi:Complemento>")

    return {
        "xml": xml,
        "cadena_original": cadena_original,
        "sello": hash_sello,
        "uuid": uuid,
        "no_certificado": no_certificado,
    }


def guardar_xml(xml: str, recibo_id: int, directorio: str = "storage/cfdi") -> str:
    """Guarda XML en disco y devuelve la ruta."""
    os.makedirs(directorio, exist_ok=True)
    filename = f"cfdi_recibo_{recibo_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xml"
    filepath = os.path.join(directorio, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(xml)
    return filepath
