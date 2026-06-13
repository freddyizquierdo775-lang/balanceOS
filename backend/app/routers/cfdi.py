"""Balance OS — Router de CFDI (Timbrado de Nóminas + CSD + PAC)"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
import os
import shutil

from app.database import get_db
from app.models import (
    CfdiRecibo, Recibo, Empleado, CsdCertificado,
    EstatusCFDI, PeriodoNomina,
)
from app.schemas.cfdi import (
    CsdCertificadoCreate, CsdCertificadoResponse,
    CfdiReciboResponse, CfdiTimbrarRequest, CfdiTimbrarResponse,
)
from app.cfdi.generador import (
    generar_cfdi_nomina, guardar_xml,
)
from app.cfdi.pac_adapter import PacAdapter, PacConfig
from app.routers.auth import verificar_token

router = APIRouter(prefix="/cfdi", tags=["cfdi"])

CSD_DIR = "storage/csd"


async def get_usuario(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── CSD (Certificado de Sello Digital) ───────────


@router.post("/csd", response_model=CsdCertificadoResponse, status_code=201)
async def registrar_csd(
    data: CsdCertificadoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    # Si es el primero, activarlo automáticamente
    count = await db.execute(select(func.count(CsdCertificado.id)))
    csd = CsdCertificado(**data.model_dump())
    if count.scalar() == 0:
        csd.activo = True
    db.add(csd)
    await db.commit()
    await db.refresh(csd)
    return csd


@router.get("/csd", response_model=List[CsdCertificadoResponse])
async def listar_csd(
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(CsdCertificado).order_by(CsdCertificado.alias)
    )
    return result.scalars().all()


@router.post("/csd/{csd_id}/upload")
async def subir_csd(
    csd_id: int,
    certificado: UploadFile = File(None, description="Archivo .cer"),
    llave: UploadFile = File(None, description="Archivo .key"),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    """Sube archivos .cer y .key para un certificado CSD."""
    result = await db.execute(select(CsdCertificado).where(CsdCertificado.id == csd_id))
    csd = result.scalar_one_or_none()
    if not csd:
        raise HTTPException(status_code=404, detail="CSD no encontrado")

    os.makedirs(CSD_DIR, exist_ok=True)
    base = f"{CSD_DIR}/csd_{csd_id}"

    updates = {}
    if certificado and certificado.filename:
        ext = os.path.splitext(certificado.filename)[1] or ".cer"
        path = f"{base}{ext}"
        with open(path, "wb") as f:
            shutil.copyfileobj(certificado.file, f)
        updates["certificado_path"] = path
        # Extraer número de certificado del .cer (simplificado)
        numbers = [c for c in certificado.filename if c.isdigit()]
        updates["numero_certificado"] = "".join(numbers)[:20] if numbers else csd.numero_certificado

    if llave and llave.filename:
        ext = os.path.splitext(llave.filename)[1] or ".key"
        path = f"{base}{ext}"
        with open(path, "wb") as f:
            shutil.copyfileobj(llave.file, f)
        updates["llave_path"] = path

    for k, v in updates.items():
        setattr(csd, k, v)
    await db.commit()
    await db.refresh(csd)
    return {"message": "Archivos subidos", "certificado": csd.certificado_path, "llave": csd.llave_path}


@router.put("/csd/{csd_id}/activar", response_model=CsdCertificadoResponse)
async def activar_csd(
    csd_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    """Activa un CSD y desactiva los demás."""
    # Desactivar todos
    await db.execute(
        "UPDATE csd_certificados SET activo = 0"
    )
    # Activar el seleccionado
    result = await db.execute(select(CsdCertificado).where(CsdCertificado.id == csd_id))
    csd = result.scalar_one_or_none()
    if not csd:
        raise HTTPException(status_code=404, detail="CSD no encontrado")
    csd.activo = True
    await db.commit()
    await db.refresh(csd)
    return csd


# ─── PAC Status ───────────────────────────────────


@router.get("/pac-status")
async def pac_status(
    usuario: dict = Depends(get_usuario),
):
    """Devuelve el estado de la conexión PAC."""
    cfg = PacConfig.cargar()
    return {
        "provider": cfg.provider,
        "configured": bool(cfg.api_key and cfg.provider != "mock"),
        "endpoint": cfg.endpoint or "N/A",
        "mock_mode": cfg.provider == "mock",
    }


# ─── Timbrado ─────────────────────────────────────


@router.post("/timbrar", response_model=CfdiTimbrarResponse)
async def timbrar_recibo(
    data: CfdiTimbrarRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    """Timbra un CFDI de nómina vía PAC (real o mock)."""
    # 1. Obtener recibo
    result = await db.execute(
        select(Recibo)
        .options(selectinload(Recibo.periodo), selectinload(Recibo.empleado))
        .where(Recibo.id == data.recibo_id)
    )
    recibo = result.scalar_one_or_none()
    if not recibo:
        raise HTTPException(status_code=404, detail="Recibo no encontrado")

    # 2. Verificar duplicado
    existente = await db.execute(
        select(CfdiRecibo).where(CfdiRecibo.recibo_id == data.recibo_id)
    )
    if existente.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Este recibo ya tiene un CFDI generado")

    # 3. Obtener CSD
    csd_result = await db.execute(
        select(CsdCertificado).where(CsdCertificado.activo == True).limit(1)
    )
    csd = csd_result.scalar_one_or_none()
    if not csd:
        csd = CsdCertificado(
            alias="MOCK-DEV", rfc_emisor="MOCK000101MOCK",
            regimen_fiscal="607", numero_certificado="00000000000000000000",
        )
        db.add(csd)
        await db.flush()

    # 4. Siguiente folio
    max_folio = await db.execute(select(func.max(CfdiRecibo.folio)))
    folio = (max_folio.scalar() or 0) + 1

    # 5. Generar XML CFDI
    empleado = recibo.empleado
    cfdi_data = generar_cfdi_nomina(
        recibo=recibo, empleado=empleado, emisor=csd, folio=folio,
    )

    # 6. Timbrar vía PAC
    pac = PacAdapter.crear()
    try:
        # Leer CSD files para PAC real
        csd_pem = ""
        llave_pem = ""
        if csd.certificado_path and os.path.exists(csd.certificado_path):
            with open(csd.certificado_path) as f:
                csd_pem = f.read()
        if csd.llave_path and os.path.exists(csd.llave_path):
            with open(csd.llave_path) as f:
                llave_pem = f.read()

        resultado_pac = pac.timbrar(
            xml=cfdi_data["xml"],
            csd_pem=csd_pem,
            llave_pem=llave_pem,
            contrasena=csd.contrasena or "",
        )
        estatus = EstatusCFDI.TIMBRADO
        error_msg = None
    except Exception as e:
        estatus = EstatusCFDI.ERROR
        error_msg = str(e)
        # En error, guardamos el XML generado igual para depuración
        resultado_pac = cfdi_data

    # 7. Guardar XML
    xml_timbrado = resultado_pac.get("xml_timbrado", cfdi_data["xml"])
    xml_path = guardar_xml(xml_timbrado, recibo.id)

    # 8. Guardar en DB
    cfdi_recibo = CfdiRecibo(
        recibo_id=data.recibo_id,
        uuid=resultado_pac.get("uuid", cfdi_data["uuid"]),
        xml_path=xml_path,
        estatus=estatus,
        serie="N",
        folio=folio,
        fecha_timbrado=recibo.created_at or __import__("datetime").datetime.utcnow(),
        cadena_original=cfdi_data["cadena_original"],
        sello_csd=cfdi_data["sello"],
        sello_sat=cfdi_data.get("sello", cfdi_data["sello"][:300]),
        error=error_msg,
    )
    db.add(cfdi_recibo)
    await db.commit()
    await db.refresh(cfdi_recibo)

    return CfdiTimbrarResponse(
        cfdi=CfdiReciboResponse.model_validate(cfdi_recibo),
        uuid=cfdi_recibo.uuid or "",
        xml_preview=xml_timbrado[:500],
    )


# ─── CFDI Recibos ─────────────────────────────────


@router.get("/recibos", response_model=List[CfdiReciboResponse])
async def listar_cfdi_recibos(
    estatus: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    query = select(CfdiRecibo).order_by(CfdiRecibo.created_at.desc())
    if estatus:
        query = query.where(CfdiRecibo.estatus == estatus)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/recibos/{recibo_id}", response_model=CfdiReciboResponse)
async def obtener_cfdi_recibo(
    recibo_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(CfdiRecibo).where(CfdiRecibo.recibo_id == recibo_id)
    )
    cfdi = result.scalar_one_or_none()
    if not cfdi:
        raise HTTPException(status_code=404, detail="No tiene CFDI asociado")
    return cfdi
