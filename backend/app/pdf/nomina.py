"""PDF de Recibo de Nómina — CFDI 4.0 con todos los detalles."""
from .base import *  # noqa: F401, F403
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, HRFlowable


def generar_pdf_nomina(recibo, empleado, cfdi=None, periodo=None) -> bytes:
    """Genera PDF profesional de recibo de nómina.

    Args:
        recibo: objeto Recibo con periodo, percepciones, deducciones
        empleado: objeto Empleado
        cfdi: objeto CfdiRecibo opcional (UUID, fecha timbrado)
        periodo: objeto PeriodoNomina opcional (fechas del período)
    """
    styles = get_styles()
    elements = []

    # ── Encabezado ──
    elements.append(Paragraph("Recibo de Nómina", styles['DocTitle']))
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_ACCENT,
                               spaceAfter=4*mm))

    # ── Info general en 2 columnas ──
    nombre_completo = f"{empleado.nombre} {empleado.apellidos}".strip()
    info_data = [
        [Paragraph("<b>Empleado</b>", styles['Label']),
         Paragraph(nombre_completo, styles['Value'])],
        [Paragraph("<b>RFC</b>", styles['Label']),
         Paragraph(empleado.rfc, styles['Value'])],
        [Paragraph("<b>CURP</b>", styles['Label']),
         Paragraph(empleado.curp or '—', styles['Value'])],
        [Paragraph("<b>N° Empleado</b>", styles['Label']),
         Paragraph(str(empleado.id), styles['Value'])],
        [Paragraph("<b>Tipo Contrato</b>", styles['Label']),
         Paragraph(
             empleado.tipo_contrato.value if hasattr(empleado.tipo_contrato, 'value')
             else str(empleado.tipo_contrato or 'Base'), styles['Value'])],
        [Paragraph("<b>Salario Diario</b>", styles['Label']),
         Paragraph(peso_mxn(empleado.salario_diario), styles['Value'])],
        [Paragraph("<b>Días Trabajados</b>", styles['Label']),
         Paragraph(str(recibo.dias_trabajados), styles['Value'])],
        [Paragraph("<b>Fecha de Pago</b>", styles['Label']),
         Paragraph(fecha_format(recibo.created_at), styles['Value'])],
    ]

    if periodo:
        periodo_line = (f"{fecha_format(periodo.fecha_inicio)} — "
                        f"{fecha_format(periodo.fecha_fin)}")
        info_data.insert(4, [Paragraph("<b>Periodo</b>", styles['Label']),
                             Paragraph(periodo_line, styles['Value'])])

    info_table = Table(info_data, colWidths=[45*mm, 100*mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
    ]))
    elements.append(info_table)

    # ── Percepciones ──
    elements.append(Paragraph("Percepciones", styles['SectionHeader']))
    perc_data = [
        [Paragraph("<b>Concepto</b>", styles['TableHeader']),
         Paragraph("<b>Gravado</b>", styles['TableHeader']),
         Paragraph("<b>Exento</b>", styles['TableHeader']),
         Paragraph("<b>Total</b>", styles['TableHeader'])],
    ]

    sueldo = float(recibo.sueldo_base or 0)
    aguinaldo = float(recibo.aguinaldo or 0)
    prima_vac = float(recibo.prima_vacacional or 0)
    otras_perc = float(recibo.otras_percepciones or 0)

    percepciones = [
        ("Sueldo Base", sueldo, 0.0),
        ("Aguinaldo", 0.0, aguinaldo),
        ("Prima Vacacional", 0.0, prima_vac),
    ]
    if otras_perc > 0:
        percepciones.append(("Otras Percepciones", otras_perc, 0.0))

    for concepto, gravado, exento in percepciones:
        total = gravado + exento
        if total > 0:
            perc_data.append([
                Paragraph(concepto, styles['TableCell']),
                Paragraph(peso_mxn(gravado), styles['TableCellRight']),
                Paragraph(peso_mxn(exento), styles['TableCellRight']),
                Paragraph(peso_mxn(total), styles['TableCellRight']),
            ])

    perc_data.append([
        Paragraph("<b>TOTAL PERCEPCIONES</b>", styles['ValueBold']),
        Paragraph("", styles['TableCell']),
        Paragraph("", styles['TableCell']),
        Paragraph(f"<b>{peso_mxn(recibo.total_percepciones)}</b>",
                  styles['ValueBold']),
    ])

    perc_table = Table(perc_data, colWidths=[70*mm, 30*mm, 30*mm, 30*mm])
    perc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_WHITE),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_LIGHT_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, COLOR_PRIMARY),
    ]))
    elements.append(perc_table)

    # ── Deducciones ──
    elements.append(Paragraph("Deducciones", styles['SectionHeader']))
    ded_data = [
        [Paragraph("<b>Concepto</b>", styles['TableHeader']),
         Paragraph("<b>Importe</b>", styles['TableHeader'])],
        [Paragraph("ISR", styles['TableCell']),
         Paragraph(peso_mxn(recibo.isr_neto or recibo.isr),
                   styles['TableCellRight'])],
        [Paragraph("IMSS (Cuota Obrera)", styles['TableCell']),
         Paragraph(peso_mxn(recibo.imss_obrero),
                   styles['TableCellRight'])],
        [Paragraph("Subsidio al Empleo", styles['TableCell']),
         Paragraph(f"-{peso_mxn(recibo.subsidio_al_empleo)}",
                   styles['TableCellRight'])],
    ]
    if float(recibo.otras_deducciones or 0) > 0:
        ded_data.append([Paragraph("Otras Deducciones", styles['TableCell']),
                         Paragraph(peso_mxn(recibo.otras_deducciones),
                                   styles['TableCellRight'])])

    ded_data.append([
        Paragraph("<b>TOTAL DEDUCCIONES</b>", styles['ValueBold']),
        Paragraph(f"<b>{peso_mxn(recibo.total_deducciones)}</b>",
                  styles['ValueBold']),
    ])

    ded_table = Table(ded_data, colWidths=[130*mm, 30*mm])
    ded_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_WHITE),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_LIGHT_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, COLOR_PRIMARY),
    ]))
    elements.append(ded_table)

    # ── Total Neto ──
    elements.append(Spacer(1, 6*mm))
    neto = float(recibo.neto)
    neto_box = Table([
        [Paragraph("NETO A PAGAR", styles['ValueBold']),
         Paragraph(f"<font size='14'>{peso_mxn(neto)}</font>",
                   styles['ValueBold'])],
    ], colWidths=[100*mm, 60*mm])
    neto_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    elements.append(neto_box)

    # ── Info CFDI ──
    if cfdi and cfdi.uuid:
        elements.append(Spacer(1, 8*mm))
        elements.append(Paragraph("Timbre Fiscal", styles['SectionHeader']))
        cfdi_lines = [
            f"<b>UUID:</b> {cfdi.uuid}",
        ]
        if cfdi.fecha_timbrado:
            cfdi_lines.append(
                f"<b>Fecha de Timbrado:</b> {fecha_format(cfdi.fecha_timbrado)}")
        if cfdi.serie and cfdi.folio:
            cfdi_lines.append(
                f"<b>Folio Fiscal:</b> {cfdi.serie}{cfdi.folio}")
        for line in cfdi_lines:
            elements.append(Paragraph(line, styles['Value']))

    # ── Disclaimer ──
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph(
        "Este documento es una representación impresa de un Comprobante "
        "Fiscal Digital por Internet (CFDI). El documento oficial es el XML "
        "firmado digitalmente. Consulte el archivo XML para validación ante "
        "el SAT.",
        styles['Watermark'],
    ))

    return build_pdf(
        elements,
        title=f"Recibo_Nomina_{nombre_completo.replace(' ', '_')}_{recibo.id}"
    )
