"""Tests del modelo de datos de Nómina — Periodo, Recibo."""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import select

from app.models import Empleado, PeriodoNomina, Recibo

pytestmark = pytest.mark.asyncio


class TestModeloPeriodo:
    async def test_crear_periodo(self, test_env):
        """Crear un periodo de nómina básico."""
        sf = test_env["session_factory"]
        async with sf() as s:
            hoy = datetime.utcnow()
            p = PeriodoNomina(
                nombre="Quincena 1 Julio 2026",
                fecha_inicio=hoy,
                fecha_fin=hoy + timedelta(days=15),
                tipo="quincenal",
            )
            s.add(p)
            await s.commit()
            await s.refresh(p)
            assert p.id is not None
            assert p.estatus == "abierto"
            assert p.nombre == "Quincena 1 Julio 2026"

    async def test_periodo_tipos(self, test_env):
        """Validar tipos de periodo permitidos."""
        sf = test_env["session_factory"]
        async with sf() as s:
            for tipo in ["semanal", "quincenal", "mensual"]:
                p = PeriodoNomina(
                    nombre=f"Test {tipo}",
                    fecha_inicio=datetime.utcnow(),
                    fecha_fin=datetime.utcnow() + timedelta(days=7),
                    tipo=tipo,
                )
                s.add(p)
                await s.commit()
                assert p.id is not None


class TestModeloRecibo:
    async def test_crear_recibo(self, test_env):
        """Crear recibo asociado a empleado y periodo."""
        sf = test_env["session_factory"]
        async with sf() as s:
            # Crear empleado
            emp = Empleado(
                rfc="REC000101AAA", curp="RECI000101HDFAAA01",
                nombre="Recibo", apellidos="Test",
                salario_diario=Decimal("500"),
            )
            s.add(emp)
            await s.commit()
            await s.refresh(emp)

            # Crear periodo
            p = PeriodoNomina(
                nombre="Julio Quincena 2",
                fecha_inicio=datetime.utcnow(),
                fecha_fin=datetime.utcnow() + timedelta(days=15),
                tipo="quincenal",
            )
            s.add(p)
            await s.commit()
            await s.refresh(p)

            # Crear recibo
            r = Recibo(
                periodo_id=p.id,
                empleado_id=emp.id,
                salario_diario=Decimal("500"),
                dias_trabajados=15,
                sbc=Decimal("524.66"),
                total_percepciones=Decimal("7500.00"),
                total_deducciones=Decimal("1500.00"),
                neto=Decimal("6000.00"),
            )
            s.add(r)
            await s.commit()
            await s.refresh(r)

            assert r.id is not None
            assert r.estatus == "calculado"
            from decimal import Decimal as D
            assert r.total_percepciones == D("7500.00")
            assert r.total_deducciones == D("1500.00")
            assert r.neto == D("6000.00")

    async def test_recibo_foreign_keys(self, test_env):
        """Verificar FK a empleado y periodo con eager loading."""
        sf = test_env["session_factory"]
        from sqlalchemy.orm import selectinload
        async with sf() as s:
            result = await s.execute(
                select(Recibo)
                .options(selectinload(Recibo.periodo), selectinload(Recibo.empleado))
            )
            recibos = result.scalars().all()
            assert len(recibos) >= 1
            r = recibos[0]
            assert r.empleado is not None
            assert r.empleado.nombre == "Recibo"
            assert r.periodo is not None
            assert r.periodo.nombre == "Julio Quincena 2"

    async def test_crear_empleado_db(self, test_env, client):
        """Crear un empleado en DB y verificar que persiste."""
        sf = test_env["session_factory"]
        async with sf() as session:
            from app.models import Empleado
            emp = Empleado(
                rfc="EMP000101AAA",
                curp="EMP000101HDFAAA01",
                nombre="Juan",
                apellidos="Pérez García",
                fecha_nacimiento=datetime(1990, 1, 1),
                fecha_ingreso=datetime(2024, 1, 15),
                salario_diario=Decimal("500.00"),
                tipo_contrato="base",
                tipo_jornada="diurna",
                clase_riesgo=1,
                email="juan@example.com",
            )
            session.add(emp)
            await session.commit()
            await session.refresh(emp)

            assert emp.id is not None
            assert emp.rfc == "EMP000101AAA"
            assert emp.nombre == "Juan"
            assert emp.activo is True
            assert emp.created_at is not None
            assert emp.salario_diario == Decimal("500.00")

    async def test_rfc_unico(self, test_env, client):
        """RFC duplicado debe lanzar error."""
        sf = test_env["session_factory"]
        async with sf() as session:
            from app.models import Empleado
            emp1 = Empleado(
                rfc="DUP000101AAA", curp="DUP000101HDFAAA01",
                nombre="A", apellidos="B", fecha_nacimiento=datetime(1990, 1, 1),
                fecha_ingreso=datetime(2024, 1, 1), salario_diario=Decimal("300"),
                tipo_contrato="base", tipo_jornada="diurna", clase_riesgo=1,
            )
            session.add(emp1)
            await session.commit()

            emp2 = Empleado(
                rfc="DUP000101AAA", curp="DUP000102HDFAAA01",
                nombre="B", apellidos="C", fecha_nacimiento=datetime(1990, 1, 1),
                fecha_ingreso=datetime(2024, 1, 1), salario_diario=Decimal("300"),
                tipo_contrato="base", tipo_jornada="diurna", clase_riesgo=1,
            )
            session.add(emp2)
            with pytest.raises(Exception):
                await session.commit()
