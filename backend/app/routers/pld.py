"""Balance OS — Router de PLD (Cuestionario Riesgo, Documentos)"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from decimal import Decimal

from app.database import get_db
from app.models import (
    PldCuestionario, PldDocumento, Cliente, NivelRiesgo, TipoOperacion,
)
from app.schemas.pld import (
    PldCuestionarioCreate, PldCuestionarioResponse,
    PldDocumentoCreate, PldDocumentoResponse,
    PldClienteResumen,
)
from app.routers.auth import verificar_token

router = APIRouter(prefix="/pld", tags=["pld"])


async def get_usuario(token: dict = Depends(verificar_token)) -> dict:
    return token


# ─── Calculadora de Riesgo PLD ────────────────────


def calcular_riesgo(data: PldCuestionarioCreate) -> tuple[Decimal, NivelRiesgo, str]:
    """
    Calcula puntaje de riesgo PLD (0-100) basado en factores del cliente.
    Metodología simplificada basada en CNBV + mejores prácticas.
    """
    puntaje = Decimal("0")

    # 1. Ingresos anuales (0-25 pts)
    if data.ingresos_anuales > Decimal("50000000"):  # > 50M
        puntaje += Decimal("25")
    elif data.ingresos_anuales > Decimal("10000000"):  # > 10M
        puntaje += Decimal("15")
    elif data.ingresos_anuales > Decimal("2000000"):  # > 2M
        puntaje += Decimal("8")
    else:
        puntaje += Decimal("3")

    # 2. Volumen de operaciones (0-15 pts)
    if data.volumen_operaciones > Decimal("30000000"):
        puntaje += Decimal("15")
    elif data.volumen_operaciones > Decimal("5000000"):
        puntaje += Decimal("8")
    elif data.volumen_operaciones > Decimal("0"):
        puntaje += Decimal("3")

    # 3. Transacciones internacionales (0-15 pts)
    if data.transacciones_internacionales:
        puntaje += Decimal("15")

    # 4. Tipo de operación (0-10 pts)
    if data.tipo_operacion == "ambas":
        puntaje += Decimal("10")
    elif data.tipo_operacion == "internacional":
        puntaje += Decimal("5")

    # 5. PEP - Persona Expuesta Políticamente (0-20 pts)
    if data.expuesto_politicamente:
        puntaje += Decimal("20")

    # 6. Sector de alto riesgo (0-10 pts)
    if data.sector_riesgo_alto:
        puntaje += Decimal("10")

    # 7. Origen de fondos no documentado (0-10 pts)
    if not data.origen_fondos_documentado:
        puntaje += Decimal("10")

    # 8. Antigüedad de la relación (0-10 pts, inverso)
    if data.antigüedad_relacion < 6:  # menos de 6 meses
        puntaje += Decimal("10")
    elif data.antigüedad_relacion < 12:
        puntaje += Decimal("6")
    elif data.antigüedad_relacion < 24:
        puntaje += Decimal("3")

    # Determinar nivel y recomendación
    if puntaje >= Decimal("60"):
        nivel = NivelRiesgo.ALTO
        recomendacion = (
            "RIESGO ALTO: Implementar medidas reforzadas de supervisión. "
            "Solicitar documentación completa del origen de fondos. "
            "Requiere aprobación del director para iniciar/mantener relación. "
            "Monitoreo intensivo de operaciones mensual."
        )
    elif puntaje >= Decimal("30"):
        nivel = NivelRiesgo.MEDIO
        recomendacion = (
            "RIESGO MEDIO: Aplicar medidas estándar de debida diligencia. "
            "Verificar documentación KYC anualmente. "
            "Monitoreo trimestral de operaciones."
        )
    else:
        nivel = NivelRiesgo.BAJO
        recomendacion = (
            "RIESGO BAJO: Aplicar medidas simplificadas. "
            "Mantener documentación básica actualizada. "
            "Revisión anual de perfil."
        )

    return puntaje, nivel, recomendacion


# ─── Cuestionarios ─────────────────────────────────


@router.post("/cuestionarios", response_model=PldCuestionarioResponse, status_code=201)
async def crear_cuestionario(
    data: PldCuestionarioCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    # Validar cliente
    cliente = await db.execute(select(Cliente).where(Cliente.id == data.cliente_id))
    if not cliente.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Calcular riesgo
    puntaje, nivel, recomendacion = calcular_riesgo(data)

    cuestionario = PldCuestionario(
        **data.model_dump(),
        puntaje=puntaje,
        nivel_riesgo=nivel,
        recomendacion=recomendacion,
    )
    db.add(cuestionario)
    await db.commit()
    await db.refresh(cuestionario)

    # Actualizar cliente
    cliente_obj = (await db.execute(select(Cliente).where(Cliente.id == data.cliente_id))).scalar_one()
    cliente_obj.tiene_pld = True
    if data.expuesto_politicamente:
        cliente_obj.notas = (cliente_obj.notas or "") + "\n[PLD] PEP detectado"
    await db.commit()

    return cuestionario


@router.get("/cuestionarios/{cliente_id}", response_model=List[PldCuestionarioResponse])
async def listar_cuestionarios(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(PldCuestionario)
        .where(PldCuestionario.cliente_id == cliente_id)
        .order_by(PldCuestionario.created_at.desc())
    )
    return result.scalars().all()


@router.get("/cuestionarios/ultimo/{cliente_id}", response_model=PldCuestionarioResponse)
async def ultimo_cuestionario(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(PldCuestionario)
        .where(PldCuestionario.cliente_id == cliente_id)
        .order_by(PldCuestionario.created_at.desc())
        .limit(1)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="No hay cuestionarios para este cliente")
    return c


# ─── Documentos PLD ────────────────────────────────


@router.post("/documentos", response_model=PldDocumentoResponse, status_code=201)
async def crear_documento(
    data: PldDocumentoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    doc = PldDocumento(**data.model_dump())
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/documentos/{cliente_id}", response_model=List[PldDocumentoResponse])
async def listar_documentos(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    result = await db.execute(
        select(PldDocumento)
        .where(PldDocumento.cliente_id == cliente_id)
        .order_by(PldDocumento.tipo)
    )
    return result.scalars().all()


@router.put("/documentos/{doc_id}/verificar", response_model=PldDocumentoResponse)
async def verificar_documento(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    from datetime import datetime
    result = await db.execute(select(PldDocumento).where(PldDocumento.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    doc.verificado = True
    doc.fecha_verificacion = datetime.utcnow()
    await db.commit()
    await db.refresh(doc)
    return doc


# ─── Resumen por cliente ──────────────────────────


@router.get("/resumen/{cliente_id}", response_model=PldClienteResumen)
async def resumen_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: dict = Depends(get_usuario),
):
    cliente = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = cliente.scalar_one_or_none()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Último cuestionario
    ultimo = await db.execute(
        select(PldCuestionario)
        .where(PldCuestionario.cliente_id == cliente_id)
        .order_by(PldCuestionario.created_at.desc())
        .limit(1)
    )
    ultimo = ultimo.scalar_one_or_none()

    # Documentos
    docs = await db.execute(
        select(PldDocumento).where(PldDocumento.cliente_id == cliente_id)
    )
    docs = docs.scalars().all()
    total = len(docs)
    verificados = sum(1 for d in docs if d.verificado)

    return PldClienteResumen(
        cliente_id=cliente.id,
        cliente_nombre=cliente.razon_social,
        cliente_rfc=cliente.rfc,
        ultimo_cuestionario=PldCuestionarioResponse.model_validate(ultimo) if ultimo else None,
        documentos_completos=verificados,
        documentos_pendientes=total - verificados,
        riesgo=ultimo.nivel_riesgo.value if ultimo else None,
    )
