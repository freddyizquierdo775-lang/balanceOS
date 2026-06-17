"""Balance OS — Router de Finiquitos/Liquidaciones"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from app.database import get_db
from app.models import Finiquito, Empleado, TipoFiniquito
from app.schemas.finiquito import (
    FiniquitoCalcularRequest, FiniquitoResponse, FiniquitoPreview,
    TrabajadorBusquedaItem, TrabajadorDatosResponse,
)
from app.finiquitos.calculo import (
    calcular_finiquito, calcular_dias_vacaciones_pendientes,
)
from app.nomina.calculo import (
    calcular_aguinaldo_proporcional,
    calcular_prima_vacacional_proporcional,
    calcular_anios_servicio,
    _red,
)
from app.services.event_engine import emitir_evento
from app.routers.auth import verificar_token
from app.dependencies import get_despacho_id
from app.pdf.finiquito import generar_pdf_finiquito

router = APIRouter(prefix="/finiquitos", tags=["finiquitos"])


async def get_usuario(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Buscador de trabajadores ──────────────────────

@router.get("/buscar-trabajador", response_model=List[TrabajadorBusquedaItem])
async def buscar_trabajador(
    q: str = Query(..., min_length=1, description="Texto de búsqueda (nombre, RFC o CURP)"),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    """Busca trabajadores por nombre, RFC o CURP."""
    search = f"%{q}%"
    query = (
        select(Empleado)
        .where(
            or_(
                Empleado.nombre.ilike(search),
                Empleado.apellidos.ilike(search),
                Empleado.rfc.ilike(search),
                Empleado.curp.ilike(search),
            ),
            Empleado.activo == True,  # noqa: E712
        )
        .order_by(Empleado.apellidos, Empleado.nombre)
        .limit(20)
    )
    result = await db.execute(query)
    return result.scalars().all()


# ─── Datos completos del trabajador ────────────────

@router.get("/trabajador/{empleado_id}/datos", response_model=TrabajadorDatosResponse)
async def datos_trabajador(
    empleado_id: int,
    fecha_baja: Optional[date] = Query(
        None, description="Fecha de baja para calcular proporcionales"
    ),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    """Devuelve datos completos del trabajador con cálculos proporcionales."""
    result = await db.execute(select(Empleado).where(Empleado.id == empleado_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Campos calculados (requieren fecha_baja)
    dias_vac = 0
    aguinaldo = Decimal("0")
    prima_vac = Decimal("0")
    anios = 0

    if fecha_baja and emp.fecha_ingreso:
        fb = datetime.combine(fecha_baja, datetime.min.time())
        anios = calcular_anios_servicio(emp.fecha_ingreso, fb)
        dias_vac = calcular_dias_vacaciones_pendientes(anios, emp.fecha_ingreso, fb)

        # Aguinaldo proporcional
        dias_ano = max(1, (fb - datetime(fb.year, 1, 1)).days)
        aguinaldo = calcular_aguinaldo_proporcional(emp.salario_diario, dias_ano)

        # Prima vacacional proporcional
        prima_vac = calcular_prima_vacacional_proporcional(emp.salario_diario, dias_ano)

    return TrabajadorDatosResponse(
        empleado_id=emp.id,
        nombre=emp.nombre,
        apellidos=emp.apellidos,
        rfc=emp.rfc,
        fecha_ingreso=emp.fecha_ingreso,
        salario_diario=emp.salario_diario,
        estatus=emp.estatus.value if hasattr(emp.estatus, 'value') else str(emp.estatus),
        dias_vacaciones_pendientes=dias_vac,
        aguinaldo_proporcional=aguinaldo,
        prima_vacacional_proporcional=prima_vac,
        anios_servicio=anios,
        saldo_pendiente=Decimal("0"),  # Sin campo en el modelo actual
    )


# ─── Preview (sin guardar) ─────────────────────────

@router.post("/preview", response_model=FiniquitoPreview)
async def preview_finiquito(
    data: FiniquitoCalcularRequest,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    """Calcula finiquito sin guardar (preview)."""
    emp = await db.execute(select(Empleado).where(Empleado.id == data.empleado_id))
    emp = emp.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if not emp.fecha_ingreso:
        raise HTTPException(status_code=400, detail="Empleado sin fecha de ingreso registrada")

    resultado = calcular_finiquito(
        salario_diario=emp.salario_diario,
        fecha_ingreso=emp.fecha_ingreso,
        fecha_baja=data.fecha_baja,
        tipo=data.tipo,
        dias_vacaciones_pend=data.dias_vacaciones_pendientes or 0,
        otros_pagos=data.otros_pagos or Decimal("0"),
    )

    return FiniquitoPreview(**resultado)


# ─── Calcular y guardar ────────────────────────────

@router.post("/calcular", response_model=FiniquitoResponse, status_code=201)
async def calcular_y_guardar(
    data: FiniquitoCalcularRequest,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    """Calcula finiquito y lo guarda en DB."""
    emp = await db.execute(select(Empleado).where(Empleado.id == data.empleado_id))
    emp = emp.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    if not emp.fecha_ingreso:
        raise HTTPException(status_code=400, detail="Empleado sin fecha de ingreso registrada")

    resultado = calcular_finiquito(
        salario_diario=emp.salario_diario,
        fecha_ingreso=emp.fecha_ingreso,
        fecha_baja=data.fecha_baja,
        tipo=data.tipo,
        dias_vacaciones_pend=data.dias_vacaciones_pendientes or 0,
        otros_pagos=data.otros_pagos or Decimal("0"),
    )

    finiquito = Finiquito(
        empleado_id=data.empleado_id,
        fecha_baja=data.fecha_baja,
        tipo=data.tipo,
        causa=data.causa or "",
        anios_servicio=resultado["anios_servicio"],
        salario_diario=resultado["salario_diario"],
        indemnizacion_3meses=resultado["indemnizacion_3meses"],
        indemnizacion_20dias_x_anio=resultado["indemnizacion_20dias_x_anio"],
        prima_antiguedad=resultado["prima_antiguedad"],
        vacaciones_pendientes=resultado["vacaciones_pendientes"],
        prima_vacacional=resultado["prima_vacacional"],
        aguinaldo_proporcional=resultado["aguinaldo_proporcional"],
        otras_percepciones=resultado["otras_percepciones"],
        total_percepciones=resultado["total_percepciones"],
        isr=resultado["isr"],
        isr_exento=resultado["isr_exento"],
        otras_deducciones=resultado["otras_deducciones"],
        total_deducciones=resultado["total_deducciones"],
        neto=resultado["neto"],
    )
    db.add(finiquito)
    await db.commit()
    await db.refresh(finiquito)

    # ── Emitir evento ──────────────────────────
    try:
        nombre_mostrar = f"{emp.nombre} {emp.apellidos}".strip()
        await emitir_evento(
            entidad="finiquito",
            entidad_id=finiquito.id,
            accion="creado",
            descripcion=f"Finiquito calculado para {nombre_mostrar}: ${finiquito.neto:,.2f}",
            metadata_json={
                "empleado_id": data.empleado_id,
                "monto": float(finiquito.neto),
            },
            usuario_id=usuario.get("id"),
        )
    except Exception:
        pass  # El evento no debe bloquear el guardado

    return finiquito


# ─── Listar finiquitos ─────────────────────────────

@router.get("/", response_model=List[FiniquitoResponse])
async def listar_finiquitos(
    cliente_id: Optional[int] = Query(None, description="Filtrar por cliente"),
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    """Lista finiquitos calculados, opcionalmente filtrados por cliente."""
    query = select(Finiquito)

    if cliente_id is not None:
        # Join: Finiquito → Empleado → RepsePersonal → RepseRegistro → cliente_id
        from app.models import RepsePersonal, RepseRegistro
        query = (
            query
            .join(Empleado, Finiquito.empleado_id == Empleado.id)
            .join(RepsePersonal, Empleado.id == RepsePersonal.empleado_id)
            .join(RepseRegistro, RepsePersonal.registro_id == RepseRegistro.id)
            .where(RepseRegistro.cliente_id == cliente_id)
            .distinct()
        )

    query = query.order_by(Finiquito.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


# ─── Obtener finiquito por ID ──────────────────────

@router.get("/{finiquito_id}", response_model=FiniquitoResponse)
async def obtener_finiquito(
    finiquito_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(select(Finiquito).where(Finiquito.id == finiquito_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Finiquito no encontrado")
    return f


# ─── Finiquitos por empleado ───────────────────────

@router.get("/empleado/{empleado_id}", response_model=List[FiniquitoResponse])
async def finiquitos_por_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(Finiquito)
        .where(Finiquito.empleado_id == empleado_id)
        .order_by(Finiquito.created_at.desc())
    )
    return result.scalars().all()


# ─── PDF ───────────────────────────────────────────

@router.get("/{finiquito_id}/pdf")
async def descargar_pdf_finiquito(
    finiquito_id: int,
    db: AsyncSession = Depends(get_db),
    despacho_id: int = Depends(get_despacho_id),
    usuario: dict = Depends(get_usuario),
):
    """Descarga el finiquito en PDF."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Finiquito)
        .options(selectinload(Finiquito.empleado))
        .where(Finiquito.id == finiquito_id)
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Finiquito no encontrado")

    pdf_bytes = generar_pdf_finiquito(f, f.empleado)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                f"attachment; filename=finiquito_{finiquito_id}.pdf"
        },
    )
