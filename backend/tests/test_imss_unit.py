"""Tests unitarios del Motor IMSS — sin base de datos."""

from decimal import Decimal
import pytest

from app.imss import (
    calcular_cuotas, calcular_factor_integracion,
    calcular_sbc, redondear,
)
from app.imss.types import DatosTrabajador
from app.imss.rates import (
    UMA_DIARIA, RIESGO_CLASE, DIAS_VACACIONES_POR_ANIO,
    ENF_MAT, INVALIDEZ_VIDA, RCIV, GUARDERIAS, INFONAVIT,
)


# ─── Factor de Integración ─────────────────────────

class TestFactorIntegracion:
    def test_factor_base_1_ano(self):
        """15 días aguinaldo, 25% prima vacacional, 1 año → 12 días vac."""
        factor = calcular_factor_integracion(
            Decimal("500"), 15, Decimal("0.25"), 1
        )
        esperado = Decimal(1) + Decimal(15)/Decimal(365) + Decimal("0.25")*Decimal(12)/Decimal(365)
        assert factor == esperado.quantize(Decimal("0.000001"))

    def test_factor_5_anos(self):
        """5 años → 20 días vacaciones."""
        factor = calcular_factor_integracion(
            Decimal("500"), 15, Decimal("0.25"), 5
        )
        esperado = Decimal(1) + Decimal(15)/Decimal(365) + Decimal("0.25")*Decimal(20)/Decimal(365)
        assert factor == esperado.quantize(Decimal("0.000001"))

    def test_factor_15_anos(self):
        """15 años → 40 días vacaciones."""
        factor = calcular_factor_integracion(
            Decimal("500"), 15, Decimal("0.25"), 15
        )
        esperado = Decimal(1) + Decimal(15)/Decimal(365) + Decimal("0.25")*Decimal(40)/Decimal(365)
        assert factor == esperado.quantize(Decimal("0.000001"))

    def test_factor_30_dias_aguinaldo(self):
        """30 días aguinaldo personalizado."""
        factor = calcular_factor_integracion(
            Decimal("500"), 30, Decimal("0.25"), 1
        )
        esperado = Decimal(1) + Decimal(30)/Decimal(365) + Decimal("0.25")*Decimal(12)/Decimal(365)
        assert factor == esperado.quantize(Decimal("0.000001"))

    def test_factor_50pct_prima(self):
        """50% prima vacacional."""
        factor = calcular_factor_integracion(
            Decimal("500"), 15, Decimal("0.50"), 1
        )
        esperado = Decimal(1) + Decimal(15)/Decimal(365) + Decimal("0.50")*Decimal(12)/Decimal(365)
        assert factor == esperado.quantize(Decimal("0.000001"))

    def test_factor_salario_minimo(self):
        """Salario mínimo aproximado."""
        factor = calcular_factor_integracion(
            Decimal("278.80"), 15, Decimal("0.25"), 1
        )
        esperado = Decimal(1) + Decimal(15)/Decimal(365) + Decimal("0.25")*Decimal(12)/Decimal(365)
        assert factor == esperado.quantize(Decimal("0.000001"))


# ─── Cálculo de SBC ────────────────────────────────

class TestCalculoSBC:
    def test_sbc_normal(self):
        """Salario $500, factor 1.049315 → SBC $524.66/día, $15,739.73/mes."""
        sbc = calcular_sbc(Decimal("500"), Decimal("1.049315"))
        assert sbc.sbc_diario == Decimal("524.66")
        assert sbc.sbc_mensual == Decimal("15739.73")
        assert not sbc.tope_aplicado
        assert sbc.excede_uma

    def test_sbc_sin_excedente_uma(self):
        """Salario bajo (~$200) que no excede 3 UMAs."""
        sbc = calcular_sbc(Decimal("200"), Decimal("1.049315"))
        assert not sbc.excede_uma  # 200 * 1.049315 = 209.86 < 3*117.31=351.93
        assert not sbc.tope_aplicado

    def test_sbc_tope_25_umas(self):
        """Salario alto que supera 25 UMAs ($117.31 * 25 = $2,932.75)."""
        sbc = calcular_sbc(Decimal("50000"), Decimal("1.0"))
        assert sbc.tope_aplicado
        assert sbc.sbc_diario == redondear(UMA_DIARIA * Decimal(25))

    def test_umas_display(self):
        """SBC $524.66 / UMA $117.31 = 4.47 UMAs."""
        sbc = calcular_sbc(Decimal("500"), Decimal("1.049315"))
        umas_calc = sbc.sbc_diario / UMA_DIARIA
        assert umas_calc.quantize(Decimal("0.01")) == Decimal("4.47")


# ─── Cuotas Completas ──────────────────────────────

class TestCuotasIMSS:
    def test_cuotas_clase_I_500(self):
        """Caso base: $500/día, Clase I, 1 año."""
        data = DatosTrabajador(
            salario_diario=Decimal("500"),
            dias_aguinaldo=15,
            prima_vacacional_pct=Decimal("0.25"),
            clase_riesgo=1,
        )
        result = calcular_cuotas(data)

        assert result.sbc_diario == Decimal("524.66")
        assert result.umas == Decimal("4.47")
        assert len(result.cuotas) == 6

        # Riesgos de Trabajo (0.50% de SBC)
        assert result.cuotas[0].concepto == "Riesgos de Trabajo"
        assert result.cuotas[0].tasa_patronal == Decimal("0.50")
        assert result.cuotas[0].tasa_obrera == Decimal("0")
        assert result.cuotas[0].monto_patronal == redondear(Decimal("524.66") * Decimal("0.005"))

        # Enf. y Maternidad (20.40% hasta 25UMA + 0.70% excedente 3UMA)
        assert result.cuotas[1].concepto == "Enf. y Maternidad"
        assert result.cuotas[1].tasa_patronal == Decimal("21.10")  # 20.40 + 0.70

        # Invalidez y Vida (1.75% + 0.625%)
        assert result.cuotas[2].concepto == "Invalidez y Vida"
        assert result.cuotas[2].tasa_patronal == Decimal("1.75")
        assert result.cuotas[2].tasa_obrera == Decimal("0.625")

        # Retiro, CEAV (2.00% + 3.15%, obrero 1.125%)
        assert result.cuotas[3].concepto == "Retiro, CEAV"
        assert result.cuotas[3].tasa_patronal == Decimal("5.15")  # 2.00 + 3.15
        assert result.cuotas[3].tasa_obrera == Decimal("1.125")

        # Guarderías (1.00%)
        assert result.cuotas[4].concepto == "Guarderías y P. Sociales"
        assert result.cuotas[4].tasa_patronal == Decimal("1.00")

        # Infonavit (5.00%)
        assert result.cuotas[5].concepto == "Infonavit"
        assert result.cuotas[5].tasa_patronal == Decimal("5.00")

    def test_totales_500_claseI(self):
        """Verificar totales conocidos: $500/día, Riesgo I."""
        data = DatosTrabajador(
            salario_diario=Decimal("500"),
            clase_riesgo=1,
        )
        result = calcular_cuotas(data)

        # Estos son los valores calculados previamente
        assert result.total_patronal == Decimal("178.54")
        assert result.total_obrero == Decimal("9.87")
        assert result.gran_total == Decimal("188.41")

    def test_totales_500_claseV(self):
        """Verificar cambio de clase de riesgo: V (3.50%)."""
        data = DatosTrabajador(
            salario_diario=Decimal("500"),
            clase_riesgo=5,
        )
        result = calcular_cuotas(data)

        # Clase V tiene 3.50% para RT → patronal aumenta
        rt_base = RIESGO_CLASE[5]["prima_base"] / Decimal(100)
        assert result.cuotas[0].monto_patronal == redondear(Decimal("524.66") * rt_base)

    def test_salario_bajo(self):
        """Salario $200 sin excedente de 3 UMAs."""
        data = DatosTrabajador(
            salario_diario=Decimal("200"),
            clase_riesgo=1,
        )
        result = calcular_cuotas(data)
        # No debería tener cuota obrera de Enf. y Mat (no excede 3 UMAs)
        assert result.cuotas[1].monto_obrero == Decimal("0")

    def test_salario_alto_tope(self):
        """Salario muy alto que alcanza tope de 25 UMAs."""
        data = DatosTrabajador(
            salario_diario=Decimal("5000"),
            clase_riesgo=1,
        )
        result = calcular_cuotas(data)
        assert result.sbc_diario == UMA_DIARIA * Decimal(25)

    def test_clase_riesgo_todas(self):
        """Verificar que cada clase produce distinta prima de RT."""
        montos = []
        for clase in range(1, 6):
            data = DatosTrabajador(
                salario_diario=Decimal("500"),
                clase_riesgo=clase,
            )
            result = calcular_cuotas(data)
            montos.append(result.cuotas[0].monto_patronal)

        # Cada clase debe dar mayor monto que la anterior
        for i in range(len(montos) - 1):
            assert montos[i] < montos[i + 1], f"Clase {i+1} no menor que {i+2}"

    def test_factor_override(self):
        """Factor de integración personalizado."""
        data = DatosTrabajador(
            salario_diario=Decimal("500"),
            factor_integracion=Decimal("1.045205"),
            clase_riesgo=1,
        )
        result = calcular_cuotas(data)
        assert result.sbc_diario == redondear(Decimal("500") * Decimal("1.045205"))

    def test_dias_aguinaldo_personalizado(self):
        """20 días de aguinaldo."""
        data = DatosTrabajador(
            salario_diario=Decimal("500"),
            dias_aguinaldo=20,
            clase_riesgo=1,
        )
        result = calcular_cuotas(data)
        factor_esperado = Decimal(1) + Decimal(20)/Decimal(365) + Decimal("0.25")*Decimal(12)/Decimal(365)
        assert result.sbc_diario == redondear(Decimal("500") * factor_esperado.quantize(Decimal("0.000001")))

    def test_prima_vacacional_50(self):
        """50% prima vacacional."""
        data = DatosTrabajador(
            salario_diario=Decimal("500"),
            prima_vacacional_pct=Decimal("0.50"),
            clase_riesgo=1,
        )
        result = calcular_cuotas(data)
        factor_esperado = Decimal(1) + Decimal(15)/Decimal(365) + Decimal("0.50")*Decimal(12)/Decimal(365)
        sbc_esperado = redondear(Decimal("500") * factor_esperado.quantize(Decimal("0.000001")))
        assert result.sbc_diario == sbc_esperado


# ─── Constantes y Límites ──────────────────────────

class TestConstantes:
    def test_uma_2026(self):
        """UMA 2026 oficial según INEGI."""
        assert UMA_DIARIA == Decimal("117.31")

    def test_tope_25_umas(self):
        """Tope de 25 UMAs."""
        tope = UMA_DIARIA * Decimal(25)
        from app.imss.rates import TOPE_SBC_DIARIO
        assert TOPE_SBC_DIARIO == tope

    def test_dias_vacaciones_tabla(self):
        """Tabla completa de días de vacaciones."""
        assert DIAS_VACACIONES_POR_ANIO == {
            1: 12, 2: 14, 3: 16, 4: 18, 5: 20,
            6: 22, 7: 24, 8: 26, 9: 28, 10: 30,
            11: 32, 12: 34, 13: 36, 14: 38, 15: 40,
        }

    def test_riesgo_clase_estructura(self):
        """Estructura de RIESGO_CLASE."""
        for clase in range(1, 6):
            assert "descripcion" in RIESGO_CLASE[clase]
            assert "prima_base" in RIESGO_CLASE[clase]
            assert "prima_min" in RIESGO_CLASE[clase]
            assert "prima_max" in RIESGO_CLASE[clase]

    def test_riesgo_prima_ascendente(self):
        """Prima base debe aumentar con la clase."""
        bases = [RIESGO_CLASE[c]["prima_base"] for c in range(1, 6)]
        for i in range(len(bases) - 1):
            assert bases[i] < bases[i + 1]
