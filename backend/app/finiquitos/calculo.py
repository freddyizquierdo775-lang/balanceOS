"""
Balance OS — Cálculo de Finiquitos/Liquidaciones (LFT)
======================================================
Basado en Ley Federal del Trabajo:
  - Indemnización: Art. 48, 49, 50
  - Prima de antigüedad: Art. 162
  - Vacaciones: Art. 76, 79
  - Aguinaldo: Art. 87
  - ISR en finiquitos: LISR Art. 110
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date

from app.imss.rates import UMA_DIARIA, DIAS_VACACIONES_POR_ANIO
from app.nomina.calculo import (
    calcular_anios_servicio, calcular_aguinaldo_proporcional,
    calcular_prima_vacacional_proporcional, _red,
    TARIFA_ISR_MENSUAL, _ingreso_a_mensual, _mensual_a_periodo,
)

_DOS = Decimal("0.01")


def calcular_dias_vacaciones_pendientes(
    anios_servicio: int,
    fecha_ingreso: datetime,
    fecha_baja: datetime,
) -> int:
    """Calcula días de vacaciones no disfrutados en el año de baja.

    Según LFT Art. 76 (tabla progresiva) y Art. 79 (proporcional).
    """
    total_dias = DIAS_VACACIONES_POR_ANIO.get(min(anios_servicio, 15), 40)
    # Vacaciones del año: 6 meses para poder disfrutar (Art. 81)
    if anios_servicio >= 1:
        # Proporcional al tiempo trabajado en el año de baja
        inicio_ano = datetime(fecha_baja.year, 1, 1)
        dias_ano = max(1, (fecha_baja - inicio_ano).days)
        # Después de 6 meses de trabajo, se tiene derecho a vacaciones
        if dias_ano >= 180:
            proporcion = (Decimal(dias_ano) / Decimal(365)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            return max(0, int((Decimal(total_dias) * proporcion).to_integral_value(rounding=ROUND_HALF_UP)))
    return 0


def calcular_finiquito(
    salario_diario: Decimal,
    fecha_ingreso: datetime,
    fecha_baja: datetime,
    tipo: str,
    dias_vacaciones_pend: int = 0,
    prima_pct: Decimal = Decimal("0.25"),
    otros_pagos: Decimal = Decimal("0"),
) -> dict:
    """Calcula el finiquito/liquidación completo.

    Returns:
        dict con todas las partidas desglosadas
    """
    anios = calcular_anios_servicio(fecha_ingreso, fecha_baja)
    SBC_diario = salario_diario  # simplificación

    # Días entre periodo anual para aguinaldo y vacaciones
    dias_ano = max(1, (fecha_baja - datetime(fecha_baja.year, 1, 1)).days)

    # ── 1. Aguinaldo proporcional ──
    aguinaldo = calcular_aguinaldo_proporcional(salario_diario, dias_ano)

    # ── 2. Vacaciones pendientes ──
    if dias_vacaciones_pend <= 0:
        dias_vacaciones_pend = calcular_dias_vacaciones_pendientes(anios, fecha_ingreso, fecha_baja)

    vacaciones = _red(salario_diario * Decimal(dias_vacaciones_pend))

    # ── 3. Prima vacacional sobre vacaciones pendientes ──
    prima_vac = _red(vacaciones * prima_pct)

    # ── 4. Prima de antigüedad (Art. 162) ──
    # 12 días de salario por año, tope = 2 UMAs
    tope_diario = UMA_DIARIA * Decimal("2")
    salario_base_prima = min(salario_diario, tope_diario)
    prima_antiguedad_total = _red(salario_base_prima * Decimal(12) * Decimal(max(anios, 1)))

    # ── 5. Indemnizaciones (según tipo) ──
    indemnizacion_3meses = Decimal("0")
    indemnizacion_20dias = Decimal("0")

    if tipo == "despido_injustificado":
        # Art. 50: 3 meses de salario + 20 días por año
        indemnizacion_3meses = _red(SBC_diario * Decimal(90))
        indemnizacion_20dias = _red(SBC_diario * Decimal(20) * Decimal(max(anios, 1)))

    # ── 6. Percepciones totales ──
    total_percepciones = (
        indemnizacion_3meses
        + indemnizacion_20dias
        + prima_antiguedad_total
        + vacaciones
        + prima_vac
        + aguinaldo
        + otros_pagos
    )

    # ── 7. ISR (LISR Art. 110 — partes exentas y gravables) ──
    # Exento: prima de antigüedad hasta 20 UMAs por año (tope)
    isr_exento_antiguedad = min(
        prima_antiguedad_total,
        _red(UMA_DIARIA * Decimal(20) * Decimal(max(anios, 1)))
    )
    # Exento: aguinaldo hasta 30 UMAs
    isr_exento_aguinaldo = min(aguinaldo, _red(UMA_DIARIA * Decimal(30)))
    # Exento: prima vacacional hasta 15 UMAs
    isr_exento_prima_vac = min(prima_vac, _red(UMA_DIARIA * Decimal(15)))
    # Exento: indemnización hasta 5,000 UMAs total (o 3,000 UMAs, según interpretación)
    isr_exento_indemnizacion = min(
        indemnizacion_3meses + indemnizacion_20dias,
        _red(UMA_DIARIA * Decimal(5000))
    )

    total_exento = (
        isr_exento_antiguedad
        + isr_exento_aguinaldo
        + isr_exento_prima_vac
        + isr_exento_indemnizacion
    )

    gravable = max(Decimal("0"), total_percepciones - total_exento)

    # Calcular ISR sobre la parte gravable
    isr = Decimal("0")
    if gravable > Decimal("0"):
        ingreso_mensual_equiv = _ingreso_a_mensual(gravable, 30)
        for lim_inf, lim_sup, cuota_fija, tasa in TARIFA_ISR_MENSUAL:
            if lim_inf <= ingreso_mensual_equiv <= lim_sup:
                excedente = ingreso_mensual_equiv - (lim_inf - Decimal("0.01"))
                isr_mensual = cuota_fija + (excedente * tasa / Decimal("100"))
                isr = _red(isr_mensual)
                break

    deducciones = isr
    neto = total_percepciones - deducciones

    return {
        "anios_servicio": anios,
        "salario_diario": salario_diario,
        "indemnizacion_3meses": indemnizacion_3meses,
        "indemnizacion_20dias_x_anio": indemnizacion_20dias,
        "prima_antiguedad": prima_antiguedad_total,
        "vacaciones_pendientes": vacaciones,
        "prima_vacacional": prima_vac,
        "aguinaldo_proporcional": aguinaldo,
        "otras_percepciones": otros_pagos,
        "total_percepciones": _red(total_percepciones),
        "isr": _red(isr),
        "isr_exento": _red(total_exento),
        "otras_deducciones": Decimal("0"),
        "total_deducciones": _red(deducciones),
        "neto": _red(neto),
        "isr_detalle": {
            "total_percepciones": str(_red(total_percepciones)),
            "total_exento": str(_red(total_exento)),
            "gravable": str(_red(gravable)),
            "isr_calculado": str(_red(isr)),
        },
    }
