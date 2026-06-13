"""
Balance OS — Servicio de actualización de listas EFOS desde el SAT

Descarga y parsea las listas negras del SAT (69, 69-B, definitivos, sentencias)
desde las fuentes oficiales con múltiples fallbacks.
"""
import asyncio
import csv
import io
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, field

import httpx  # async HTTP client

logger = logging.getLogger("efos_scraper")

# ─── Fuentes oficiales del SAT ──────────────────────
# URLs del portal SAT para listas EFOS (actualizadas 2026)
SAT_SOURCES = {
    "69-B": [
        "https://www.sat.gob.mx/consultas/10783/conoce-los-articulos-69-y-69-b-del-cff",
        "https://omawww.sat.gob.mx/cifras_sat/Paginas/datos/vinculo.html?page=ListCompleta69B.html",
    ],
    "69": [
        "https://www.sat.gob.mx/consultas/10783/conoce-los-articulos-69-y-69-b-del-cff",
        "https://omawww.sat.gob.mx/cifras_sat/Paginas/datos/vinculo.html?page=ListCompleta69.html",
    ],
    "definitivos": [
        "https://www.sat.gob.mx/consultas/10783/conoce-los-articulos-69-y-69-b-del-cff",
    ],
    "sentencias": [
        "https://www.sat.gob.mx/consultas/10783/conoce-los-articulos-69-y-69-b-del-cff",
    ],
}

# URLs directas de descarga (formato CSV/Excel publicado por el SAT)
SAT_DIRECT_DOWNLOADS = [
    "https://omawww.sat.gob.mx/cifras_sat/Documents/Listado_69-B.csv",
    "https://omawww.sat.gob.mx/cifras_sat/Documents/Listado_69.csv",
    "https://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Definitivos.csv",
    "https://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Sentencias.csv",
    "https://www.sat.gob.mx/cs/Satellite?c=Page&pagename=sat%2FPage%2FListaCompleta69B",
    "https://www.sat.gob.mx/cs/Satellite?c=Page&pagename=sat%2FPage%2FListaCompleta69",
]

# Timeout y retries (SAT es lento — timeouts cortos con pocos retries)
REQUEST_TIMEOUT = 12  # segundos
MAX_RETRIES = 1


@dataclass
class EfosEntry:
    """Una entrada individual de lista EFOS."""
    rfc: str
    tipo_lista: str  # "69", "69-B", "definitivos", "sentencias"
    fecha_publicacion: Optional[datetime] = None
    razon_social: Optional[str] = None


@dataclass
class UpdateResult:
    """Resultado de una actualización."""
    exitoso: bool
    total_rfcs: int = 0
    nuevos: int = 0
    actualizados: int = 0
    errores: list = field(default_factory=list)
    fuente: str = ""
    mensaje: str = ""


# ─── Parsers ────────────────────────────────────────

def _parse_rfc(raw: str) -> Optional[str]:
    """Limpia y valida un RFC mexicano."""
    if not raw:
        return None
    rfc = raw.strip().upper()
    # Eliminar caracteres no alfanuméricos
    rfc = re.sub(r"[^A-Z0-9]", "", rfc)
    # RFC persona moral: 12 chars, persona física: 13 chars
    if 12 <= len(rfc) <= 13:
        return rfc
    return None


def _parse_csv(content: str) -> list[EfosEntry]:
    """Intenta parsear contenido CSV en entradas EFOS."""
    entries = []
    reader = csv.reader(io.StringIO(content))
    
    for row in reader:
        if not row or len(row) < 1:
            continue
        
        # Saltar encabezados
        first_cell = row[0].strip().upper()
        if first_cell in ("RFC", "R.F.C.", "REGISTRO FEDERAL", "NOMBRE", "RAZON SOCIAL", ""):
            continue
        
        rfc = _parse_rfc(row[0])
        if not rfc:
            continue
        
        razon_social = row[1].strip() if len(row) > 1 else None
        
        entries.append(EfosEntry(
            rfc=rfc,
            tipo_lista="",  # Se asigna después
            razon_social=razon_social,
        ))
    
    return entries


def _parse_html(content: str, tipo_lista: str) -> list[EfosEntry]:
    """Intenta extraer RFCs de una página HTML del SAT."""
    entries = []
    
    # Patrón RFC mexicano: 3-4 letras + 6 dígitos + 3 caracteres
    rfc_pattern = re.compile(r'\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b')
    
    for match in rfc_pattern.finditer(content):
        rfc = match.group(1)
        entries.append(EfosEntry(
            rfc=rfc,
            tipo_lista=tipo_lista,
        ))
    
    return entries


def _parse_excel_like(content: str) -> list[EfosEntry]:
    """Intenta parsear contenido tabular (TSV, pipe-delimited, etc.)."""
    entries = []
    
    for line in content.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        
        # Intentar diferentes delimitadores
        for delim in ["\t", "|", ";"]:
            if delim in line:
                parts = [p.strip() for p in line.split(delim)]
                rfc = _parse_rfc(parts[0])
                if rfc:
                    entries.append(EfosEntry(
                        rfc=rfc,
                        tipo_lista="",
                        razon_social=parts[1] if len(parts) > 1 else None,
                    ))
                break
        else:
            # Sin delimitador — ¿es un RFC en una línea?
            rfc = _parse_rfc(line)
            if rfc:
                entries.append(EfosEntry(rfc=rfc, tipo_lista=""))
    
    return entries


# ─── Fetcher ────────────────────────────────────────

async def _fetch_url(url: str) -> Optional[str]:
    """Descarga una URL con retry y timeout."""
    async with httpx.AsyncClient(
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "text/html,text/csv,text/plain,application/vnd.ms-excel,*/*",
        },
    ) as client:
        for attempt in range(MAX_RETRIES + 1):
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                return resp.text
            except Exception as e:
                logger.warning(f"Intento {attempt+1}/{MAX_RETRIES+1} fallido para {url}: {e}")
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(2 ** attempt)  # exponential backoff
    
    return None


async def _descargar_lista(tipo_lista: str) -> list[EfosEntry]:
    """
    Descarga una lista EFOS desde las fuentes del SAT.
    Prueba múltiples URLs y formatos.
    """
    all_entries: list[EfosEntry] = []
    
    # 1. Intentar CSV directo
    csv_urls = [
        f"http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_{tipo_lista.replace('-', '')}.csv",
        f"http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_{tipo_lista}.csv",
    ]
    
    for url in csv_urls:
        content = await _fetch_url(url)
        if content and ("RFC" in content.upper() or len(content) > 100):
            entries = _parse_csv(content)
            if entries:
                logger.info(f"CSV descargado de {url}: {len(entries)} RFCs")
                for e in entries:
                    e.tipo_lista = tipo_lista
                return entries
    
    # 2. Intentar URLs HTML del SAT
    sources = SAT_SOURCES.get(tipo_lista, [])
    for url in sources:
        content = await _fetch_url(url)
        if content and len(content) > 500:
            # Intentar parsear como HTML
            entries = _parse_html(content, tipo_lista)
            if entries:
                logger.info(f"HTML parseado de {url}: {len(entries)} RFCs ({tipo_lista})")
                return entries
            
            # Intentar parsear como tabular
            entries = _parse_excel_like(content)
            if entries:
                logger.info(f"Tabular parseado de {url}: {len(entries)} RFCs ({tipo_lista})")
                for e in entries:
                    e.tipo_lista = tipo_lista
                return entries
    
    logger.warning(f"No se pudo descargar la lista {tipo_lista} desde ninguna fuente")
    return []


async def actualizar_listas_efos(db_session_factory) -> UpdateResult:
    """
    Actualiza todas las listas EFOS desde el SAT.
    
    Descarga cada tipo de lista (69, 69-B, definitivos, sentencias),
    parsea los RFCs, y los inserta/actualiza en la base de datos.
    """
    from sqlalchemy import select
    from app.models.tesoreria import ListaEfos
    
    result = UpdateResult(exitoso=False, fuente="SAT")
    all_entries: list[EfosEntry] = []
    
    # Descargar cada tipo de lista
    for tipo in ["69", "69-B", "definitivos", "sentencias"]:
        try:
            entries = await _descargar_lista(tipo)
            all_entries.extend(entries)
            logger.info(f"Lista {tipo}: {len(entries)} RFCs descargados")
        except Exception as e:
            result.errores.append(f"Error descargando {tipo}: {str(e)}")
            logger.error(f"Error descargando {tipo}: {e}")
    
    if not all_entries:
        result.mensaje = "No se pudo descargar ninguna lista del SAT. El portal podría estar inaccesible."
        return result
    
    # Insertar/actualizar en DB
    async with db_session_factory() as db:
        try:
            for entry in all_entries:
                # Verificar si ya existe
                existing = await db.execute(
                    select(ListaEfos).where(
                        ListaEfos.rfc == entry.rfc,
                        ListaEfos.tipo_lista == entry.tipo_lista,
                        ListaEfos.activo == True,
                    )
                )
                existing = existing.scalar_one_or_none()
                
                if existing:
                    # Actualizar fecha de consulta
                    existing.fecha_consulta = datetime.now(timezone.utc)
                    result.actualizados += 1
                else:
                    # Insertar nuevo
                    db.add(ListaEfos(
                        rfc=entry.rfc,
                        tipo_lista=entry.tipo_lista,
                        fecha_publicacion=entry.fecha_publicacion,
                        fecha_consulta=datetime.now(timezone.utc),
                    ))
                    result.nuevos += 1
            
            await db.commit()
            
            result.total_rfcs = len(all_entries)
            result.exitoso = True
            result.mensaje = (
                f"Actualización completada desde el SAT: "
                f"{result.total_rfcs} RFCs procesados "
                f"({result.nuevos} nuevos, {result.actualizados} actualizados)"
            )
            
        except Exception as e:
            await db.rollback()
            result.errores.append(f"Error guardando en DB: {str(e)}")
            logger.error(f"Error DB: {e}")
    
    return result


async def cargar_desde_csv(
    contenido: str,
    tipo_lista: str,
    db_session_factory,
) -> UpdateResult:
    """
    Carga RFCs desde un CSV subido por el usuario.
    
    Formato esperado: RFC en primera columna, opcionalmente razón social en segunda.
    """
    from sqlalchemy import select
    from app.models.tesoreria import ListaEfos
    
    result = UpdateResult(exitoso=False, fuente="CSV manual")
    
    entries = _parse_csv(contenido)
    if not entries:
        result.mensaje = "No se encontraron RFCs válidos en el archivo."
        return result
    
    # Asignar tipo de lista
    for e in entries:
        e.tipo_lista = tipo_lista
    
    async with db_session_factory() as db:
        try:
            for entry in entries:
                existing = await db.execute(
                    select(ListaEfos).where(
                        ListaEfos.rfc == entry.rfc,
                        ListaEfos.tipo_lista == entry.tipo_lista,
                        ListaEfos.activo == True,
                    )
                )
                existing = existing.scalar_one_or_none()
                
                if existing:
                    existing.fecha_consulta = datetime.now(timezone.utc)
                    result.actualizados += 1
                else:
                    db.add(ListaEfos(
                        rfc=entry.rfc,
                        tipo_lista=entry.tipo_lista,
                        fecha_publicacion=datetime.now(timezone.utc),
                        fecha_consulta=datetime.now(timezone.utc),
                    ))
                    result.nuevos += 1
            
            await db.commit()
            
            result.total_rfcs = len(entries)
            result.exitoso = True
            result.mensaje = (
                f"Carga masiva completada: {result.total_rfcs} RFCs "
                f"({result.nuevos} nuevos, {result.actualizados} ya existentes)"
            )
            
        except Exception as e:
            await db.rollback()
            result.errores.append(f"Error guardando: {str(e)}")
    
    return result
