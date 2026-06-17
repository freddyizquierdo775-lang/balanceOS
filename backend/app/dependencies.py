"""
Balance OS — Dependencias reutilizables (multi-tenancy, permisos, plan enforcement)
"""
from fastapi import Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.database import get_db
from app.models import Usuario, Despacho, Cliente, Empleado, Recibo
from app.routers.auth import verificar_token


# ─── Plan Limits ─────────────────────────────────

PLAN_LIMITS = {
    "starter": {
        "max_clientes": 10,
        "max_empleados": 20,
        "max_nominas_mes": 50,
        "modulos": ["clientes", "empleados", "nomina", "imss", "cfdi", "facturacion", "contabilidad", "impuestos", "tesoreria", "estados_financieros", "dashboard"],
    },
    "pro": {
        "max_clientes": 50,
        "max_empleados": 200,
        "max_nominas_mes": 999999,
        "modulos": "all",
    },
    "enterprise": {
        "max_clientes": 999999,
        "max_empleados": 999999,
        "max_nominas_mes": 999999,
        "modulos": "all",
    },
}


async def get_despacho_id(
    usuario: dict = Depends(verificar_token),
    db: AsyncSession = Depends(get_db),
) -> int:
    """Obtiene el despacho_id del usuario autenticado."""
    result = await db.execute(
        select(Usuario.despacho_id).where(Usuario.id == usuario["id"])
    )
    despacho_id = result.scalar_one_or_none()
    if not despacho_id:
        raise HTTPException(status_code=400, detail="Usuario sin despacho asignado")
    return despacho_id


async def get_despacho(
    despacho_id: int = Depends(get_despacho_id),
    db: AsyncSession = Depends(get_db),
) -> Despacho:
    """Obtiene el objeto Despacho completo."""
    result = await db.execute(select(Despacho).where(Despacho.id == despacho_id))
    despacho = result.scalar_one_or_none()
    if not despacho:
        raise HTTPException(status_code=400, detail="Despacho no encontrado")
    return despacho


async def check_plan_limit_clientes(
    despacho: Despacho = Depends(get_despacho),
    db: AsyncSession = Depends(get_db),
):
    """Verifica que el despacho no exceda el límite de clientes de su plan."""
    plan = despacho.plan or "starter"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["starter"])
    max_clientes = limits["max_clientes"]

    count = await db.execute(
        select(func.count()).select_from(Cliente).where(Cliente.despacho_id == despacho.id)
    )
    actual = count.scalar() or 0

    if actual >= max_clientes:
        raise HTTPException(
            status_code=402,
            detail=f"Límite de clientes alcanzado ({actual}/{max_clientes}). "
                   f"Actualiza tu plan a Pro para tener hasta {PLAN_LIMITS['pro']['max_clientes']} clientes.",
        )
    return despacho


async def check_plan_limit_empleados(
    despacho: Despacho = Depends(get_despacho),
    db: AsyncSession = Depends(get_db),
):
    """Verifica que el despacho no exceda el límite de empleados de su plan."""
    plan = despacho.plan or "starter"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["starter"])
    max_empleados = limits["max_empleados"]

    count = await db.execute(
        select(func.count()).select_from(Empleado).where(Empleado.despacho_id == despacho.id)
    )
    actual = count.scalar() or 0

    if actual >= max_empleados:
        raise HTTPException(
            status_code=402,
            detail=f"Límite de empleados alcanzado ({actual}/{max_empleados}). "
                   f"Actualiza tu plan a Pro para tener hasta {PLAN_LIMITS['pro']['max_empleados']} empleados.",
        )
    return despacho


async def check_plan_limit_nominas(
    despacho: Despacho = Depends(get_despacho),
    db: AsyncSession = Depends(get_db),
):
    """Verifica que el despacho no exceda el límite de nóminas mensuales."""
    plan = despacho.plan or "starter"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["starter"])
    max_nominas = limits["max_nominas_mes"]

    # Contar recibos creados este mes
    now = datetime.utcnow()
    inicio_mes = datetime(now.year, now.month, 1)

    count = await db.execute(
        select(func.count()).select_from(Recibo).where(
            Recibo.despacho_id == despacho.id,
            Recibo.created_at >= inicio_mes,
        )
    )
    actual = count.scalar() or 0

    if actual >= max_nominas:
        raise HTTPException(
            status_code=402,
            detail=f"Límite de nóminas mensuales alcanzado ({actual}/{max_nominas}). "
                   f"Actualiza tu plan a Pro para nóminas ilimitadas.",
        )
    return despacho


async def get_plan_usage(
    despacho: Despacho = Depends(get_despacho),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Retorna el uso actual del plan vs límites."""
    plan_name = despacho.plan or "starter"
    limits = PLAN_LIMITS.get(plan_name, PLAN_LIMITS["starter"])

    n_clientes = await db.execute(
        select(func.count()).select_from(Cliente).where(Cliente.despacho_id == despacho.id)
    )
    n_empleados = await db.execute(
        select(func.count()).select_from(Empleado).where(Empleado.despacho_id == despacho.id)
    )
    now = datetime.utcnow()
    inicio_mes = datetime(now.year, now.month, 1)
    n_nominas = await db.execute(
        select(func.count()).select_from(Recibo).where(
            Recibo.despacho_id == despacho.id,
            Recibo.created_at >= inicio_mes,
        )
    )

    clientes_pct = min(100, int((n_clientes.scalar() or 0) / limits["max_clientes"] * 100)) if limits["max_clientes"] > 0 else 0
    empleados_pct = min(100, int((n_empleados.scalar() or 0) / limits["max_empleados"] * 100)) if limits["max_empleados"] > 0 else 0
    nominas_pct = min(100, int((n_nominas.scalar() or 0) / limits["max_nominas_mes"] * 100)) if limits["max_nominas_mes"] > 0 else 0

    return {
        "plan": plan_name,
        "limites": limits,
        "uso": {
            "clientes": {"actual": n_clientes.scalar() or 0, "max": limits["max_clientes"], "porcentaje": clientes_pct},
            "empleados": {"actual": n_empleados.scalar() or 0, "max": limits["max_empleados"], "porcentaje": empleados_pct},
            "nominas_mes": {"actual": n_nominas.scalar() or 0, "max": limits["max_nominas_mes"], "porcentaje": nominas_pct},
        },
        "alerta": clientes_pct >= 80 or empleados_pct >= 80 or nominas_pct >= 80,
    }
