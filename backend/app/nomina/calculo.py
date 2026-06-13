"""
Balance OS — Cálculo de Nómina
================================
Servicio que procesa un PeriodoNomina completo:
toma empleados activos, calcula percepciones, deducciones IMSS/ISR
(reales con subsidio al empleo), crea recibos y marca el periodo como calculado.

ISR Tarifa mensual LISR Art. 96 — valores 2025 (actualizar anualmente)
Subsidio al empleo — Art. 8 transitorio LISR (aplica hasta ~$10,000/mes)
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import List
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import PeriodoNomina, Empleado, Recibo
from app.imss.types import DatosTrabajador
from app.imss import calcular_cuotas
from app.imss.rates import DIAS_VACACIONES_POR_ANIO

_DOS = Decimal("0.01")

# ─── Tarifa ISR Mensual (LISR Art. 96) ───────────────────
# (lim_inf, lim_sup, cuota_fija, tasa_excedente_%)
TARIFA_ISR_MENSUAL = [
    (Decimal("0.01"),     Decimal("944.74"),     Decimal("0.00"),    Decimal("1.92")),
    (Decimal("944.75"),   Decimal("5656.83"),    Decimal("18.13"),   Decimal("6.40")),
    (Decimal("5656.84"),  Decimal("9952.17"),    Decimal("319.64"),  Decimal("10.88")),
    (Decimal("9952.18"),  Decimal("11543.21"),   Decimal("787.29"),  Decimal("16.00")),
    (Decimal("11543.22"), Decimal("13411.68"),   Decimal("1041.94"), Decimal("17.92")),
    (Decimal("13411.69"), Decimal("16424.23"),   Decimal("1376.10"), Decimal("21.36")),
    (Decimal("16424.24"), Decimal("22731.53"),   Decimal("2019.66"), Decimal("23.52")),
    (Decimal("22731.54"), Decimal("42590.02"),   Decimal("3503.00"), Decimal("30.00")),
    (Decimal("42590.03"), Decimal("73548.25"),   Decimal("9460.58"), Decimal("32.00")),
    (Decimal("73548.26"), Decimal("101029.89"),  Decimal("19367.23"),Decimal("34.00")),
    (Decimal("101029.90"), Decimal("999999999.99"), Decimal("28710.97"), Decimal("35.00")),
]

# ─── Subsidio al Empleo Mensual (LISR Art. 8 transitorio) ───
# (lim_inf_ingreso, lim_sup_ingreso, subsidio_mensual)
SUBSIDIO_AL_EMPLEO = [
    (Decimal("0.01"),    Decimal("1768.90"),  Decimal("407.02")),
    (Decimal("1768.91"), Decimal("2653.38"),  Decimal("406.07")),
    (Decimal("2653.39"), Decimal("3472.84"),  Decimal("393.64")),
    (Decimal("3472.85"), Decimal("3537.87"),  Decimal("379.66")),
    (Decimal("3537.88"), Decimal("4446.80"),  Decimal("355.51")),
    (Decimal("4446.81"), Decimal("4717.84"),  Decimal("331.36")),
    (Decimal("4717.85"), Decimal("5335.85"),  Decimal("300.35")),
    (Decimal("5335.86"), Decimal("6224.67"),  Decimal("266.85")),
    (Decimal("6224.68"), Decimal("7113.90"),  Decimal("232.35")),
    (Decimal("7113.91"), Decimal("7382.33"),  Decimal("196.37")),
    (Decimal("7382.34"), Decimal("8249.98"),  Decimal("158.92")),
    (Decimal("8249.99"), Decimal("9125.58"),  Decimal("120.30")),
    (Decimal("9125.59"), Decimal("10000.00"), Decimal("80.12")),
]


def _red(valor: Decimal) -> Decimal:
    return valor.quantize(_DOS, rounding=ROUND_HALF_UP)


def _ingreso_a_mensual(ingreso_periodo: Decimal, dias_periodo: int) -> Decimal:
    """Convierte un ingreso de periodo (N días) a su equivalente mensual (30 días)."""
    if dias_periodo <= 0:
        return Decimal("0")
    return _red(ingreso_periodo / Decimal(dias_periodo) * Decimal("30"))


def _mensual_a_periodo(ingreso_mensual: Decimal, dias_periodo: int) -> Decimal:
    """Convierte un ingreso mensual (30 días) a su valor para N días del periodo."""
    if dias_periodo <= 0:
        return Decimal("0")
    return _red(ingreso_mensual / Decimal("30") * Decimal(dias_periodo))


# ─── Funciones de cálculo individual ──────────────


def calcular_sueldo_base(salario_diario: Decimal, dias: int) -> Decimal:
    """Sueldo base del periodo: salario_diario × días trabajados."""
    return _red(salario_diario * Decimal(dias))


def calcular_aguinaldo_proporcional(salario_diario: Decimal, dias_periodo: int) -> Decimal:
    """Aguinaldo proporcional al periodo.
    Fórmula: (salario_diario × 15 / 365) × días_del_periodo
    """
    return _red(salario_diario * Decimal("15") / Decimal("365") * Decimal(dias_periodo))


def calcular_prima_vacacional_proporcional(
    salario_diario: Decimal,
    dias_vacaciones: int,
    prima_pct: Decimal,
    dias_periodo: int,
) -> Decimal:
    """Prima vacacional proporcional al periodo.
    Fórmula: (salario_diario × prima_pct × días_vacaciones / 365) × días_del_periodo
    """
    return _red(salario_diario * prima_pct * Decimal(dias_vacaciones) / Decimal("365") * Decimal(dias_periodo))


def obtener_dias_vacaciones(anios_servicio: int) -> int:
    """Días de vacaciones según años de servicio (LFT Art. 76)."""
    return DIAS_VACACIONES_POR_ANIO.get(min(anios_servicio, 15), 40)


def calcular_anios_servicio(fecha_ingreso: datetime | None, fecha_referencia: datetime | None = None) -> int:
    """Calcula años completos de servicio hasta la fecha de referencia (o hoy)."""
    if not fecha_ingreso:
        return 1
    ref = fecha_referencia or datetime.utcnow()
    diff = ref - fecha_ingreso
    return max(1, diff.days // 365)


def calcular_imss_obrero(salario_diario: Decimal, clase_riesgo: int, dias_periodo: int) -> Decimal:
    """Cuota IMSS obrera para el periodo. Reutiliza motor IMSS existente."""
    data = DatosTrabajador(
        salario_diario=salario_diario,
        clase_riesgo=clase_riesgo,
        dias_aguinaldo=15,
        prima_vacacional_pct=Decimal("0.25"),
    )
    resultado = calcular_cuotas(data)
    return _red(resultado.total_obrero * Decimal(dias_periodo))


def calcular_isr_sobre_ingreso(ingreso_mensual: Decimal) -> Decimal:
    """Calcula ISR aplicando la tarifa mensual (LISR Art. 96)."""
    for lim_inf, lim_sup, cuota_fija, tasa in TARIFA_ISR_MENSUAL:
        if lim_inf <= ingreso_mensual <= lim_sup:
            excedente = ingreso_mensual - (lim_inf - Decimal("0.01"))
            isr = cuota_fija + (excedente * tasa / Decimal("100"))
            return _red(isr)
    return Decimal("0")


def calcular_subsidio_mensual(ingreso_mensual: Decimal) -> Decimal:
    """Calcula el subsidio al empleo mensual aplicable."""
    for lim_inf, lim_sup, subsidio in SUBSIDIO_AL_EMPLEO:
        if lim_inf <= ingreso_mensual <= lim_sup:
            return subsidio
    return Decimal("0")


def calcular_isr_con_subsidio(
    salario_diario: Decimal,
    dias_periodo: int,
) -> tuple[Decimal, Decimal, Decimal]:
    """Calcula ISR bruto, subsidio al empleo e ISR neto para el periodo.

    Returns:
        (isr_bruto_del_periodo, subsidio_del_periodo, isr_neto_del_periodo)
    """
    sueldo_base = calcular_sueldo_base(salario_diario, dias_periodo)
    # ISR se calcula sobre la percepción total, no solo sueldo base
    # Para simplificar, usamos sueldo base (sin aguinaldo/prima que tienen su propio tratamiento)
    ingreso_mensual = _ingreso_a_mensual(sueldo_base, dias_periodo)

    isr_mensual = calcular_isr_sobre_ingreso(ingreso_mensual)
    subsidio_mensual = calcular_subsidio_mensual(ingreso_mensual)

    isr_bruto_periodo = _mensual_a_periodo(isr_mensual, dias_periodo)
    subsidio_periodo = _mensual_a_periodo(subsidio_mensual, dias_periodo)

    isr_neto_periodo = _red(max(Decimal("0"), isr_bruto_periodo - subsidio_periodo))

    return isr_bruto_periodo, subsidio_periodo, isr_neto_periodo


# ─── Procesamiento de periodo completo ────────────


async def procesar_periodo(
    periodo: PeriodoNomina,
    empleados: list[Empleado],
    async_session: AsyncSession,
) -> list[Recibo]:
    """Procesa la nómina de un periodo completo."""

    # Calcular días del periodo
    diff = periodo.fecha_fin - periodo.fecha_inicio
    dias_periodo = max(1, diff.days + 1)  # inclusive
    fecha_ref = periodo.fecha_fin

    recibos_creados: list[Recibo] = []

    for emp in empleados:
        # ── Años de servicio real ──
        anios_servicio = calcular_anios_servicio(emp.fecha_ingreso, fecha_ref)
        dias_vac = obtener_dias_vacaciones(anios_servicio)

        # ── Percepciones ──
        sueldo = calcular_sueldo_base(emp.salario_diario, dias_periodo)
        aguinaldo = calcular_aguinaldo_proporcional(emp.salario_diario, dias_periodo)
        prima_vac = calcular_prima_vacacional_proporcional(
            emp.salario_diario, dias_vac, Decimal("0.25"), dias_periodo
        )
        percepciones = sueldo + aguinaldo + prima_vac

        # ── ISR real con subsidio ──
        isr_bruto, subsidio, isr_neto = calcular_isr_con_subsidio(
            emp.salario_diario, dias_periodo
        )

        # ── IMSS obrero ──
        imss_obrero = calcular_imss_obrero(
            emp.salario_diario, emp.clase_riesgo, dias_periodo
        )

        # ── Deducciones totales ──
        deducciones = imss_obrero + isr_neto
        neto = percepciones - deducciones

        # ── SBC ──
        data_sbc = DatosTrabajador(
            salario_diario=emp.salario_diario,
            clase_riesgo=emp.clase_riesgo,
        )
        resultado_imss = calcular_cuotas(data_sbc)
        sbc = resultado_imss.sbc_diario

        recibo = Recibo(
            periodo_id=periodo.id,
            empleado_id=emp.id,
            salario_diario=emp.salario_diario,
            dias_trabajados=dias_periodo,
            sbc=sbc,
            sueldo_base=sueldo,
            aguinaldo=aguinaldo,
            prima_vacacional=prima_vac,
            otras_percepciones=Decimal("0"),
            total_percepciones=percepciones,
            imss_obrero=imss_obrero,
            isr=isr_bruto,
            subsidio_al_empleo=subsidio,
            isr_neto=isr_neto,
            otras_deducciones=Decimal("0"),
            total_deducciones=deducciones,
            neto=neto,
        )
        async_session.add(recibo)
        recibos_creados.append(recibo)

    await async_session.flush()

    # Marcar periodo como calculado (mergearlo primero si viene detached)
    periodo_en_sesion = await async_session.merge(periodo)
    periodo_en_sesion.estatus = "calculado"
    await async_session.flush()

    # Refrescar para obtener IDs
    for r in recibos_creados:
        await async_session.refresh(r)

    await async_session.commit()

    return recibos_creados
