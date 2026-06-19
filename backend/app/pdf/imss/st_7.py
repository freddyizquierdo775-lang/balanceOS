"""
ST-7: Aviso de atención médica inicial y calificación de probable accidente de trabajo.
Genera un PDF prellenado con datos del empleado, cliente y descripción del incidente.
"""
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                 Table, TableStyle, HRFlowable)
from app.pdf.base import get_styles, COLOR_PRIMARY, COLOR_GRAY, COLOR_DARK, COLOR_LIGHT_GRAY


def _fecha_iso(dt):
    if not dt:
        return "—"
    if isinstance(dt, str):
        from datetime import datetime as dt_mod
        dt = dt_mod.fromisoformat(dt.replace("Z", "+00:00"))
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
             "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    return f"{dt.day} de {meses[dt.month - 1]} de {dt.year}"


_TIPOS_RIESGO = {
    "accidente": "Accidente de trabajo",
    "enfermedad": "Enfermedad de trabajo",
    "trayecto": "Accidente en trayecto",
    "otro": "Otro",
}


def generar_st7(empleado: dict, cliente: dict, riesgo: dict,
                fecha: datetime = None) -> bytes:
    """
    Genera PDF del ST-7 (Aviso de atención médica inicial) prellenado.

    Args:
        empleado: dict con nombre, apellidos, rfc, curp, salario_diario
        cliente: dict con razon_social, rfc
        riesgo: dict con tipo_riesgo, descripcion, fecha_reporte
        fecha: fecha de generación (default now)

    Returns:
        bytes del PDF
    """
    fecha = fecha or datetime.utcnow()
    s = get_styles()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=15*mm, bottomMargin=18*mm,
    )

    elements = []
    W = letter[0] - 36*mm

    # ─── Header ────────────────────────────────────
    elements.append(Paragraph(
        "INSTITUTO MEXICANO DEL SEGURO SOCIAL", s['DocTitle']))
    elements.append(Paragraph(
        "AVISO DE ATENCIÓN MÉDICA INICIAL Y CALIFICACIÓN", s['DocSubtitle']))
    elements.append(Paragraph(
        "DE PROBABLE ACCIDENTE DE TRABAJO", s['DocSubtitle']))
    elements.append(Paragraph(
        "ST-7", s['DocSubtitle']))
    elements.append(Spacer(1, 3*mm))

    # Folio
    folio_data = [
        [Paragraph("Folio", s['Label']),
         Paragraph(f"ST7-{riesgo.get('id', 'N/A')}", s['Value']),
         Paragraph("Fecha de emisión", s['Label']),
         Paragraph(_fecha_iso(fecha), s['Value'])],
    ]
    t = Table(folio_data, colWidths=[W*0.15, W*0.35, W*0.15, W*0.35])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))

    # ─── Datos del patrón ──────────────────────────
    elements.append(Paragraph("DATOS DEL PATRÓN", s['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=0.5,
                                color=COLOR_LIGHT_GRAY))

    patron_data = [
        [Paragraph("Razón social", s['Label']),
         Paragraph(cliente.get('razon_social', '—'), s['Value'])],
        [Paragraph("RFC", s['Label']),
         Paragraph(cliente.get('rfc', '—'), s['ValueBold'])],
    ]
    t = Table(patron_data, colWidths=[W*0.22, W*0.78])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))

    # ─── Datos del trabajador ──────────────────────
    elements.append(Paragraph("DATOS DEL TRABAJADOR", s['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=0.5,
                                color=COLOR_LIGHT_GRAY))

    nombre = f"{empleado.get('nombre', '')} {empleado.get('apellidos', '')}"
    trabajador_data = [
        [Paragraph("Nombre completo", s['Label']),
         Paragraph(nombre, s['ValueBold'])],
        [Paragraph("RFC", s['Label']),
         Paragraph(empleado.get('rfc', '—'), s['ValueBold'])],
        [Paragraph("CURP", s['Label']),
         Paragraph(empleado.get('curp', '—'), s['ValueBold'])],
        [Paragraph("Salario diario", s['Label']),
         Paragraph(f"${float(empleado.get('salario_diario', 0)):,.2f}", s['ValueBold'])],
    ]
    t = Table(trabajador_data, colWidths=[W*0.22, W*0.78])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))

    # ─── Datos del accidente ───────────────────────
    elements.append(Paragraph("DATOS DEL ACCIDENTE / ENFERMEDAD", s['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=0.5,
                                color=COLOR_LIGHT_GRAY))

    tipo_label = _TIPOS_RIESGO.get(riesgo.get('tipo_riesgo', 'otro'),
                                    riesgo.get('tipo_riesgo', 'Otro'))
    accidente_data = [
        [Paragraph("Tipo", s['Label']),
         Paragraph(tipo_label, s['ValueBold'])],
        [Paragraph("Fecha del reporte", s['Label']),
         Paragraph(_fecha_iso(riesgo.get('fecha_reporte')), s['Value'])],
        [Paragraph("Descripción de los hechos", s['Label']),
         Paragraph(riesgo.get('descripcion') or '—', s['Value'])],
    ]
    t = Table(accidente_data, colWidths=[W*0.22, W*0.78])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    elements.append(t)
    elements.append(Spacer(1, 6*mm))

    # ─── Firmas ─────────────────────────────────────
    elements.append(HRFlowable(width="60%", thickness=0.5,
                                color=COLOR_DARK))
    elements.append(Paragraph(
        "Firma del patrón o representante legal", s['Watermark']))
    elements.append(Spacer(1, 8*mm))
    elements.append(HRFlowable(width="60%", thickness=0.5,
                                color=COLOR_DARK))
    elements.append(Paragraph(
        "Firma del trabajador", s['Watermark']))
    elements.append(Spacer(1, 8*mm))
    elements.append(HRFlowable(width="60%", thickness=0.5,
                                color=COLOR_DARK))
    elements.append(Paragraph(
        "Firma del médico (sello de la unidad médica)", s['Watermark']))
    elements.append(Spacer(1, 4*mm))

    # ─── Nota legal ─────────────────────────────────
    elements.append(Paragraph(
        "ST-7: Formato de aviso inicial. Debe presentarse ante el IMSS dentro "
        "de las 72 horas siguientes al evento. Generado por Balance OS.",
        s['Watermark']))

    # ─── Build ──────────────────────────────────────
    def add_deco(can, doc_obj):
        can.saveState()
        w, h = letter
        can.setStrokeColor(COLOR_LIGHT_GRAY)
        can.setLineWidth(0.5)
        can.line(18*mm, h - 12*mm, w - 18*mm, h - 12*mm)
        can.setFont("Helvetica-Bold", 8)
        can.setFillColor(COLOR_PRIMARY)
        can.drawString(18*mm, h - 10*mm, "BALANCE OS — Módulo IMSS")
        can.setFont("Helvetica", 7)
        can.setFillColor(COLOR_GRAY)
        can.drawRightString(w - 18*mm, 12*mm, f"Página {doc_obj.page}")
        can.line(18*mm, 15*mm, w - 18*mm, 15*mm)
        can.drawCentredString(w/2, 10*mm,
                               "Generado por Balance OS — balanceos.com")
        can.restoreState()

    doc.build(elements, onFirstPage=add_deco, onLaterPages=add_deco)
    return buffer.getvalue()
