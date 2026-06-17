"""Balance OS — Router de Empleados"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
import csv, io

from app.database import get_db
from app.models import Empleado, TipoContrato, TipoJornada, EstatusEmpleado
from app.schemas.empleado import EmpleadoCreate, EmpleadoUpdate, EmpleadoResponse
from app.routers.auth import verificar_token
from app.dependencies import get_despacho_id

router = APIRouter(prefix="/empleados", tags=["empleados"])


async def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


@router.get("/", response_model=List[EmpleadoResponse])
async def listar_empleados(
    q: Optional[str] = Query(None, description="Busqueda por RFC, nombre, apellidos o CURP"),
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
    despacho_id: int = Depends(get_despacho_id),
):
    query = select(Empleado).where(Empleado.despacho_id == despacho_id)

    if q:
        search = f"%{q}%"
        query = query.where(
            or_(
                Empleado.rfc.ilike(search),
                Empleado.nombre.ilike(search),
                Empleado.apellidos.ilike(search),
                Empleado.curp.ilike(search),
            )
        )

    if activo is not None:
        query = query.where(Empleado.activo == activo)

    query = query.order_by(Empleado.apellidos, Empleado.nombre)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{empleado_id}", response_model=EmpleadoResponse)
async def obtener_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
    despacho_id: int = Depends(get_despacho_id),
):
    result = await db.execute(
        select(Empleado).where(Empleado.id == empleado_id, Empleado.despacho_id == despacho_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


@router.post("/", response_model=EmpleadoResponse, status_code=201)
async def crear_empleado(
    data: EmpleadoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
    despacho_id: int = Depends(get_despacho_id),
):
    # Validar RFC duplicado (dentro del mismo despacho)
    existente = await db.execute(
        select(Empleado).where(Empleado.rfc == data.rfc, Empleado.despacho_id == despacho_id)
    )
    if existente.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Ya existe un empleado con RFC {data.rfc}")

    # Validar tipo_contrato
    valores_contrato = {e.value for e in TipoContrato}
    if data.tipo_contrato not in valores_contrato:
        raise HTTPException(status_code=400, detail=f"Tipo contrato invalido. Opciones: {', '.join(valores_contrato)}")

    # Validar tipo_jornada
    valores_jornada = {e.value for e in TipoJornada}
    if data.tipo_jornada not in valores_jornada:
        raise HTTPException(status_code=400, detail=f"Tipo jornada invalido. Opciones: {', '.join(valores_jornada)}")

    emp = Empleado(**data.model_dump(), despacho_id=despacho_id)
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.put("/{empleado_id}", response_model=EmpleadoResponse)
async def actualizar_empleado(
    empleado_id: int,
    data: EmpleadoUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
    despacho_id: int = Depends(get_despacho_id),
):
    result = await db.execute(
        select(Empleado).where(Empleado.id == empleado_id, Empleado.despacho_id == despacho_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(emp, campo, valor)

    await db.commit()
    await db.refresh(emp)
    return emp


@router.delete("/{empleado_id}", status_code=204)
async def eliminar_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
    despacho_id: int = Depends(get_despacho_id),
):
    result = await db.execute(
        select(Empleado).where(Empleado.id == empleado_id, Empleado.despacho_id == despacho_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Soft delete: marcar como inactivo
    emp.activo = False
    emp.estatus = "baja"
    await db.commit()


# ─── Importar CSV ────────────────────────────────

CSV_EMPLEADOS_HEADERS = {
    "rfc": ["rfc", "RFC"],
    "curp": ["curp", "CURP"],
    "nombre": ["nombre", "nombre(s)"],
    "apellidos": ["apellidos", "apellido(s)", "apellido"],
    "salario_diario": ["salario diario", "salario_diario", "salario", "sueldo diario", "sueldo"],
    "tipo_contrato": ["tipo contrato", "tipo_contrato", "contrato"],
    "tipo_jornada": ["tipo jornada", "tipo_jornada", "jornada"],
    "email": ["email", "correo", "mail"],
    "telefono": ["telefono", "teléfono", "telefono", "tel"],
    "fecha_ingreso": ["fecha ingreso", "fecha_ingreso", "ingreso", "antigüedad"],
}


def _normalize_header_emp(h: str) -> str:
    return h.strip().lower().replace("'", "").replace('"', "")


def _map_csv_row_emp(row: dict) -> dict:
    mapped = {}
    for field, aliases in CSV_EMPLEADOS_HEADERS.items():
        for alias in aliases:
            if alias in row:
                val = row[alias].strip()
                if val:
                    mapped[field] = val
                break
    return mapped


@router.post("/importar/csv")
async def importar_csv_empleados(
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario_actual),
):
    """Importa empleados desde archivo CSV.
    
    Columnas aceptadas: RFC, CURP, Nombre, Apellidos, Salario Diario, Tipo Contrato,
    Tipo Jornada, Email, Telefono, Fecha Ingreso.
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

    from datetime import datetime

    importados = 0
    errores = []

    for i, row in enumerate(reader, start=2):
        try:
            norm_row = {_normalize_header_emp(k): v for k, v in row.items() if k}
            mapped = _map_csv_row_emp(norm_row)

            if "rfc" not in mapped or not mapped["rfc"]:
                errores.append({"fila": i, "error": "RFC requerido"})
                continue
            if "nombre" not in mapped or not mapped["nombre"]:
                errores.append({"fila": i, "error": "Nombre requerido"})
                continue
            if "apellidos" not in mapped or not mapped["apellidos"]:
                errores.append({"fila": i, "error": "Apellidos requeridos"})
                continue
            if "salario_diario" not in mapped:
                errores.append({"fila": i, "error": "Salario Diario requerido"})
                continue

            rfc = mapped["rfc"].upper().strip()
            curp = mapped.get("curp", "XEXX010101000").upper().strip()
            salario = float(mapped["salario_diario"].replace("$", "").replace(",", ""))

            # Validar RFC duplicado
            existente = await db.execute(
                select(Empleado).where(Empleado.rfc == rfc, Empleado.despacho_id == despacho_id)
            )
            if existente.scalar_one_or_none():
                errores.append({"fila": i, "rfc": rfc, "error": "RFC duplicado en este despacho"})
                continue

            # Fecha ingreso
            fecha_ingreso = datetime.utcnow()
            if "fecha_ingreso" in mapped:
                for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]:
                    try:
                        fecha_ingreso = datetime.strptime(mapped["fecha_ingreso"], fmt)
                        break
                    except ValueError:
                        continue

            emp = Empleado(
                rfc=rfc,
                curp=curp,
                nombre=mapped["nombre"].strip(),
                apellidos=mapped["apellidos"].strip(),
                salario_diario=salario,
                tipo_contrato=mapped.get("tipo_contrato", "base").strip().lower(),
                tipo_jornada=mapped.get("tipo_jornada", "diurna").strip().lower(),
                email=mapped.get("email", "").strip() or None,
                telefono=mapped.get("telefono", "").strip() or None,
                fecha_ingreso=fecha_ingreso,
                despacho_id=despacho_id,
            )
            db.add(emp)
            importados += 1

        except (ValueError, TypeError) as e:
            errores.append({"fila": i, "error": f"Error de formato: {e}"})
        except Exception as e:
            errores.append({"fila": i, "error": str(e)})

    await db.commit()

    return {
        "mensaje": f"Importación completada: {importados} empleados importados, {len(errores)} errores",
        "importados": importados,
        "errores": errores,
    }
