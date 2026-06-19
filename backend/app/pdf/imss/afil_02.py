"""
AFIL-02: Aviso de inscripción del trabajador — Registro o alta en el IMSS.
Genera un PDF con formato similar al oficial para imprimir, firmar y escanear.
"""
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                 Table, TableStyle, HRFlowable)
from app.pdf.base import get_styles, COLOR_PRIMARY, COLOR_GRAY, COLOR_DARK, COLOR_LIGHT_GRAY


def _nss_fmt(nss):
    if not nss:
        return "—"
    nss = nss.replace("-", "").strip()
    if len(nss) == 11:
        return f"{nss[:2]}-{nss[2:5]}-{nss[5:8]}-{nss[8:]}"
    return nss


def _fecha_iso(dt):
    if not dt:
        return "—"
    if isinstance(dt, str):
        from datetime import datetime as dt_mod
        dt = dt_mod.fromisoformat(dt.replace("Z", "+00:00"))
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
             "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    return f"{dt.day} de {meses[dt.month - 1]} de {dt.year}"


def _moneda(val):
    if val is None:
        return "$0.00"
    return f"${float(val):,.2f}"


def generar_afil02(empleado: dict, cliente: dict, alta: dict,
                   fecha: datetime = None) -> bytes:
    """
    Genera PDF del AFIL-02 prellenado.

    Args:
        empleado: dict con nombre, apellidos, rfc, curp, fecha_nacimiento, salario_diario
        cliente: dict con razon_social, rfc as patron
        alta: dict con nss, fecha_efectiva, tipo_movimiento
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
    W = letter[0] - 36*mm  # usable width

    # ─── Header ────────────────────────────────────
    elements.append(Paragraph(
        "INSTITUTO MEXICANO DEL SEGURO SOCIAL", s['DocTitle']))
    elements.append(Paragraph(
        "AVISO DE INSCRIPCIÓN DEL TRABAJADOR", s['DocSubtitle']))
    elements.append(Paragraph(
        "AFIL-02", s['DocSubtitle']))
    elements.append(Spacer(1, 3*mm))

    # Folio y fecha
    folio_data = [
        [Paragraph("Folio", s['Label']),
         Paragraph(f"AFIL02-{alta.get('id', 'N/A')}", s['Value']),
         Paragraph("Fecha de emisión", s['Label']),
         Paragraph(_fecha_iso(fecha), s['Value'])],
    ]
    t = Table(folio_data, colWidths=[W*0.15, W*0.35, W*0.15, W*0.35])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))

    # ─── Sección: Datos del patrón ─────────────────
    elements.append(Paragraph("DATOS DEL PATRÓN", s['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=0.5,
                                color=COLOR_LIGHT_GRAY))

    patron_data = [
        [Paragraph("Razón social / Nombre", s['Label']),
         Paragraph(cliente.get('razon_social', '—'), s['Value'])],
        [Paragraph("RFC", s['Label']),
         Paragraph(cliente.get('rfc', '—'), s['ValueBold'])],
        [Paragraph("Régimen fiscal", s['Label']),
         Paragraph(cliente.get('regimen_fiscal', '—'), s['Value'])],
    ]
    t = Table(patron_data, colWidths=[W*0.22, W*0.78])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))

    # ─── Sección: Datos del trabajador ──────────────
    elements.append(Paragraph("DATOS DEL TRABAJADOR", s['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=0.5,
                                color=COLOR_LIGHT_GRAY))

    nombre_completo = f"{empleado.get('nombre', '')} {empleado.get('apellidos', '')}"
    trabajador_data = [
        [Paragraph("Nombre completo", s['Label']),
         Paragraph(nombre_completo, s['ValueBold'])],
        [Paragraph("RFC", s['Label']),
         Paragraph(empleado.get('rfc', '—'), s['ValueBold'])],
        [Paragraph("CURP", s['Label']),
         Paragraph(empleado.get('curp', '—'), s['ValueBold'])],
        [Paragraph("NSS", s['Label']),
         Paragraph(_nss_fmt(alta.get('nss')), s['ValueBold'])],
        [Paragraph("Fecha de nacimiento", s['Label']),
         Paragraph(_fecha_iso(empleado.get('fecha_nacimiento')), s['Value'])],
        [Paragraph("Salario diario", s['Label']),
         Paragraph(_moneda(empleado.get('salario_diario')), s['ValueBold'])],
    ]
    t = Table(trabajador_data, colWidths=[W*0.22, W*0.78])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4*mm))

    # ─── Sección: Datos del movimiento ──────────────
    elements.append(Paragraph("DATOS DEL MOVIMIENTO", s['SectionHeader']))
    elements.append(HRFlowable(width="100%", thickness=0.5,
                                color=COLOR_LIGHT_GRAY))

    tipo = alta.get('tipo_movimiento', 'alta').capitalize()
    mov_data = [
        [Paragraph("Tipo de movimiento", s['Label']),
         Paragraph(tipo, s['ValueBold'])],
        [Paragraph("Fecha efectiva", s['Label']),
         Paragraph(_fecha_iso(alta.get('fecha_efectiva')), s['ValueBold'])],
    ]
    t = Table(mov_data, colWidths=[W*0.22, W*0.78])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
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
    elements.append(Spacer(1, 4*mm))

    # ─── Nota legal ─────────────────────────────────
    elements.append(Paragraph(
        "Este documento es un formato de apoyo generado por Balance OS. "
        "Debe ser impreso, firmado y presentado ante el IMSS en la subdelegación "
        "correspondiente. Los datos aquí contenidos son responsabilidad del empleador.",
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
