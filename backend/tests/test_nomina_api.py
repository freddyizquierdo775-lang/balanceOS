"""Tests de API de Nómina — Períodos, Recibos y Cálculo completo."""

import pytest
from decimal import Decimal as D
from datetime import datetime

pytestmark = pytest.mark.asyncio

def AUTH(t):
    return {"Authorization": f"Bearer {t}"}


class TestPeriodosAPI:
    async def test_crear_periodo(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/nomina/periodos", headers=AUTH(t), json={
            "nombre": "Julio Quincena 1",
            "fecha_inicio": "2026-07-01T00:00:00",
            "fecha_fin": "2026-07-15T00:00:00",
            "tipo": "quincenal",
        })
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["nombre"] == "Julio Quincena 1"
        assert d["estatus"] == "abierto"
        assert d["tipo"] == "quincenal"

    async def test_listar_periodos(self, client, test_env):
        t = test_env["admin_token"]
        await client.post("/nomina/periodos", headers=AUTH(t), json={
            "nombre": "Agosto Semana 1",
            "fecha_inicio": "2026-08-01T00:00:00",
            "fecha_fin": "2026-08-07T00:00:00",
            "tipo": "semanal",
        })
        r = await client.get("/nomina/periodos", headers=AUTH(t))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    async def test_obtener_periodo(self, client, test_env):
        t = test_env["admin_token"]
        c = await client.post("/nomina/periodos", headers=AUTH(t), json={
            "nombre": "Periodo Test",
            "fecha_inicio": "2026-06-01T00:00:00",
            "fecha_fin": "2026-06-15T00:00:00",
            "tipo": "quincenal",
        })
        pid = c.json()["id"]
        r = await client.get(f"/nomina/periodos/{pid}", headers=AUTH(t))
        assert r.status_code == 200
        assert r.json()["nombre"] == "Periodo Test"

    async def test_401_sin_token(self, client):
        r = await client.post("/nomina/periodos", json={
            "nombre": "No Auth", "fecha_inicio": "2026-01-01T00:00:00",
            "fecha_fin": "2026-01-15T00:00:00", "tipo": "quincenal",
        })
        assert r.status_code in (401, 403)


class TestCalculoAPI:
    async def _setup(self, client, token, suf=""):
        import random, string
        suf = suf or ''.join(random.choices(string.ascii_uppercase, k=3))
        r = await client.post("/empleados/", headers=AUTH(token), json={
            "rfc": f"NOM202601{suf}",
            "curp": f"NOMI240101RFC{suf}AB",
            "nombre": "Nomina", "apellidos": "Test",
            "salario_diario": "500.00",
            "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        assert r.status_code == 201, r.text
        r = await client.post("/nomina/periodos", headers=AUTH(token), json={
            "nombre": "Quincena Cálculo",
            "fecha_inicio": "2026-08-01T00:00:00",
            "fecha_fin": "2026-08-15T00:00:00",
            "tipo": "quincenal",
        })
        assert r.status_code == 201, r.text
        return r.json()["id"]  # periodo_id

    async def test_calcular_periodo(self, client, test_env):
        t = test_env["admin_token"]
        pid = await self._setup(client, t)
        r = await client.post(f"/nomina/periodos/{pid}/calcular", headers=AUTH(t))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["estatus"] == "calculado"
        assert len(d["recibos"]) == 1
        rec = d["recibos"][0]
        assert float(rec["neto"]) > 0
        assert rec["sueldo_base"] == "7500.00"

    async def test_calcular_sin_empleados(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/nomina/periodos", headers=AUTH(t), json={
            "nombre": "Vacio",
            "fecha_inicio": "2026-08-16T00:00:00",
            "fecha_fin": "2026-08-31T00:00:00",
            "tipo": "quincenal",
        })
        pid = r.json()["id"]
        # Desactivar empleados y luego restaurarlos
        r = await client.get("/empleados/", headers=AUTH(t))
        empleados_prev = r.json()
        for emp in empleados_prev:
            await client.put(f"/empleados/{emp['id']}", headers=AUTH(t), json={"activo": False})
        r = await client.post(f"/nomina/periodos/{pid}/calcular", headers=AUTH(t))
        assert r.status_code == 400, r.text
        assert "No hay empleados" in r.text
        # Restaurar empleados
        for emp in empleados_prev:
            await client.put(f"/empleados/{emp['id']}", headers=AUTH(t), json={"activo": True})

    async def test_calcular_periodo_inexistente(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/nomina/periodos/99999/calcular", headers=AUTH(t))
        assert r.status_code == 404

    async def test_recibos_por_periodo(self, client, test_env):
        """Obtener recibos filtrados por periodo_id."""
        t = test_env["admin_token"]
        # Reusar setup de otro test que sí funciona
        pid = await self._setup(client, t, "ABC")
        r = await client.post(f"/nomina/periodos/{pid}/calcular", headers=AUTH(t))
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["recibos"]) >= 1, f"Calculate returned no recibos: {d}"
        rid = d["recibos"][0]["id"]
        # Verificar GET individual
        r = await client.get(f"/nomina/recibos/{rid}", headers=AUTH(t))
        assert r.status_code == 200, r.text
        assert float(r.json()["neto"]) > 0
        # Verificar GET por periodo
        r = await client.get(f"/nomina/recibos?periodo_id={pid}", headers=AUTH(t))
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1, f"No recibos for periodo {pid}: {data}"
        assert any(r2["id"] == rid for r2 in data), "Recibo not in list"

    async def test_obtener_recibo(self, client, test_env):
        """Obtener recibo por ID."""
        t = test_env["admin_token"]
        # Crear setup mínimo inline para evitar state sharing
        r = await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "REC000101ABC", "curp": "TEST240101RFCABCAB",
            "nombre": "Recibo", "apellidos": "Test",
            "salario_diario": "500", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        assert r.status_code == 201, r.text
        r = await client.post("/nomina/periodos", headers=AUTH(t), json={
            "nombre": "Test Recibo", "fecha_inicio": "2026-09-01T00:00:00",
            "fecha_fin": "2026-09-15T00:00:00", "tipo": "quincenal",
        })
        assert r.status_code == 201, r.text
        pid = r.json()["id"]
        r = await client.post(f"/nomina/periodos/{pid}/calcular", headers=AUTH(t))
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["recibos"]) >= 1, f"No recibos: {d}"
        rid = d["recibos"][0]["id"]
        r = await client.get(f"/nomina/recibos/{rid}", headers=AUTH(t))
        assert r.status_code == 200, r.text
        assert float(r.json()["neto"]) > 0
