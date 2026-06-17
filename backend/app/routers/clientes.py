"""
Balance OS — Router de Clientes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional
from fastapi.responses import StreamingResponse
import csv, io

from app.database import get_db
from app.models import Cliente, Usuario, EstatusCliente, RegimenFiscal
from app.schemas import ClienteCreate, ClienteUpdate, ClienteResponse
from app.routers.auth import verificar_token, verificar_usuario_actual
from app.dependencies import get_despacho_id

router = APIRouter(prefix="/clientes", tags=["clientes"])


async def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


async def verificar_propiedad_o_admin(cliente_id: int, usuario: dict, db: AsyncSession) -> Cliente:
    """Verifica que el cliente exista y que el usuario sea admin o el asesor asignado."""
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    # Multi-tenancy: verificar despacho del usuario
    if usuario.get("despacho_id") and cliente.despacho_id != usuario.get("despacho_id"):
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    # Admin puede modificar cualquier cliente
    if usuario.get("rol") == "admin":
        return cliente
    # Asesor solo puede modificar sus propios clientes
    if cliente.asesor_id != usuario.get("id"):
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar este cliente")
    return cliente


@router.get("/stats")
async def obtener_stats(
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Retorna estadisticas de clientes para el dashboard."""
    # Filtro base por permisos de usuario
    filter_cond = None
    if usuario.get("rol") != "admin":
        filter_cond = (Cliente.asesor_id == usuario["id"])

    # Total (con filtro si aplica) + multi-tenancy
    total_query = select(func.count()).select_from(Cliente).where(Cliente.despacho_id == despacho_id)
    if filter_cond is not None:
        total_query = total_query.where(filter_cond)
    result = await db.execute(total_query)
    total = result.scalar() or 0

    # Por estatus
    stats = {"total": total}
    for estatus in EstatusCliente:
        q = select(func.count()).select_from(Cliente).where(
            Cliente.estatus == estatus.value,
            Cliente.despacho_id == despacho_id,
        )
        if filter_cond is not None:
            q = q.where(filter_cond)
        result = await db.execute(q)
        stats[estatus.value] = result.scalar() or 0

    return stats


@router.get("/vencimientos")
async def obtener_vencimientos(
    dias: int = Query(90, description="Días hacia adelante para buscar vencimientos"),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Retorna clientes con vencimientos próximos (FIEL, REPSE, PLD)."""
    from datetime import datetime, timedelta

    ahora = datetime.utcnow()
    limite = ahora + timedelta(days=dias)

    # Filtro de permisos
    filter_cond = None
    if usuario.get("rol") != "admin":
        filter_cond = (Cliente.asesor_id == usuario["id"])

    # Construir query base con multi-tenancy
    query = select(Cliente).where(
        or_(
            Cliente.fiel_vencimiento.isnot(None),
            Cliente.repse_vencimiento.isnot(None),
            Cliente.pld_vencimiento.isnot(None),
        ),
        Cliente.despacho_id == despacho_id,
    )

    if filter_cond is not None:
        query = query.where(filter_cond)

    result = await db.execute(query)
    clientes = result.scalars().all()

    alertas = []
    for c in clientes:
        cliente_alerts = []

        # FIEL
        if c.fiel_vencimiento:
            dias_rest = (c.fiel_vencimiento - ahora).days
            cliente_alerts.append({
                "tipo": "fiel",
                "label": "FIEL",
                "vencimiento": c.fiel_vencimiento.isoformat(),
                "dias_restantes": dias_rest,
                "criticidad": "critico" if dias_rest <= 7 else ("alerta" if dias_rest <= 30 else "aviso"),
            })

        # REPSE
        if c.repse_vencimiento:
            dias_rest = (c.repse_vencimiento - ahora).days
            if dias_rest <= dias:
                cliente_alerts.append({
                    "tipo": "repse",
                    "label": "REPSE",
                    "vencimiento": c.repse_vencimiento.isoformat(),
                    "dias_restantes": dias_rest,
                    "criticidad": "critico" if dias_rest <= 7 else ("alerta" if dias_rest <= 30 else "aviso"),
                })

        # PLD
        if c.pld_vencimiento:
            dias_rest = (c.pld_vencimiento - ahora).days
            if dias_rest <= dias:
                cliente_alerts.append({
                    "tipo": "pld",
                    "label": "PLD",
                    "vencimiento": c.pld_vencimiento.isoformat(),
                    "dias_restantes": dias_rest,
                    "criticidad": "critico" if dias_rest <= 7 else ("alerta" if dias_rest <= 30 else "aviso"),
                })

        if cliente_alerts:
            alertas.append({
                "cliente_id": c.id,
                "rfc": c.rfc,
                "razon_social": c.razon_social,
                "estatus": c.estatus,
                "alertas": cliente_alerts,
            })

    # Ordenar: críticos primero, luego por fecha más próxima
    alertas.sort(key=lambda x: min(
        (a["dias_restantes"] for a in x["alertas"]),
        default=999
    ))

    return alertas


@router.get("/exportar/csv")
async def exportar_csv(
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Exporta clientes a CSV."""
    # Misma lógica de filtros que listar + multi-tenancy
    query = select(Cliente).where(Cliente.despacho_id == despacho_id)
    if usuario.get("rol") != "admin":
        query = query.where(Cliente.asesor_id == usuario["id"])
    query = query.order_by(Cliente.razon_social)

    result = await db.execute(query)
    clientes = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "RFC", "Razon Social", "Regimen Fiscal", "Tipo Persona",
        "Email", "Telefono", "Direccion", "Estatus",
        "Tiene REPSE", "REPSE Vencimiento", "Tiene PLD", "PLD Vencimiento",
        "FIEL Vencimiento", "Notas", "Asesor ID", "Creado", "Actualizado",
    ])
    for c in clientes:
        writer.writerow([
            c.rfc, c.razon_social, c.regimen_fiscal, c.tipo_persona,
            c.email or "", c.telefono or "", c.direccion or "", c.estatus,
            c.tiene_repse, c.repse_vencimiento.isoformat() if c.repse_vencimiento else "",
            c.tiene_pld, c.pld_vencimiento.isoformat() if c.pld_vencimiento else "",
            c.fiel_vencimiento.isoformat() if c.fiel_vencimiento else "",
            c.notas or "", c.asesor_id or "",
            c.created_at.isoformat() if c.created_at else "",
            c.updated_at.isoformat() if c.updated_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clientes.csv"},
    )


# ─── Importar CSV ────────────────────────────────

CSV_CLIENTES_HEADERS = {
    "rfc": ["rfc", "RFC"],
    "razon_social": ["razon social", "razon_social", "razón social", "nombre", "cliente"],
    "regimen_fiscal": ["regimen fiscal", "regimen_fiscal", "régimen fiscal", "regimen"],
    "tipo_persona": ["tipo persona", "tipo_persona", "persona"],
    "email": ["email", "correo", "mail"],
    "telefono": ["telefono", "teléfono", "telefono", "tel"],
    "direccion": ["direccion", "dirección", "domicilio"],
}


def _normalize_header(h: str) -> str:
    return h.strip().lower().replace("'", "").replace('"', "")


def _map_csv_row(row: dict) -> dict:
    """Mapea fila CSV a campos de Cliente. Retorna dict con campos válidos."""
    mapped = {}
    for field, aliases in CSV_CLIENTES_HEADERS.items():
        for alias in aliases:
            if alias in row:
                val = row[alias].strip()
                if val:
                    mapped[field] = val
                break
    return mapped


@router.post("/importar/csv")
async def importar_csv_clientes(
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Importa clientes desde archivo CSV.
    
    Columnas aceptadas: RFC, Razon Social, Regimen Fiscal, Tipo Persona, Email, Telefono, Direccion.
    Retorna resumen de importación con conteo de éxitos y errores.
    """
    if not archivo.filename or not archivo.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .csv")

    contenido = await archivo.read()
    try:
        texto = contenido.decode("utf-8-sig")
    except UnicodeDecodeError:
        texto = contenido.decode("latin-1")

    reader = csv.DictReader(io.StringIO(texto))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV vacío o sin encabezados")

    # Normalizar encabezados
    headers = {_normalize_header(h): h for h in reader.fieldnames}
    regimenes_validos = [r.value for r in RegimenFiscal]

    importados = 0
    errores = []

    for i, row in enumerate(reader, start=2):  # fila 2+ (1=headers)
        try:
            # Normalizar keys del row
            norm_row = {_normalize_header(k): v for k, v in row.items() if k}
            mapped = _map_csv_row(norm_row)

            if "rfc" not in mapped or not mapped["rfc"]:
                errores.append({"fila": i, "error": "RFC requerido"})
                continue
            if "razon_social" not in mapped or not mapped["razon_social"]:
                errores.append({"fila": i, "error": "Razon Social requerida"})
                continue

            rfc = mapped["rfc"].upper().strip()
            regimen = mapped.get("regimen_fiscal", "607").strip()
            if regimen not in regimenes_validos:
                regimen = "607"  # default: PM General

            # Validar RFC duplicado
            existente = await db.execute(
                select(Cliente).where(Cliente.rfc == rfc, Cliente.despacho_id == despacho_id)
            )
            if existente.scalar_one_or_none():
                errores.append({"fila": i, "rfc": rfc, "error": "RFC duplicado en este despacho"})
                continue

            cliente = Cliente(
                rfc=rfc,
                razon_social=mapped["razon_social"].strip(),
                regimen_fiscal=regimen,
                tipo_persona=mapped.get("tipo_persona", "fisica").strip().lower(),
                email=mapped.get("email", "").strip() or None,
                telefono=mapped.get("telefono", "").strip() or None,
                direccion=mapped.get("direccion", "").strip() or None,
                asesor_id=usuario.get("id"),
                despacho_id=despacho_id,
            )
            db.add(cliente)
            importados += 1

        except Exception as e:
            errores.append({"fila": i, "error": str(e)})

    await db.commit()

    return {
        "mensaje": f"Importación completada: {importados} clientes importados, {len(errores)} errores",
        "importados": importados,
        "errores": errores,
        "total_filas": i - 1 if reader.line_num else 0,
    }


@router.get("/", response_model=List[ClienteResponse])
async def listar_clientes(
    estatus: Optional[str] = None,
    asesor_id: Optional[int] = None,
    q: Optional[str] = Query(None, description="Busqueda por RFC, razon social, email o telefono"),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    query = select(Cliente).where(Cliente.despacho_id == despacho_id)

    # Filtro por asesor: si no es admin, solo ve sus clientes
    if usuario.get("rol") != "admin":
        query = query.where(Cliente.asesor_id == usuario["id"])
    elif asesor_id:
        query = query.where(Cliente.asesor_id == asesor_id)

    # Filtro por estatus
    if estatus:
        query = query.where(Cliente.estatus == estatus)

    # Busqueda global
    if q:
        search = f"%{q}%"
        query = query.where(
            or_(
                Cliente.rfc.ilike(search),
                Cliente.razon_social.ilike(search),
                Cliente.email.ilike(search),
                Cliente.telefono.ilike(search),
            )
        )

    query = query.order_by(Cliente.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{cliente_id}", response_model=ClienteResponse)
async def obtener_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    return await verificar_propiedad_o_admin(cliente_id, usuario, db)


@router.post("/", response_model=ClienteResponse, status_code=201)
async def crear_cliente(
    data: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    # Validar regimen_fiscal
    valores_validos = [r.value for r in RegimenFiscal]
    if data.regimen_fiscal not in valores_validos:
        raise HTTPException(status_code=400, detail=f"Regimen fiscal invalido. Opciones: {', '.join(valores_validos)}")

    # Validar RFC duplicado (dentro del mismo despacho)
    existente = await db.execute(
        select(Cliente).where(Cliente.rfc == data.rfc, Cliente.despacho_id == despacho_id)
    )
    if existente.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Ya existe un cliente con RFC {data.rfc}")

    cliente = Cliente(
        rfc=data.rfc,
        razon_social=data.razon_social,
        regimen_fiscal=data.regimen_fiscal,
        tipo_persona=data.tipo_persona,
        email=data.email,
        telefono=data.telefono,
        direccion=data.direccion,
        notas=data.notas,
        tiene_repse=data.tiene_repse,
        repse_vencimiento=data.repse_vencimiento,
        tiene_pld=data.tiene_pld,
        pld_vencimiento=data.pld_vencimiento,
        fiel_vencimiento=data.fiel_vencimiento,
        asesor_id=usuario.get("id"),
        despacho_id=despacho_id,
    )
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.put("/{cliente_id}", response_model=ClienteResponse)
async def actualizar_cliente(
    cliente_id: int,
    data: ClienteUpdate,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    cliente = await verificar_propiedad_o_admin(cliente_id, usuario, db)

    # Validar regimen_fiscal si se envía
    if data.regimen_fiscal is not None:
        valores_validos = [r.value for r in RegimenFiscal]
        if data.regimen_fiscal not in valores_validos:
            raise HTTPException(status_code=400, detail=f"Regimen fiscal invalido. Opciones: {', '.join(valores_validos)}")

    # Validar estatus si se envía
    if data.estatus is not None:
        valores_estatus = [e.value for e in EstatusCliente]
        if data.estatus not in valores_estatus:
            raise HTTPException(status_code=400, detail=f"Estatus invalido. Opciones: {', '.join(valores_estatus)}")

    # Validar RFC duplicado si se cambia
    if data.rfc is not None and data.rfc != cliente.rfc:
        existente = await db.execute(
            select(Cliente).where(Cliente.rfc == data.rfc, Cliente.despacho_id == despacho_id)
        )
        if existente.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Ya existe otro cliente con RFC {data.rfc}")

    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(cliente, campo, valor)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}", status_code=204)
async def eliminar_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    cliente = await verificar_propiedad_o_admin(cliente_id, usuario, db)
    await db.delete(cliente)
    await db.commit()
