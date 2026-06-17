"""
Balance OS — Router de Documentos (subida/descarga/listado)
"""
import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pathlib import Path

from app.database import get_db
from app.models import Documento, Cliente
from app.schemas import DocumentoResponse
from app.routers.auth import verificar_token, verificar_usuario_actual
from app.dependencies import get_despacho_id
from app.routers.clientes import verificar_propiedad_o_admin

router = APIRouter(prefix="/documentos", tags=["documentos"])

# Directorio donde se guardan los archivos
UPLOAD_DIR = Path(os.getenv("DOCUMENTOS_DIR", "./storage/documentos"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".gif",
    ".doc", ".docx", ".xls", ".xlsx",
    ".xml", ".txt", ".zip",
}


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


@router.get("/{cliente_id}", response_model=List[DocumentoResponse])
async def listar_documentos(
    cliente_id: int,
    tipo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista los documentos de un cliente (con filtro opcional por tipo)."""
    # Verificar que el cliente existe y el usuario tiene acceso
    await verificar_propiedad_o_admin(cliente_id, usuario, db)

    query = select(Documento).where(Documento.cliente_id == cliente_id)
    if tipo:
        query = query.where(Documento.tipo == tipo)
    query = query.order_by(Documento.created_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{cliente_id}", response_model=DocumentoResponse, status_code=201)
async def subir_documento(
    cliente_id: int,
    archivo: UploadFile = File(...),
    tipo: str = Form("otro"),
    notas: str = Form(""),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Sube un archivo asociado a un cliente."""
    # Verificar acceso al cliente
    await verificar_propiedad_o_admin(cliente_id, usuario, db)

    # Validar extensión
    ext = Path(archivo.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extensión no permitida: {ext}. Permitidas: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Validar tamaño (leer contenido)
    content = await archivo.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Archivo muy grande. Máximo 10 MB")

    # Crear nombre único
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{archivo.filename}"
    relative_path = f"cliente_{cliente_id}/{safe_name}"
    full_path = UPLOAD_DIR / relative_path
    full_path.parent.mkdir(parents=True, exist_ok=True)

    # Guardar archivo
    with open(full_path, "wb") as f:
        f.write(content)

    # Crear registro en DB
    doc = Documento(
        cliente_id=cliente_id,
        nombre=archivo.filename,
        tipo=tipo,
        archivo_path=str(full_path),
        notas=notas.strip() if notas else None,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/descargar/{doc_id}")
async def descargar_documento(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Descarga un archivo por ID (primero verifica acceso al cliente)."""
    result = await db.execute(select(Documento).where(Documento.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    # Verificar acceso al cliente
    await verificar_propiedad_o_admin(doc.cliente_id, usuario, db)

    if not os.path.exists(doc.archivo_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado en disco")

    from fastapi.responses import FileResponse
    return FileResponse(
        doc.archivo_path,
        media_type="application/octet-stream",
        filename=doc.nombre,
    )


@router.delete("/{doc_id}", status_code=204)
async def eliminar_documento(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Elimina un documento (archivo + registro DB)."""
    result = await db.execute(select(Documento).where(Documento.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    # Verificar acceso al cliente
    await verificar_propiedad_o_admin(doc.cliente_id, usuario, db)

    # Eliminar archivo físico
    if doc.archivo_path and os.path.exists(doc.archivo_path):
        os.remove(doc.archivo_path)

    await db.delete(doc)
    await db.commit()
