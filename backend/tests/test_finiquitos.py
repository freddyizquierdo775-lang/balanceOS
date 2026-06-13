"""Tests de Finiquitos — cálculo LFT y API."""

import pytest
from decimal import Decimal as D
from datetime import datetime, timedelta

pytestmark = pytest.mark.asyncio

def AUTH(t):
    return {"Authorization": f"Bearer {t}"}


class TestFiniquitoCalculo:
    async def test_calcular_dias_vacaciones(self):
        from app.finiquitos.calculo import calcular_dias_vacaciones_pendientes
        ingreso = datetime(2020, 1, 1)
        baja = datetime(2026, 7, 1)  # ~6.5 años
        dias = calcular_dias_vacaciones_pendientes(6, ingreso, baja)
        assert dias > 0
        assert dias <= 22  # máximo para 6 años

    async def test_calcular_finiquito_despido(self):
        from app.finiquitos.calculo import calcular_finiquito
        ingreso = datetime(2020, 1, 1)
        baja = datetime(2026, 7, 1)
        r = calcular_finiquito(D("500"), ingreso, baja, "despido_injustificado")
        assert r["anios_servicio"] >= 6
        assert r["indemnizacion_3meses"] > D("0")
        assert r["indemnizacion_20dias_x_anio"] > D("0")
        assert r["prima_antiguedad"] > D("0")
        assert r["total_percepciones"] > r["indemnizacion_3meses"]
        assert r["neto"] > D("0")
        assert r["neto"] < r["total_percepciones"]

    async def test_calcular_finiquito_renuncia(self):
        from app.finiquitos.calculo import calcular_finiquito
        ingreso = datetime(2022, 6, 1)
        baja = datetime(2026, 6, 1)
        r = calcular_finiquito(D("500"), ingreso, baja, "renuncia")
        # Renuncia: solo prima antigüedad + proporcionales
        assert r["indemnizacion_3meses"] == D("0")
        assert r["indemnizacion_20dias_x_anio"] == D("0")
        assert r["neto"] > D("0")

    async def test_calcular_finiquito_salario_minimo(self):
        from app.finiquitos.calculo import calcular_finiquito
        ingreso = datetime(2024, 1, 1)
        baja = datetime(2026, 6, 1)
        r = calcular_finiquito(D("257"), ingreso, baja, "despido_injustificado")
        assert r["neto"] > D("0")
        assert r["total_percepciones"] > D("0")


class TestFiniquitoAPI:
    async def _setup_empleado(self, client, token, suf=""):
        import random, string
        suf = suf or ''.join(random.choices(string.ascii_uppercase, k=3))
        r = await client.post("/empleados/", headers=AUTH(token), json={
            "rfc": f"FNQ202601{suf}", "curp": f"FNQI240101RFC{suf}AB",
            "nombre": "Finiquito", "apellidos": "Test",
            "salario_diario": "500.00", "tipo_contrato": "base", "tipo_jornada": "diurna",
            "fecha_ingreso": "2020-01-15T00:00:00",
        })
        assert r.status_code == 201, r.text
        return r.json()["id"]

    async def test_preview_finiquito(self, client, test_env):
        t = test_env["admin_token"]
        eid = await self._setup_empleado(client, t)
        r = await client.post("/finiquitos/preview", headers=AUTH(t), json={
            "empleado_id": eid,
            "fecha_baja": "2026-07-01T00:00:00",
            "tipo": "despido_injustificado",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["anios_servicio"] >= 6
        assert float(d["total_percepciones"]) > 0
        assert float(d["neto"]) > 0

    async def test_calcular_y_guardar(self, client, test_env):
        t = test_env["admin_token"]
        eid = await self._setup_empleado(client, t, "GRD")
        r = await client.post("/finiquitos/calcular", headers=AUTH(t), json={
            "empleado_id": eid,
            "fecha_baja": "2026-07-01T00:00:00",
            "tipo": "renuncia",
        })
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["id"] > 0
        assert d["neto"] is not None

    async def test_listar_finiquitos(self, client, test_env):
        t = test_env["admin_token"]
        eid = await self._setup_empleado(client, t, "LST")
        await client.post("/finiquitos/calcular", headers=AUTH(t), json={
            "empleado_id": eid, "fecha_baja": "2026-07-01T00:00:00", "tipo": "despido_injustificado",
        })
        r = await client.get("/finiquitos/", headers=AUTH(t))
        assert r.status_code == 200
        assert len(r.json()) >= 1
