"""PDF de Finiquito / Liquidación — Desglose completo LFT."""
from .base import *  # noqa: F401, F403
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, HRFlowable


def generar_pdf_finiquito(finiquito, empleado) -> bytes:
    """Genera PDF profesional de finiquito/liquidación.

    Args:
        finiquito: objeto Finiquito con todos los campos calculados
        empleado: objeto Empleado
    """
    styles = get_styles()
    elements = []

    # ── Encabezado ──
    elements.append(Paragraph("Finiquito / Liquidación", styles['DocTitle']))
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_ACCENT,
                               spaceAfter=4*mm))

    # ── Datos del Trabajador ──
    nombre_completo = f"{empleado.nombre} {empleado.apellidos}".strip()
    info_data = [
        [Paragraph("<b>Trabajador</b>", styles['Label']),
         Paragraph(nombre_completo, styles['Value'])],
        [Paragraph("<b>RFC</b>", styles['Label']),
         Paragraph(empleado.rfc, styles['Value'])],
        [Paragraph("<b>CURP</b>", styles['Label']),
         Paragraph(empleado.curp or '—', styles['Value'])],
        [Paragraph("<b>Fecha de Ingreso</b>", styles['Label']),
         Paragraph(fecha_format(empleado.fecha_ingreso), styles['Value'])],
        [Paragraph("<b>Fecha de Baja</b>", styles['Label']),
         Paragraph(fecha_format(finiquito.fecha_baja), styles['Value'])],
        [Paragraph("<b>Años de Servicio</b>", styles['Label']),
         Paragraph(str(finiquito.anios_servicio), styles['Value'])],
        [Paragraph("<b>Salario Diario</b>", styles['Label']),
         Paragraph(peso_mxn(finiquito.salario_diario), styles['Value'])],
        [Paragraph("<b>Tipo de Terminación</b>", styles['Label']),
         Paragraph(
             finiquito.tipo.value.replace('_', ' ').title()
             if hasattr(finiquito.tipo, 'value')
             else str(finiquito.tipo).replace('_', ' ').title(),
             styles['Value'])],
    ]

    if finiquito.causa:
        info_data.append(
            [Paragraph("<b>Causa</b>", styles['Label']),
             Paragraph(finiquito.causa, styles['Value'])]
        )

    info_table = Table(info_data, colWidths=[45*mm, 115*mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
    ]))
    elements.append(info_table)

    # ── Percepciones ──
    elements.append(Paragraph("Desglose de Percepciones",
                              styles['SectionHeader']))
    perc_data = [
        [Paragraph("<b>Concepto</b>", styles['TableHeader']),
         Paragraph("<b>Importe</b>", styles['TableHeader'])],
    ]

    items_percepciones = []

    if float(finiquito.indemnizacion_3meses or 0) > 0:
        items_percepciones.append(
            ("Indemnización 3 meses (Art. 48 LFT)",
             float(finiquito.indemnizacion_3meses)))
    if float(finiquito.indemnizacion_20dias_x_anio or 0) > 0:
        items_percepciones.append(
            ("Indemnización 20 días por año (Art. 50 LFT)",
             float(finiquito.indemnizacion_20dias_x_anio)))
    if float(finiquito.prima_antiguedad or 0) > 0:
        items_percepciones.append(
            ("Prima de Antigüedad (Art. 162 LFT)",
             float(finiquito.prima_antiguedad)))
    if float(finiquito.vacaciones_pendientes or 0) > 0:
        items_percepciones.append(
            ("Vacaciones Pendientes",
             float(finiquito.vacaciones_pendientes)))
    if float(finiquito.prima_vacacional or 0) > 0:
        items_percepciones.append(
            ("Prima Vacacional (Art. 80 LFT)",
             float(finiquito.prima_vacacional)))
    if float(finiquito.aguinaldo_proporcional or 0) > 0:
        items_percepciones.append(
            ("Aguinaldo Proporcional (Art. 87 LFT)",
             float(finiquito.aguinaldo_proporcional)))
    if float(finiquito.otras_percepciones or 0) > 0:
        items_percepciones.append(
            ("Otras Percepciones",
             float(finiquito.otras_percepciones)))

    for concepto, importe in items_percepciones:
        perc_data.append([
            Paragraph(concepto, styles['TableCell']),
            Paragraph(peso_mxn(importe), styles['TableCellRight']),
        ])

    perc_data.append([
        Paragraph("<b>TOTAL PERCEPCIONES</b>", styles['ValueBold']),
        Paragraph(f"<b>{peso_mxn(finiquito.total_percepciones)}</b>",
                  styles['ValueBold']),
    ])

    perc_table = Table(perc_data, colWidths=[130*mm, 30*mm])
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
    ]

    deducciones_items = []

    if float(finiquito.isr or 0) > 0:
        deducciones_items.append(
            ("ISR (Art. 110 LISR)", float(finiquito.isr)))
    if float(finiquito.isr_exento or 0) > 0:
        deducciones_items.append(
            ("ISR Exento", float(finiquito.isr_exento)))
    if float(finiquito.otras_deducciones or 0) > 0:
        deducciones_items.append(
            ("Otras Deducciones", float(finiquito.otras_deducciones)))

    for concepto, importe in deducciones_items:
        ded_data.append([
            Paragraph(concepto, styles['TableCell']),
            Paragraph(peso_mxn(importe), styles['TableCellRight']),
        ])

    ded_data.append([
        Paragraph("<b>TOTAL DEDUCCIONES</b>", styles['ValueBold']),
        Paragraph(f"<b>{peso_mxn(finiquito.total_deducciones)}</b>",
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

    # ── Neto a Pagar ──
    elements.append(Spacer(1, 6*mm))
    neto = float(finiquito.neto)
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

    # ── Firmas ──
    elements.append(Spacer(1, 15*mm))
    firmas_data = [
        [Paragraph("_" * 40, styles['Value']),
         Paragraph("_" * 40, styles['Value'])],
        [Paragraph("<b>Trabajador</b>", styles['Label']),
         Paragraph("<b>Patrón / Representante Legal</b>", styles['Label'])],
        [Paragraph(nombre_completo, styles['Value']),
         Paragraph("Balance OS S.A. de C.V.", styles['Value'])],
    ]
    firmas_table = Table(firmas_data, colWidths=[80*mm, 80*mm])
    firmas_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(firmas_table)

    # ── Disclaimer ──
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph(
        "Este documento constituye un finiquito conforme a lo dispuesto en "
        "la Ley Federal del Trabajo. Los montos aquí expresados son en pesos "
        "mexicanos (MXN). Ambas partes manifiestan su conformidad con los "
        "cálculos aquí presentados.",
        styles['Watermark'],
    ))

    return build_pdf(
        elements,
        title=f"Finiquito_{nombre_completo.replace(' ', '_')}_{finiquito.id}"
    )
