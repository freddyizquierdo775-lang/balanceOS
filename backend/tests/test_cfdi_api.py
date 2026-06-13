"""Tests de CFDI — Generación XML y API de timbrado."""

import pytest
from decimal import Decimal as D
from datetime import datetime

pytestmark = pytest.mark.asyncio

def AUTH(t):
    return {"Authorization": f"Bearer {t}"}


class TestCFDIApi:
    async def _setup_recibo(self, client, token, suf=""):
        import random, string
        suf = suf or ''.join(random.choices(string.ascii_uppercase, k=3))
        # Crear empleado
        r = await client.post("/empleados/", headers=AUTH(token), json={
            "rfc": f"CFD202601{suf}", "curp": f"CFDI240101RFC{suf}AB",
            "nombre": "CFDI", "apellidos": "Test",
            "salario_diario": "500.00", "tipo_contrato": "base", "tipo_jornada": "diurna",
            "fecha_ingreso": "2020-01-15T00:00:00",
        })
        eid = r.json()["id"]
        # Crear periodo y calcular
        r = await client.post("/nomina/periodos", headers=AUTH(token), json={
            "nombre": "CFDI Test", "fecha_inicio": "2026-06-01T00:00:00",
            "fecha_fin": "2026-06-15T00:00:00", "tipo": "quincenal",
        })
        pid = r.json()["id"]
        r = await client.post(f"/nomina/periodos/{pid}/calcular", headers=AUTH(token))
        assert r.status_code == 200, r.text
        return r.json()["recibos"][0]["id"]

    async def test_registrar_csd(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/cfdi/csd", headers=AUTH(t), json={
            "alias": "CSD-PRUEBA",
            "rfc_emisor": "BAL980101ABC",
            "regimen_fiscal": "607",
        })
        assert r.status_code == 201, r.text
        assert r.json()["activo"] == True

    async def test_timbrar_recibo(self, client, test_env):
        t = test_env["admin_token"]
        rid = await self._setup_recibo(client, t)
        # Registrar CSD primero
        await client.post("/cfdi/csd", headers=AUTH(t), json={
            "alias": "CSD-TIMBRE", "rfc_emisor": "BAL980101ABC",
        })
        r = await client.post("/cfdi/timbrar", headers=AUTH(t), json={
            "recibo_id": rid,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["uuid"] is not None
        assert d["cfdi"]["estatus"] == "timbrado"
        assert "xml" in d["xml_preview"]

    async def test_timbrar_duplicado(self, client, test_env):
        t = test_env["admin_token"]
        rid = await self._setup_recibo(client, t, "DUP")
        await client.post("/cfdi/csd", headers=AUTH(t), json={
            "alias": "CSD-DUP", "rfc_emisor": "BAL980101ABC",
        })
        await client.post("/cfdi/timbrar", headers=AUTH(t), json={"recibo_id": rid})
        r = await client.post("/cfdi/timbrar", headers=AUTH(t), json={"recibo_id": rid})
        assert r.status_code == 409

    async def test_listar_cfdi(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.get("/cfdi/recibos", headers=AUTH(t))
        assert r.status_code == 200
