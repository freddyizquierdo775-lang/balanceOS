"""
Balance OS — Router de Impuestos
"""
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import Declaracion, DeclaracionConcepto, ConfiguracionDiot, Cliente
from app.schemas.impuestos import (
    DeclaracionCreate, DeclaracionConceptoCreate,
    DeclaracionResponse, DeclaracionConceptoResponse,
    CalculoImpuestosRequest, CalculoImpuestosResponse, DiotResponse,
)
from app.routers.auth import verificar_token

router = APIRouter(prefix="/impuestos", tags=["impuestos"])


def get_usuario_actual(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Declaraciones ─────────────────────────────────


@router.post("/declaraciones", response_model=DeclaracionResponse, status_code=status.HTTP_201_CREATED)
async def crear_declaracion(
    data: DeclaracionCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Crea una declaración de impuestos con sus conceptos."""
    declaracion = Declaracion(
        cliente_id=data.cliente_id,
        tipo=data.tipo,
        periodo_mes=data.periodo_mes,
        periodo_anio=data.periodo_anio,
        estatus="pendiente",
    )
    db.add(declaracion)
    await db.flush()

    for conc in data.conceptos:
        concepto = DeclaracionConcepto(
            declaracion_id=declaracion.id,
            tipo=conc.tipo,
            concepto=conc.concepto,
            monto=conc.monto,
            base=conc.base,
            tasa=conc.tasa,
            impuesto=conc.impuesto,
        )
        db.add(concepto)

    await db.commit()
    await db.refresh(declaracion)
    return declaracion


@router.get("/declaraciones", response_model=List[DeclaracionResponse])
async def listar_declaraciones(
    cliente_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Lista las declaraciones, opcionalmente filtradas por cliente."""
    query = select(Declaracion)
    if cliente_id:
        query = query.where(Declaracion.cliente_id == cliente_id)
    query = query.order_by(Declaracion.periodo_anio.desc(), Declaracion.periodo_mes.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/declaraciones/{declaracion_id}", response_model=DeclaracionResponse)
async def obtener_declaracion(
    declaracion_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Obtiene una declaración con sus conceptos."""
    result = await db.execute(
        select(Declaracion).where(Declaracion.id == declaracion_id)
    )
    declaracion = result.scalar_one_or_none()
    if not declaracion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Declaración no encontrada")
    return declaracion


# ─── Cálculo de Impuestos ──────────────────────────


@router.post("/calcular", response_model=CalculoImpuestosResponse)
async def calcular_impuestos(
    data: CalculoImpuestosRequest,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Calcula IVA e ISR basado en ingresos y deducciones."""
    # IVA
    iva_por_pagar = data.iva_trasladado - data.iva_acreditable
    if iva_por_pagar < Decimal("0.00"):
        iva_a_favor = abs(iva_por_pagar)
        iva_por_pagar_decimal = Decimal("0.00")
    else:
        iva_a_favor = Decimal("0.00")
        iva_por_pagar_decimal = iva_por_pagar

    # ISR simplificado: tasa ~30% sobre utilidad
    utilidad = data.ingresos - data.deducciones
    isr_bruto = (utilidad * Decimal("0.30")).quantize(Decimal("0.01"))
    # Tasa efectiva: (ISR bruto / utilidad) * 100, o 30% si utilidad es 0
    if utilidad > Decimal("0.00"):
        tasa_efectiva = (isr_bruto / utilidad * Decimal("100")).quantize(Decimal("0.01"))
    else:
        tasa_efectiva = Decimal("30.00")
    # Personas morales: pagos provisionales del 1.25% sobre ingresos
    isr_retenido = (data.ingresos * Decimal("0.0125")).quantize(Decimal("0.01"))
    isr_neto = (isr_bruto - isr_retenido).quantize(Decimal("0.01"))
    if isr_neto < Decimal("0.00"):
        isr_neto = Decimal("0.00")

    return CalculoImpuestosResponse(
        iva_por_pagar=iva_por_pagar_decimal,
        iva_a_favor=iva_a_favor,
        isr_bruto=isr_bruto,
        isr_retenido=isr_retenido,
        isr_neto=isr_neto,
        coeficiente=Decimal("0.30"),
        utilidad_fiscal=utilidad,
        tasa_efectiva=tasa_efectiva,
        isr_retenciones=isr_retenido,
        isr_pago_provisional=isr_retenido,
    )


# ─── DIOT ──────────────────────────────────────────


@router.get("/diot", response_model=DiotResponse)
async def generar_diot(
    cliente_id: int = Query(...),
    mes: int = Query(...),
    anio: int = Query(...),
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario_actual),
):
    """Genera la DIOT (Declaración Informativa de Operaciones con Terceros) resumida."""
    # Buscar config DIOT existente o calcular desde declaraciones
    result = await db.execute(
        select(ConfiguracionDiot)
        .where(ConfiguracionDiot.cliente_id == cliente_id)
        .where(ConfiguracionDiot.periodo_mes == mes)
        .where(ConfiguracionDiot.periodo_anio == anio)
    )
    config = result.scalar_one_or_none()

    if config:
        return DiotResponse(
            periodo_mes=mes,
            periodo_anio=anio,
            iva_acreditable=config.iva_acreditable,
            iva_trasladado=config.iva_trasladado,
            diferencia=config.iva_trasladado - config.iva_acreditable,
            proveedores=0,
        )

    # Calcular desde las declaraciones del período
    decl_result = await db.execute(
        select(DeclaracionConcepto)
        .join(Declaracion, DeclaracionConcepto.declaracion_id == Declaracion.id)
        .where(Declaracion.cliente_id == cliente_id)
        .where(Declaracion.periodo_mes == mes)
        .where(Declaracion.periodo_anio == anio)
    )
    conceptos = decl_result.scalars().all()

    iva_acreditable = sum(
        c.monto for c in conceptos if c.tipo == "iva_acreditable"
    ) or Decimal("0.00")
    iva_trasladado = sum(
        c.monto for c in conceptos if c.tipo == "iva_trasladado"
    ) or Decimal("0.00")

    return DiotResponse(
        periodo_mes=mes,
        periodo_anio=anio,
        iva_acreditable=iva_acreditable,
        iva_trasladado=iva_trasladado,
        diferencia=iva_trasladado - iva_acreditable,
        proveedores=0,
    )
