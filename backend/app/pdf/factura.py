"""PDF de Factura CFDI de Ingreso — Representación impresa profesional."""
from .base import *  # noqa: F401, F403
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, HRFlowable


def generar_pdf_factura(factura, conceptos, impuestos_list) -> bytes:
    """Genera PDF profesional de factura CFDI de Ingreso.

    Args:
        factura: objeto CfdiIngreso
        conceptos: list[CfdiIngresoConcepto]
        impuestos_list: list[CfdiIngresoImpuesto]
    """
    styles = get_styles()
    elements = []

    # ── Encabezado ──
    elements.append(Paragraph("Factura Electrónica (CFDI)", styles['DocTitle']))
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_ACCENT,
                               spaceAfter=4*mm))

    # ── Datos del Emisor ──
    elements.append(Paragraph("Emisor", styles['SectionHeader']))
    emisor_data = [
        [Paragraph("<b>RFC Emisor</b>", styles['Label']),
         Paragraph(factura.emisor_rfc, styles['Value'])],
        [Paragraph("<b>Nombre</b>", styles['Label']),
         Paragraph(factura.emisor_nombre, styles['Value'])],
        [Paragraph("<b>Lugar de Expedición</b>", styles['Label']),
         Paragraph(factura.lugar_expedicion or '—', styles['Value'])],
    ]
    emisor_table = Table(emisor_data, colWidths=[45*mm, 115*mm])
    emisor_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
    ]))
    elements.append(emisor_table)

    # ── Datos del Receptor ──
    elements.append(Paragraph("Receptor", styles['SectionHeader']))
    receptor_data = [
        [Paragraph("<b>RFC Receptor</b>", styles['Label']),
         Paragraph(factura.receptor_rfc, styles['Value'])],
        [Paragraph("<b>Nombre</b>", styles['Label']),
         Paragraph(factura.receptor_nombre, styles['Value'])],
        [Paragraph("<b>Uso CFDI</b>", styles['Label']),
         Paragraph(factura.uso_cfdi or '—', styles['Value'])],
    ]
    receptor_table = Table(receptor_data, colWidths=[45*mm, 115*mm])
    receptor_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
    ]))
    elements.append(receptor_table)

    # ── Datos del CFDI ──
    elements.append(Paragraph("Datos del Comprobante", styles['SectionHeader']))
    comp_data = [
        [Paragraph("<b>Serie/Folio</b>", styles['Label']),
         Paragraph(f"{factura.serie or ''}{factura.folio or ''}" or '—',
                   styles['Value'])],
        [Paragraph("<b>Fecha de Emisión</b>", styles['Label']),
         Paragraph(fecha_format(factura.fecha_emision),
                   styles['Value'])],
        [Paragraph("<b>Forma de Pago</b>", styles['Label']),
         Paragraph(factura.forma_pago or '—', styles['Value'])],
        [Paragraph("<b>Método de Pago</b>", styles['Label']),
         Paragraph(factura.metodo_pago or '—', styles['Value'])],
        [Paragraph("<b>Moneda</b>", styles['Label']),
         Paragraph(factura.moneda or 'MXN', styles['Value'])],
    ]
    comp_table = Table(comp_data, colWidths=[45*mm, 115*mm])
    comp_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
    ]))
    elements.append(comp_table)

    # ── Conceptos ──
    elements.append(Paragraph("Conceptos", styles['SectionHeader']))
    conc_data = [
        [Paragraph("<b>Clave</b>", styles['TableHeader']),
         Paragraph("<b>Descripción</b>", styles['TableHeader']),
         Paragraph("<b>Cant.</b>", styles['TableHeader']),
         Paragraph("<b>P. Unit.</b>", styles['TableHeader']),
         Paragraph("<b>Importe</b>", styles['TableHeader'])],
    ]

    for c in conceptos:
        desc = c.descripcion or ''
        if len(desc) > 60:
            desc = desc[:57] + '...'
        conc_data.append([
            Paragraph(c.clave_prod_serv or '', styles['TableCell']),
            Paragraph(desc, styles['TableCell']),
            Paragraph(str(c.cantidad), styles['TableCellRight']),
            Paragraph(peso_mxn(c.valor_unitario), styles['TableCellRight']),
            Paragraph(peso_mxn(c.importe), styles['TableCellRight']),
        ])

    conc_table = Table(conc_data, colWidths=[22*mm, 62*mm, 18*mm,
                                              28*mm, 30*mm])
    conc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_WHITE),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_LIGHT_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(conc_table)

    # ── Totales ──
    elements.append(Spacer(1, 4*mm))
    totales_data = [
        [Paragraph("Subtotal", styles['TableCell']),
         Paragraph(peso_mxn(factura.subtotal), styles['TableCellRight'])],
        [Paragraph("Descuento", styles['TableCell']),
         Paragraph(peso_mxn(factura.descuento), styles['TableCellRight'])],
    ]

    # Agrupar impuestos por tipo
    traslados = [i for i in impuestos_list if i.tipo == 'traslado']
    retenciones = [i for i in impuestos_list if i.tipo == 'retencion']

    for imp in traslados:
        totales_data.append([
            Paragraph(f"{imp.impuesto} ({float(imp.tasa_cuota)*100:.0f}%)",
                      styles['TableCell']),
            Paragraph(peso_mxn(imp.importe), styles['TableCellRight']),
        ])

    for imp in retenciones:
        totales_data.append([
            Paragraph(f"{imp.impuesto} (retenido)", styles['TableCell']),
            Paragraph(peso_mxn(imp.importe), styles['TableCellRight']),
        ])

    totales_data.append([
        Paragraph("<b>TOTAL</b>", styles['ValueBold']),
        Paragraph(f"<b><font size='12'>{peso_mxn(factura.total)}</font></b>",
                  styles['ValueBold']),
    ])

    totales_table = Table(totales_data, colWidths=[120*mm, 40*mm])
    totales_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_LIGHT_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, -1), (-1, -1), 2, COLOR_PRIMARY),
        ('BACKGROUND', (0, -1), (-1, -1), COLOR_BG),
    ]))
    elements.append(totales_table)

    # ── UUID y datos fiscales ──
    elements.append(Spacer(1, 8*mm))
    elements.append(Paragraph("Datos Fiscales", styles['SectionHeader']))
    uuid_data = [
        [Paragraph("<b>UUID (Folio Fiscal)</b>", styles['Label']),
         Paragraph(factura.uuid, styles['Value'])],
        [Paragraph("<b>Fecha de Emisión</b>", styles['Label']),
         Paragraph(fecha_format(factura.fecha_emision), styles['Value'])],
    ]

    # Cadena original si existe
    uuid_table = Table(uuid_data, colWidths=[45*mm, 115*mm])
    uuid_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(uuid_table)

    # ── Disclaimer ──
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph(
        "Este documento es una representación impresa de un Comprobante "
        "Fiscal Digital por Internet (CFDI). El documento oficial es el XML "
        "firmado digitalmente por el SAT y el emisor. Para validar la "
        "autenticidad de este comprobante, consulte el portal del SAT.",
        styles['Watermark'],
    ))

    return build_pdf(
        elements,
        title=f"Factura_{factura.serie or ''}{factura.folio or ''}_{factura.uuid[:8]}"
    )
