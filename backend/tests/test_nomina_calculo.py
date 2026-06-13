"""Tests de Lógica de Cálculo de Nómina — TDD RED phase."""

import pytest
from decimal import Decimal as D
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload

pytestmark = pytest.mark.asyncio

D2 = lambda v: D(str(v))


class TestCalculoNomina:
    """RED: Servicio de cálculo que procesa un periodo completo."""

    async def test_calcular_sueldo_base(self):
        """Salario $500/día × 15 días = $7,500."""
        from app.nomina.calculo import calcular_sueldo_base
        result = calcular_sueldo_base(D2("500"), 15)
        assert result == D2("7500.00")

    async def test_calcular_aguinaldo_proporcional(self):
        """Aguinaldo proporcional para periodo de 15 días.
        Fórmula: (salario_diario * 15 / 365) * dias_periodo
        """
        from app.nomina.calculo import calcular_aguinaldo_proporcional
        # (500 * 15 / 365) * 15 = 500 * 225 / 365 = 308.22
        result = calcular_aguinaldo_proporcional(D2("500"), 15)
        esperado = D2("500") * D2("15") / D2("365") * D2("15")
        assert result == esperado.quantize(D("0.01"))

    async def test_calcular_prima_vacacional_proporcional(self):
        """Prima vacacional al 25% para empleado con 1 año.
        Fórmula: (salario_diario * 0.25 * 12 / 365) * dias_periodo
        """
        from app.nomina.calculo import calcular_prima_vacacional_proporcional
        result = calcular_prima_vacacional_proporcional(D2("500"), 12, D2("0.25"), 15)
        esperado = D2("500") * D2("0.25") * D2("12") / D2("365") * D2("15")
        assert result == esperado.quantize(D("0.01"))

    async def test_calcular_imss_obrero(self):
        """Reutiliza motor IMSS para obtener cuota obrera."""
        from app.nomina.calculo import calcular_imss_obrero
        result = calcular_imss_obrero(D2("500"), 1, 15)
        # IMSS obrero diario * 15 días
        assert result > D2("0")
        assert result < D2("500")  # sensato

    async def test_calcular_isr_tarifa(self):
        """ISR mensual con tarifa real LISR Art. 96."""
        from app.nomina.calculo import (
            calcular_isr_sobre_ingreso, calcular_subsidio_mensual,
            calcular_isr_con_subsidio, calcular_anios_servicio
        )
        from datetime import datetime, timedelta
        # $7,500/mes → ISR ~ calculado por tarifa
        isr = calcular_isr_sobre_ingreso(D2("7500"))
        assert isr > D2("0")
        assert D2("400") < isr < D2("600")

        # $15,000/mes
        isr = calcular_isr_sobre_ingreso(D2("15000"))
        assert D2("1500") < isr < D2("2000")

    async def test_calcular_subsidio_mensual(self):
        from app.nomina.calculo import calcular_subsidio_mensual
        # $5,000/mes → tiene subsidio
        sub = calcular_subsidio_mensual(D2("5000"))
        assert sub > D2("0")
        assert sub <= D2("407.02")  # máximo del subsidio

        # $20,000/mes → sin subsidio
        sub = calcular_subsidio_mensual(D2("20000"))
        assert sub == D2("0")

    async def test_calcular_anios_servicio(self):
        from app.nomina.calculo import calcular_anios_servicio
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        # 5 años de antigüedad
        ingreso = now - timedelta(days=365 * 5 + 30)
        assert calcular_anios_servicio(ingreso, now) >= 5
        # Menos de 1 año → mínimo 1
        ingreso = now - timedelta(days=30)
        assert calcular_anios_servicio(ingreso, now) == 1
        # None → default 1
        assert calcular_anios_servicio(None) == 1

    async def test_calcular_isr_con_subsidio_bajo(self):
        """Salario bajo ($257/día) → aplica subsidio."""
        from app.nomina.calculo import calcular_isr_con_subsidio
        isr_bruto, subsidio, isr_neto = calcular_isr_con_subsidio(D2("257"), 15)
        assert isr_bruto > D2("0")
        assert subsidio > D2("0")  # tiene subsidio
        assert isr_neto < isr_bruto  # subsidio redujo ISR

    async def test_calcular_isr_con_subsidio_alto(self):
        """Salario alto ($2,000/día) → sin subsidio."""
        from app.nomina.calculo import calcular_isr_con_subsidio
        isr_bruto, subsidio, isr_neto = calcular_isr_con_subsidio(D2("2000"), 15)
        assert isr_bruto > D2("1000")
        assert subsidio == D2("0")
        assert isr_neto == isr_bruto

    async def test_procesar_periodo_completo(self, test_env, client):
        """Procesar un periodo con 2 empleados → crear recibos, marcar periodo calculado."""
        from app.nomina.calculo import procesar_periodo
        sf = test_env["session_factory"]

        # Setup: crear empleados y periodo en DB
        async with sf() as s:
            from app.models import Empleado, PeriodoNomina
            e1 = Empleado(
                rfc="E001010101AAA", curp="EJEM000101HDFAAA01",
                nombre="Ana", apellidos="López",
                salario_diario=D2("500"), clase_riesgo=1,
            )
            e2 = Empleado(
                rfc="E002010101BBB", curp="EJEM000102HDFBBB02",
                nombre="Luis", apellidos="Martínez",
                salario_diario=D2("800"), clase_riesgo=2,
            )
            periodo = PeriodoNomina(
                nombre="Julio Quincena 2 Test",
                fecha_inicio=datetime(2026, 7, 16),
                fecha_fin=datetime(2026, 7, 30),  # 16→30 = 15 días
                tipo="quincenal",
            )
            s.add_all([e1, e2, periodo])
            await s.commit()
            await s.refresh(e1)
            await s.refresh(e2)
            await s.refresh(periodo)
            e1_id = e1.id
            e2_id = e2.id
            p_id = periodo.id

        # Ejecutar cálculo (nueva firma: periodo, empleados, async_session)
        async with sf() as s:
            recibos_creados = await procesar_periodo(periodo, [e1, e2], s)
            await s.commit()

        assert len(recibos_creados) == 2

        # Verificar recibos creados
        async with sf() as s:
            from app.models import Recibo
            recibos = await s.execute(
                select(Recibo)
                .where(Recibo.periodo_id == p_id)
                .options(selectinload(Recibo.empleado))
            )
            recibos = recibos.scalars().all()
            assert len(recibos) == 2

            r_ana = [r for r in recibos if r.empleado_id == e1_id][0]
            assert r_ana.sueldo_base == D2("7500.00")  # 500 * 15
            assert r_ana.total_percepciones > D2("7500")  # base + aguinaldo + prima
            assert r_ana.imss_obrero > D2("0")
            assert r_ana.total_deducciones > D2("0")
            assert r_ana.neto > D2("0")
            assert r_ana.neto < r_ana.total_percepciones  # neto < percepciones

            r_luis = [r for r in recibos if r.empleado_id == e2_id][0]
            assert r_luis.sueldo_base == D2("12000.00")  # 800 * 15
            assert r_luis.total_percepciones > r_ana.total_percepciones

        # Verificar periodo marcado como calculado
        async with sf() as s:
            p = await s.execute(select(PeriodoNomina).where(PeriodoNomina.id == p_id))
            p = p.scalar_one()
            assert p.estatus == "calculado"
