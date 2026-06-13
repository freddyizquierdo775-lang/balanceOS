"""
IMSS Engine — Calculadora Principal
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import List

from app.imss.rates import (
    UMA_DIARIA, UMA_MENSUAL, TOPE_SBC_UMAS, TOPE_SBC_DIARIO,
    DIAS_VACACIONES_POR_ANIO, RIESGO_CLASE,
    ENF_MAT, INVALIDEZ_VIDA, RCIV, GUARDERIAS, INFONAVIT,
)
from app.imss.types import (
    DatosTrabajador, ResultadoSBC, CuotaObreroPatronal, ResultadoCuotas,
)

DECIMAL_DOS = Decimal("0.01")


def redondear(valor: Decimal) -> Decimal:
    """Redondeo a 2 decimales."""
    return valor.quantize(DECIMAL_DOS, rounding=ROUND_HALF_UP)


def calcular_factor_integracion(
    salario_diario: Decimal,
    dias_aguinaldo: int = 15,
    prima_vacacional_pct: Decimal = Decimal("0.25"),
    anios_servicio: int = 1,
) -> Decimal:
    """
    Calcula el factor de integración (LFT Art. 84).
    
    Fórmula: 1 + (días_aguinaldo / 365) + (prima_vacacional * días_vacaciones / 365)
    """
    dias_vac = DIAS_VACACIONES_POR_ANIO.get(min(anios_servicio, 15), 40)
    factor = Decimal(1) + (Decimal(dias_aguinaldo) / Decimal(365)) +              (prima_vacacional_pct * Decimal(dias_vac) / Decimal(365))
    return factor.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)


def calcular_sbc(salario_diario: Decimal, factor_integracion: Decimal) -> ResultadoSBC:
    """Calcula el SBC diario y mensual a partir del salario diario y factor de integración."""
    sbc_diario = salario_diario * factor_integracion
    sbc_mensual = sbc_diario * Decimal(30)
    sbc_mensual = redondear(sbc_mensual)
    
    # Aplicar tope de 25 UMAs
    tope_diario = TOPE_SBC_DIARIO
    tope_aplicado = sbc_diario > tope_diario
    if tope_aplicado:
        sbc_diario = tope_diario
    
    sbc_diario = redondear(sbc_diario)
    
    umas = sbc_diario / UMA_DIARIA
    excede_uma = sbc_diario > (UMA_DIARIA * Decimal(3))
    
    detalle = (
        f"SBC diario: ${sbc_diario:,.2f} "
        f"({umas:,.2f} UMAs)"
        f"{' [TOPE 25 UMAs APLICADO]' if tope_aplicado else ''}"
    )
    
    return ResultadoSBC(
        salario_diario=redondear(salario_diario),
        factor_integracion=factor_integracion,
        sbc_diario=sbc_diario,
        sbc_mensual=sbc_mensual,
        excede_uma=excede_uma,
        tope_aplicado=tope_aplicado,
        detalle=detalle,
    )


def calcular_cuotas(data: DatosTrabajador) -> ResultadoCuotas:
    """Calcula todas las cuotas obrero-patronales."""
    # 1. Calcular SBC
    if data.factor_integracion is None:
        factor = calcular_factor_integracion(
            data.salario_diario, data.dias_aguinaldo, data.prima_vacacional_pct
        )
    else:
        factor = data.factor_integracion
    
    sbc = calcular_sbc(data.salario_diario, factor)
    sbc_diario = sbc.sbc_diario
    sbc_mensual = sbc_diario * Decimal(30)
    
    # Bases para cálculos
    base_3umas = UMA_DIARIA * Decimal(3)
    excedente_3umas = max(Decimal(0), sbc_diario - base_3umas)
    sbc_diario_topado = min(sbc_diario, UMA_DIARIA * ENF_MAT["tope_especie_umas"])
    
    cuotas: List[CuotaObreroPatronal] = []
    
    # 2. Riesgos de Trabajo (prima según clase)
    riesgo = RIESGO_CLASE[data.clase_riesgo]
    prima_rt = riesgo["prima_base"] / Decimal(100)
    monto_rt_patronal = sbc_diario * prima_rt
    cuotas.append(CuotaObreroPatronal(
        concepto="Riesgos de Trabajo",
        tasa_patronal=redondear(riesgo["prima_base"]),
        tasa_obrera=Decimal(0),
        monto_patronal=redondear(monto_rt_patronal),
        monto_obrero=Decimal(0),
        base_cotizacion=sbc_diario,
    ))
    
    # 3. Enfermedades y Maternidad
    # - Especie (patronal): sobre SBC hasta 25 UMAs
    monto_em_especie_pat = sbc_diario_topado * (ENF_MAT["especie_patronal_pct"] / Decimal(100))
    # - Dinero (sobre excedente de 3 UMAs)
    monto_em_dineros_pat = excedente_3umas * (ENF_MAT["dineros_patronal_base_pct"] / Decimal(100))
    monto_em_dineros_obr = excedente_3umas * (ENF_MAT["dineros_obrera_pct"] / Decimal(100))
    monto_em_pat = monto_em_especie_pat + monto_em_dineros_pat
    monto_em_obr = monto_em_dineros_obr
    cuotas.append(CuotaObreroPatronal(
        concepto="Enf. y Maternidad",
        tasa_patronal=ENF_MAT["especie_patronal_pct"] + ENF_MAT["dineros_patronal_base_pct"],
        tasa_obrera=ENF_MAT["dineros_obrera_pct"],
        monto_patronal=redondear(monto_em_pat),
        monto_obrero=redondear(monto_em_obr),
        base_cotizacion=sbc_diario_topado,
    ))
    
    # 4. Invalidez y Vida
    monto_iv_pat = sbc_diario * (INVALIDEZ_VIDA["patronal_pct"] / Decimal(100))
    monto_iv_obr = sbc_diario * (INVALIDEZ_VIDA["obrera_pct"] / Decimal(100))
    cuotas.append(CuotaObreroPatronal(
        concepto="Invalidez y Vida",
        tasa_patronal=INVALIDEZ_VIDA["patronal_pct"],
        tasa_obrera=INVALIDEZ_VIDA["obrera_pct"],
        monto_patronal=redondear(monto_iv_pat),
        monto_obrero=redondear(monto_iv_obr),
        base_cotizacion=sbc_diario,
    ))
    
    # 5. Retiro, Cesantía Edad Avanzada y Vejez
    monto_retiro_pat = sbc_diario * (RCIV["retiro_patronal_pct"] / Decimal(100))
    monto_ceav_pat = sbc_diario * (RCIV["ceav_patronal_pct"] / Decimal(100))
    monto_ceav_obr = sbc_diario * (RCIV["ceav_obrera_pct"] / Decimal(100))
    cuotas.append(CuotaObreroPatronal(
        concepto="Retiro, CEAV",
        tasa_patronal=RCIV["retiro_patronal_pct"] + RCIV["ceav_patronal_pct"],
        tasa_obrera=RCIV["ceav_obrera_pct"],
        monto_patronal=redondear(monto_retiro_pat + monto_ceav_pat),
        monto_obrero=redondear(monto_ceav_obr),
        base_cotizacion=sbc_diario,
    ))
    
    # 6. Guarderías y Prestaciones Sociales
    monto_guar_pat = sbc_diario_topado * (GUARDERIAS["patronal_pct"] / Decimal(100))
    cuotas.append(CuotaObreroPatronal(
        concepto="Guarderías y P. Sociales",
        tasa_patronal=GUARDERIAS["patronal_pct"],
        tasa_obrera=Decimal(0),
        monto_patronal=redondear(monto_guar_pat),
        monto_obrero=Decimal(0),
        base_cotizacion=sbc_diario_topado,
    ))
    
    # 7. Infonavit
    monto_info_pat = sbc_diario * (INFONAVIT["patronal_pct"] / Decimal(100))
    cuotas.append(CuotaObreroPatronal(
        concepto="Infonavit",
        tasa_patronal=INFONAVIT["patronal_pct"],
        tasa_obrera=Decimal(0),
        monto_patronal=redondear(monto_info_pat),
        monto_obrero=Decimal(0),
        base_cotizacion=sbc_diario,
    ))
    
    return ResultadoCuotas(
        sbc_diario=sbc_diario,
        sbc_mensual=redondear(sbc_mensual),
        umas=redondear(sbc_diario / UMA_DIARIA),
        cuotas=cuotas,
        total_patronal=redondear(sum(c.monto_patronal for c in cuotas)),
        total_obrero=redondear(sum(c.monto_obrero for c in cuotas)),
        gran_total=redondear(sum(c.monto_patronal for c in cuotas) + sum(c.monto_obrero for c in cuotas)),
    )
