"""
Balance OS — Router de Cálculos IMSS
"""
from decimal import Decimal
from fastapi import APIRouter, Depends, Body

from app.database import get_db
from app.routers.auth import verificar_usuario_actual
from app.imss.types import DatosTrabajador, ResultadoCuotas
from app.imss import calcular_cuotas, calcular_factor_integracion

router = APIRouter(prefix="/imss", tags=["imss"])


@router.post("/calcular", response_model=ResultadoCuotas)
async def calcular_imss(
    data: DatosTrabajador,
    usuario: object = Depends(verificar_usuario_actual),
):
    """Calcula SBC y todas las cuotas obrero-patronales IMSS."""
    return calcular_cuotas(data)


@router.post("/factor-integracion")
async def calcular_factor(
    salario_diario: float = Body(...),
    dias_aguinaldo: int = Body(15),
    prima_vacacional_pct: float = Body(0.25),
    anios_servicio: int = Body(1),
    usuario: object = Depends(verificar_usuario_actual),
):
    """Calcula el factor de integración (LFT Art. 84)."""
    from app.imss.rates import DIAS_VACACIONES_POR_ANIO
    dias_vac = DIAS_VACACIONES_POR_ANIO.get(min(anios_servicio, 15), 40)
    factor = calcular_factor_integracion(
        Decimal(str(salario_diario)),
        dias_aguinaldo,
        Decimal(str(prima_vacacional_pct)),
        anios_servicio,
    )
    return {
        "factor_integracion": float(factor),
        "formula": f"1 + ({dias_aguinaldo}/365) + ({prima_vacacional_pct} * {dias_vac}/365)",
        "dias_vacaciones": dias_vac,
    }
