"""
Balance OS — Generador de XML CFDI 4.0 de Ingreso
==================================================
Genera el XML CFDI 4.0 (Anexo 20) para facturas de ingreso.

Estructura del XML conforme a:
  - http://www.sat.gob.mx/cfd/4 (cfdv40.xsd)
  - http://www.sat.gob.mx/TimbreFiscalDigital (TimbreFiscalDigitalv11.xsd)
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
import os

XMLNS_CFDI = "http://www.sat.gob.mx/cfd/4"
XMLNS_TFD = "http://www.sat.gob.mx/TimbreFiscalDigital"
SCHEMA_LOCATION = (
    "http://www.sat.gob.mx/cfd/4 "
    "http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
)

RFC_EMISOR = "XXX010101XXX"
EMISOR_NOMBRE = "Balance OS S.A. de C.V."
REGIMEN_FISCAL = "607"  # Persona Moral Régimen General
NO_CERTIFICADO = "00000000000000000000"


def _xml_escape(s: str) -> str:
    """Escapa caracteres especiales para XML."""
    s = s.replace("&", "&amp;")
    s = s.replace("<", "&lt;")
    s = s.replace(">", "&gt;")
    s = s.replace('"', "&quot;")
    s = s.replace("'", "&apos;")
    return s


def _formatear_fecha(dt: datetime) -> str:
    """Formatea fecha a ISO 8601 para XML SAT."""
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _fmt_dec(val: Decimal) -> str:
    """Formatea Decimal a 2 decimales para XML."""
    return f"{float(val):.2f}"


def generar_xml_ingreso(
    datos_factura: Dict[str, Any],
    emisor_rfc: str = RFC_EMISOR,
    emisor_nombre: str = EMISOR_NOMBRE,
    regimen_fiscal: str = REGIMEN_FISCAL,
    no_certificado: str = NO_CERTIFICADO,
) -> str:
    """Genera el XML completo de un CFDI 4.0 de Ingreso (sin timbrar).

    Args:
        datos_factura: Dict con la estructura de la factura:
            {
                "serie": "F",
                "folio": "1",
                "fecha_emision": datetime,
                "receptor_rfc": str,
                "receptor_nombre": str,
                "uso_cfdi": str,
                "forma_pago": str,
                "metodo_pago": str,
                "moneda": str,
                "tipo_cambio": Optional[Decimal],
                "lugar_expedicion": str,
                "subtotal": Decimal,
                "descuento": Decimal,
                "total": Decimal,
                "conceptos": [
                    {
                        "clave_prod_serv": str,
                        "no_identificacion": Optional[str],
                        "cantidad": Decimal,
                        "clave_unidad": str,
                        "unidad": str,
                        "descripcion": str,
                        "valor_unitario": Decimal,
                        "importe": Decimal,
                        "descuento": Decimal,
                        "objeto_imp": str,
                    }
                ],
                "impuestos": {
                    "total_traslados": Decimal,
                    "total_retenciones": Decimal,
                    "traslados": [
                        {"base": Decimal, "impuesto": str, "tipo_factor": str, "tasa_cuota": Decimal, "importe": Decimal}
                    ],
                    "retenciones": [
                        {"base": Decimal, "impuesto": str, "tipo_factor": str, "tasa_cuota": Decimal, "importe": Decimal}
                    ],
                },
            }

    Returns:
        str con el XML CFDI 4.0 completo (sin timbre fiscal).
    """
    d = datos_factura
    now = d.get("fecha_emision", datetime.utcnow())
    fecha = _formatear_fecha(now)

    serie = _xml_escape(d.get("serie", "F") or "")
    folio = _xml_escape(str(d.get("folio", "1") or "1"))
    receptor_rfc = _xml_escape(d["receptor_rfc"])
    receptor_nombre = _xml_escape(d["receptor_nombre"])
    uso_cfdi = d.get("uso_cfdi", "G03")
    forma_pago = _xml_escape(d.get("forma_pago", "99"))
    metodo_pago = _xml_escape(d.get("metodo_pago", "PUE"))
    moneda = _xml_escape(d.get("moneda", "MXN"))
    tipo_cambio = _fmt_dec(d["tipo_cambio"]) if d.get("tipo_cambio") else ""
    lugar_expedicion = _xml_escape(d.get("lugar_expedicion", "77500"))

    subtotal = _fmt_dec(d.get("subtotal", Decimal("0.00")))
    descuento = _fmt_dec(d.get("descuento", Decimal("0.00")))
    total = _fmt_dec(d.get("total", Decimal("0.00")))

    # Construir XML
    lines = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')

    # Atributos del Comprobante
    comp_attrs = (
        f'<cfdi:Comprobante'
        f' xmlns:cfdi="{XMLNS_CFDI}"'
        f' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
        f' xsi:schemaLocation="{SCHEMA_LOCATION}"'
        f' Version="4.0"'
        f' Serie="{serie}"'
        f' Folio="{folio}"'
        f' Fecha="{fecha}"'
        f' Sello=""'
        f' FormaPago="{forma_pago}"'
        f' NoCertificado="{no_certificado}"'
        f' Certificado=""'
        f' SubTotal="{subtotal}"'
        f' Descuento="{descuento}"'
        f' Moneda="{moneda}"'
    )
    if tipo_cambio:
        comp_attrs += f' TipoCambio="{tipo_cambio}"'
    comp_attrs += (
        f' Total="{total}"'
        f' TipoDeComprobante="I"'
        f' Exportacion="01"'
        f' MetodoPago="{metodo_pago}"'
        f' LugarExpedicion="{lugar_expedicion}"'
        f'>'
    )
    lines.append(comp_attrs)

    # Emisor
    lines.append(
        f'  <cfdi:Emisor'
        f' Rfc="{_xml_escape(emisor_rfc)}"'
        f' Nombre="{_xml_escape(emisor_nombre)}"'
        f' RegimenFiscal="{regimen_fiscal}"/>'
    )

    # Receptor
    lines.append(
        f'  <cfdi:Receptor'
        f' Rfc="{receptor_rfc}"'
        f' Nombre="{receptor_nombre}"'
        f' DomicilioFiscalReceptor="{lugar_expedicion}"'
        f' RegimenFiscalReceptor="608"'
        f' UsoCFDI="{uso_cfdi}"/>'
    )

    # Conceptos
    lines.append('  <cfdi:Conceptos>')
    for c in d.get("conceptos", []):
        c_prod = _xml_escape(c.get("clave_prod_serv", "01010101"))
        c_cant = _fmt_dec(c.get("cantidad", Decimal("1.00")))
        c_unidad = _xml_escape(c.get("clave_unidad", "H87"))
        c_desc = _xml_escape(c.get("descripcion", "Servicio"))
        c_val_u = _fmt_dec(c.get("valor_unitario", Decimal("0.00")))
        c_importe = _fmt_dec(c.get("importe", Decimal("0.00")))
        c_obj_imp = c.get("objeto_imp", "02")
        c_descto = _fmt_dec(c.get("descuento", Decimal("0.00")))
        c_no_id = _xml_escape(c["no_identificacion"]) if c.get("no_identificacion") else None

        concepto = (
            f'    <cfdi:Concepto'
            f' ClaveProdServ="{c_prod}"'
        )
        if c_no_id:
            concepto += f' NoIdentificacion="{c_no_id}"'
        concepto += (
            f' Cantidad="{c_cant}"'
            f' ClaveUnidad="{c_unidad}"'
            f' Unidad="{_xml_escape(c.get("unidad", "Actividad"))}"'
            f' Descripcion="{c_desc}"'
            f' ValorUnitario="{c_val_u}"'
            f' Importe="{c_importe}"'
            f' ObjetoImp="{c_obj_imp}"'
        )
        if c.get("descuento") and c["descuento"] > 0:
            concepto += f' Descuento="{c_descto}"'
        concepto += '/>'
        lines.append(concepto)
    lines.append('  </cfdi:Conceptos>')

    # Impuestos
    impuestos_data = d.get("impuestos", {})
    traslados = impuestos_data.get("traslados", [])
    retenciones = impuestos_data.get("retenciones", [])
    total_traslados = _fmt_dec(impuestos_data.get("total_traslados", Decimal("0.00")))
    total_retenciones = _fmt_dec(impuestos_data.get("total_retenciones", Decimal("0.00")))

    if traslados or retenciones:
        lines.append(
            f'  <cfdi:Impuestos'
            f' TotalImpuestosTrasladados="{total_traslados}"'
            f' TotalImpuestosRetenidos="{total_retenciones}">'
        )
        if traslados:
            lines.append('    <cfdi:Traslados>')
            for t in traslados:
                lines.append(
                    f'      <cfdi:Traslado'
                    f' Base="{_fmt_dec(t["base"])}"'
                    f' Impuesto="{t["impuesto"]}"'
                    f' TipoFactor="{t["tipo_factor"]}"'
                    f' TasaOCuota="{_fmt_dec(t["tasa_cuota"])}"'
                    f' Importe="{_fmt_dec(t["importe"])}"/>'
                )
            lines.append('    </cfdi:Traslados>')
        if retenciones:
            lines.append('    <cfdi:Retenciones>')
            for r in retenciones:
                lines.append(
                    f'      <cfdi:Retencion'
                    f' Base="{_fmt_dec(r["base"])}"'
                    f' Impuesto="{r["impuesto"]}"'
                    f' TipoFactor="{r["tipo_factor"]}"'
                    f' TasaOCuota="{_fmt_dec(r["tasa_cuota"])}"'
                    f' Importe="{_fmt_dec(r["importe"])}"/>'
                )
            lines.append('    </cfdi:Retenciones>')
        lines.append('  </cfdi:Impuestos>')

    lines.append('</cfdi:Comprobante>')

    return "\n".join(lines)


def guardar_xml_ingreso(xml: str, factura_id: int, directorio: str = "storage/cfdi_ingresos") -> str:
    """Guarda un XML de CFDI de Ingreso en disco y devuelve la ruta."""
    os.makedirs(directorio, exist_ok=True)
    filename = f"cfdi_ingreso_{factura_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xml"
    filepath = os.path.join(directorio, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(xml)
    return filepath
