"""Tests de API de REPSE — Registros, Personal, Avisos."""

import pytest
from decimal import Decimal as D
from datetime import datetime

pytestmark = pytest.mark.asyncio

def AUTH(t):
    return {"Authorization": f"Bearer {t}"}


class TestRepseRegistroAPI:
    async def _setup_cliente(self, client, token, suf=""):
        import random, string
        suf = suf or ''.join(random.choices(string.ascii_uppercase, k=3))
        r = await client.post("/clientes/", headers=AUTH(token), json={
            "rfc": f"RSE202601{suf}",
            "razon_social": f"Cliente REPSE Test {suf}",
            "regimen_fiscal": "607",
            "tipo_persona": "moral",
        })
        assert r.status_code == 201, r.text
        return r.json()["id"]

    async def test_crear_registro(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t)
        r = await client.post("/repse/registros", headers=AUTH(t), json={
            "cliente_id": cid,
            "numero_registro": "REPSE-2026-0001",
            "fecha_registro": "2026-01-15T00:00:00",
            "fecha_vencimiento": "2027-01-15T00:00:00",
            "actividad_economica": "Servicios de consultoría",
        })
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["numero_registro"] == "REPSE-2026-0001"
        assert d["estatus"] == "activo"
        assert d["cliente_id"] == cid

    async def test_listar_registros(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t, "LST")
        await client.post("/repse/registros", headers=AUTH(t), json={
            "cliente_id": cid,
            "numero_registro": "REPSE-LST-001",
            "fecha_registro": "2026-03-01T00:00:00",
            "fecha_vencimiento": "2027-03-01T00:00:00",
        })
        r = await client.get("/repse/registros", headers=AUTH(t))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    async def test_obtener_registro(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t, "GET")
        c = await client.post("/repse/registros", headers=AUTH(t), json={
            "cliente_id": cid,
            "numero_registro": "REPSE-GET-001",
            "fecha_registro": "2026-03-01T00:00:00",
            "fecha_vencimiento": "2027-03-01T00:00:00",
        })
        rid = c.json()["id"]
        r = await client.get(f"/repse/registros/{rid}", headers=AUTH(t))
        assert r.status_code == 200
        assert r.json()["numero_registro"] == "REPSE-GET-001"

    async def test_actualizar_registro(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t, "UPD")
        c = await client.post("/repse/registros", headers=AUTH(t), json={
            "cliente_id": cid,
            "numero_registro": "REPSE-UPD-001",
            "fecha_registro": "2026-03-01T00:00:00",
            "fecha_vencimiento": "2027-03-01T00:00:00",
        })
        rid = c.json()["id"]
        r = await client.put(f"/repse/registros/{rid}", headers=AUTH(t), json={
            "estatus": "vencido",
        })
        assert r.status_code == 200
        assert r.json()["estatus"] == "vencido"

    async def test_eliminar_registro(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t, "DEL")
        c = await client.post("/repse/registros", headers=AUTH(t), json={
            "cliente_id": cid,
            "numero_registro": "REPSE-DEL-001",
            "fecha_registro": "2026-03-01T00:00:00",
            "fecha_vencimiento": "2027-03-01T00:00:00",
        })
        rid = c.json()["id"]
        r = await client.delete(f"/repse/registros/{rid}", headers=AUTH(t))
        assert r.status_code == 204

    async def test_stats(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.get("/repse/stats", headers=AUTH(t))
        assert r.status_code == 200
        d = r.json()
        assert "total_registros" in d
        assert "activos" in d
        assert "vencidos" in d


class TestRepseAvisoAPI:
    async def _setup(self, client, token, suf=""):
        import random, string
        suf = suf or ''.join(random.choices(string.ascii_uppercase, k=3))
        r = await client.post("/clientes/", headers=AUTH(token), json={
            "rfc": f"AVS202601{suf}",
            "razon_social": f"Cliente Aviso {suf}",
            "regimen_fiscal": "607",
            "tipo_persona": "moral",
        })
        cid = r.json()["id"]
        r = await client.post("/repse/registros", headers=AUTH(token), json={
            "cliente_id": cid,
            "numero_registro": f"REPSE-AVS-{suf}",
            "fecha_registro": "2026-01-01T00:00:00",
            "fecha_vencimiento": "2027-01-01T00:00:00",
        })
        return r.json()["id"]

    async def test_crear_aviso(self, client, test_env):
        t = test_env["admin_token"]
        rid = await self._setup(client, t)
        r = await client.post("/repse/avisos", headers=AUTH(t), json={
            "registro_id": rid,
            "periodo": "2026-Q2",
            "total_personal": 10,
            "administrativos": 3,
            "operativos": 7,
            "presentado": False,
        })
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["periodo"] == "2026-Q2"
        assert float(d["porcentaje_especializado"]) == 70.0  # 7/10 * 100

    async def test_listar_avisos(self, client, test_env):
        t = test_env["admin_token"]
        rid = await self._setup(client, t, "LST")
        await client.post("/repse/avisos", headers=AUTH(t), json={
            "registro_id": rid,
            "periodo": "2026-Q1",
            "total_personal": 5,
            "administrativos": 2,
            "operativos": 3,
            "presentado": True,
            "fecha_presentacion": "2026-04-15T00:00:00",
        })
        r = await client.get(f"/repse/avisos/{rid}", headers=AUTH(t))
        assert r.status_code == 200
        assert len(r.json()) >= 1
