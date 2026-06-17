"""Estilos base y utilidades para PDFs de Balance OS."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.pdfgen import canvas
from io import BytesIO
import os

# Paleta Balance OS dark theme adaptada para PDF (fondo blanco, acentos oscuros)
COLOR_PRIMARY = HexColor("#1A2E44")      # Azul noche
COLOR_ACCENT = HexColor("#10B981")       # Esmeralda
COLOR_DARK = HexColor("#0A0A0A")         # Casi negro
COLOR_GRAY = HexColor("#6B7280")         # Gris medio
COLOR_LIGHT_GRAY = HexColor("#E5E7EB")   # Gris claro
COLOR_BG = HexColor("#F5F5F5")           # Fondo sutil
COLOR_WHITE = white

FONT_NAME = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_ITALIC = "Helvetica-Oblique"


def get_styles():
    """Retorna diccionario de estilos de párrafo para PDFs."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        'DocTitle', fontName=FONT_BOLD, fontSize=18, leading=22,
        textColor=COLOR_PRIMARY, alignment=TA_LEFT, spaceAfter=6*mm,
    ))
    styles.add(ParagraphStyle(
        'DocSubtitle', fontName=FONT_NAME, fontSize=11, leading=14,
        textColor=COLOR_GRAY, alignment=TA_LEFT, spaceAfter=4*mm,
    ))
    styles.add(ParagraphStyle(
        'SectionHeader', fontName=FONT_BOLD, fontSize=12, leading=16,
        textColor=COLOR_PRIMARY, alignment=TA_LEFT,
        spaceBefore=8*mm, spaceAfter=3*mm,
    ))
    styles.add(ParagraphStyle(
        'Label', fontName=FONT_BOLD, fontSize=9, leading=12,
        textColor=COLOR_GRAY, alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        'Value', fontName=FONT_NAME, fontSize=10, leading=13,
        textColor=COLOR_DARK, alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        'ValueBold', fontName=FONT_BOLD, fontSize=10, leading=13,
        textColor=COLOR_DARK, alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        'TableHeader', fontName=FONT_BOLD, fontSize=8, leading=10,
        textColor=COLOR_WHITE, alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        'TableCell', fontName=FONT_NAME, fontSize=8, leading=10,
        textColor=COLOR_DARK, alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        'TableCellRight', fontName=FONT_NAME, fontSize=8, leading=10,
        textColor=COLOR_DARK, alignment=TA_RIGHT,
    ))
    styles.add(ParagraphStyle(
        'Footer', fontName=FONT_NAME, fontSize=7, leading=9,
        textColor=COLOR_GRAY, alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        'Watermark', fontName=FONT_ITALIC, fontSize=8, leading=10,
        textColor=HexColor("#D1D5DB"), alignment=TA_CENTER,
    ))
    return styles


def build_pdf(elements, title="Documento", pagesize=letter) -> bytes:
    """Construye PDF en memoria y retorna bytes."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=pagesize,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=15*mm, bottomMargin=20*mm,
        title=title, author="Balance OS",
    )

    def add_page_decorators(canvas_obj, doc_obj):
        """Header y footer en cada página."""
        canvas_obj.saveState()
        w, h = pagesize

        # Línea sutil superior
        canvas_obj.setStrokeColor(COLOR_LIGHT_GRAY)
        canvas_obj.setLineWidth(0.5)
        canvas_obj.line(20*mm, h - 12*mm, w - 20*mm, h - 12*mm)

        # Logo / nombre en header
        canvas_obj.setFont(FONT_BOLD, 8)
        canvas_obj.setFillColor(COLOR_PRIMARY)
        canvas_obj.drawString(20*mm, h - 10*mm, "BALANCE OS")

        # Número de página
        canvas_obj.setFont(FONT_NAME, 7)
        canvas_obj.setFillColor(COLOR_GRAY)
        canvas_obj.drawRightString(w - 20*mm, 12*mm, f"Página {doc_obj.page}")

        # Línea sutil inferior
        canvas_obj.setStrokeColor(COLOR_LIGHT_GRAY)
        canvas_obj.line(20*mm, 15*mm, w - 20*mm, 15*mm)

        # Footer text
        canvas_obj.drawCentredString(w/2, 10*mm,
                                     "Generado por Balance OS — balanceos.com")

        canvas_obj.restoreState()

    doc.build(elements, onFirstPage=add_page_decorators,
              onLaterPages=add_page_decorators)
    return buffer.getvalue()


def peso_mxn(amount) -> str:
    """Formatea cantidad como pesos mexicanos."""
    if amount is None:
        return "$0.00"
    return f"${float(amount):,.2f}"


def fecha_format(dt):
    """Formatea fecha en formato legible mexicano."""
    if dt is None:
        return "—"
    from datetime import datetime
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
    meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return f"{dt.day} de {meses[dt.month-1]} de {dt.year}"


def field_row(label, value, styles):
    """Crea una fila de etiqueta: valor."""
    return Paragraph(f"<b>{label}:</b> {value or '—'}", styles['Value'])
