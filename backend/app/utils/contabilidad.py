"""
Balance OS — Utilidades compartidas de Contabilidad
Funciones reutilizables entre el router de contabilidad y estados financieros.
"""
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CuentaContable, PolizaDetalle, Poliza


async def obtener_saldos_periodo(
    db: AsyncSession,
    mes: int,
    anio: int,
    acumulado: bool = False,
) -> dict:
    """Retorna saldos (cargos, abonos) por cuenta para un período.

    Args:
        db: Sesión asíncrona de SQLAlchemy.
        mes: Mes del período (1-12).
        anio: Año del período.
        acumulado: Si True, suma desde el inicio hasta el mes/año actual.
                   Si False, solo el período actual.

    Returns:
        dict[cuenta_id] → {
            "codigo": str, "nombre": str, "tipo": str,
            "naturaleza": str, "cargos": Decimal, "abonos": Decimal
        }
    """
    # Obtener todas las cuentas activas
    cuentas_result = await db.execute(
        select(CuentaContable).where(CuentaContable.activo == True)
    )
    cuentas = cuentas_result.scalars().all()

    # Inicializar saldos en cero
    saldos = {}
    for c in cuentas:
        saldos[c.id] = {
            "codigo": c.codigo,
            "nombre": c.nombre,
            "tipo": c.tipo,
            "naturaleza": c.naturaleza,
            "cargos": Decimal("0.00"),
            "abonos": Decimal("0.00"),
        }

    # Construir query de movimientos del período
    query = (
        select(PolizaDetalle)
        .join(Poliza, PolizaDetalle.poliza_id == Poliza.id)
    )

    if acumulado:
        # Sumar todos los períodos desde el inicio hasta mes/anio
        # Incluir años anteriores completos + meses del año actual hasta 'mes'
        query = query.where(
            (Poliza.periodo_anio < anio) |
            ((Poliza.periodo_anio == anio) & (Poliza.periodo_mes <= mes))
        )
    else:
        # Solo el período actual
        query = query.where(
            Poliza.periodo_mes == mes,
            Poliza.periodo_anio == anio,
        )

    detalles_result = await db.execute(query)
    detalles = detalles_result.scalars().all()

    # Acumular cargos y abonos por cuenta
    for det in detalles:
        if det.cuenta_id in saldos:
            saldos[det.cuenta_id]["cargos"] += det.cargo
            saldos[det.cuenta_id]["abonos"] += det.abono

    return saldos
