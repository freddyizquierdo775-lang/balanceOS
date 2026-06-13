"""Tests de API de PLD — Cuestionario Riesgo, Documentos, Resumen."""

import pytest
from decimal import Decimal as D

pytestmark = pytest.mark.asyncio

def AUTH(t):
    return {"Authorization": f"Bearer {t}"}


class TestPLDCuestionarioAPI:
    async def _setup_cliente(self, client, token, suf=""):
        import random, string
        suf = suf or ''.join(random.choices(string.ascii_uppercase, k=3))
        r = await client.post("/clientes/", headers=AUTH(token), json={
            "rfc": f"PLD202601{suf}",
            "razon_social": f"Cliente PLD Test {suf}",
            "regimen_fiscal": "601",
            "tipo_persona": "fisica",
        })
        assert r.status_code == 201, r.text
        return r.json()["id"]

    async def test_crear_cuestionario(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t)
        r = await client.post("/pld/cuestionarios", headers=AUTH(t), json={
            "cliente_id": cid,
            "ingresos_anuales": "5000000",
            "volumen_operaciones": "2000000",
            "transacciones_internacionales": False,
            "tipo_operacion": "nacional",
            "expuesto_politicamente": False,
            "sector_riesgo_alto": False,
            "origen_fondos_documentado": True,
            "antigüedad_relacion": 24,
        })
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["cliente_id"] == cid
        assert d["nivel_riesgo"] in ("bajo", "medio", "alto")
        assert 0 <= float(d["puntaje"]) <= 100
        assert "recomendacion" in d

    async def test_cuestionario_alto_riesgo(self, client, test_env):
        """Cliente con todos los factores de alto riesgo."""
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t, "ALT")
        r = await client.post("/pld/cuestionarios", headers=AUTH(t), json={
            "cliente_id": cid,
            "ingresos_anuales": "100000000",
            "volumen_operaciones": "50000000",
            "transacciones_internacionales": True,
            "tipo_operacion": "ambas",
            "expuesto_politicamente": True,
            "sector_riesgo_alto": True,
            "origen_fondos_documentado": False,
            "antigüedad_relacion": 1,
        })
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["nivel_riesgo"] == "alto"
        assert float(d["puntaje"]) >= 60

    async def test_cuestionario_bajo_riesgo(self, client, test_env):
        """Cliente con mínimos factores de riesgo."""
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t, "BAJ")
        r = await client.post("/pld/cuestionarios", headers=AUTH(t), json={
            "cliente_id": cid,
            "ingresos_anuales": "500000",
            "volumen_operaciones": "100000",
            "tipo_operacion": "nacional",
            "expuesto_politicamente": False,
            "sector_riesgo_alto": False,
            "origen_fondos_documentado": True,
            "antigüedad_relacion": 36,
        })
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["nivel_riesgo"] == "bajo"
        assert float(d["puntaje"]) < 30

    async def test_listar_cuestionarios(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t, "LST")
        await client.post("/pld/cuestionarios", headers=AUTH(t), json={
            "cliente_id": cid, "ingresos_anuales": "1000000",
            "volumen_operaciones": "0",
        })
        await client.post("/pld/cuestionarios", headers=AUTH(t), json={
            "cliente_id": cid, "ingresos_anuales": "2000000",
            "volumen_operaciones": "0",
        })
        r = await client.get(f"/pld/cuestionarios/{cid}", headers=AUTH(t))
        assert r.status_code == 200
        assert len(r.json()) >= 2

    async def test_ultimo_cuestionario(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup_cliente(client, t, "ULT")
        r = await client.get(f"/pld/cuestionarios/ultimo/{cid}", headers=AUTH(t))
        assert r.status_code == 404  # no hay cuestionarios

        await client.post("/pld/cuestionarios", headers=AUTH(t), json={
            "cliente_id": cid, "ingresos_anuales": "1000000",
            "volumen_operaciones": "0",
        })
        r = await client.get(f"/pld/cuestionarios/ultimo/{cid}", headers=AUTH(t))
        assert r.status_code == 200
        assert float(r.json()["puntaje"]) >= 0


class TestPLDDocumentoAPI:
    async def _setup(self, client, token, suf=""):
        import random, string
        suf = suf or ''.join(random.choices(string.ascii_uppercase, k=3))
        r = await client.post("/clientes/", headers=AUTH(token), json={
            "rfc": f"DOC202601{suf}",
            "razon_social": f"Cliente Doc {suf}",
            "regimen_fiscal": "607",
            "tipo_persona": "moral",
        })
        return r.json()["id"]

    async def test_crear_documento(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup(client, t)
        r = await client.post("/pld/documentos", headers=AUTH(t), json={
            "cliente_id": cid,
            "tipo": "identificacion",
        })
        assert r.status_code == 201, r.text
        assert r.json()["verificado"] == False

    async def test_verificar_documento(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup(client, t, "VRF")
        c = await client.post("/pld/documentos", headers=AUTH(t), json={
            "cliente_id": cid,
            "tipo": "acta_constitutiva",
        })
        did = c.json()["id"]
        r = await client.put(f"/pld/documentos/{did}/verificar", headers=AUTH(t))
        assert r.status_code == 200
        assert r.json()["verificado"] == True

    async def test_resumen_cliente(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._setup(client, t, "RSM")
        # Sin cuestionarios ni docs
        r = await client.get(f"/pld/resumen/{cid}", headers=AUTH(t))
        assert r.status_code == 200
        d = r.json()
        assert d["ultimo_cuestionario"] is None
        assert d["riesgo"] is None

        # Con cuestionario
        await client.post("/pld/cuestionarios", headers=AUTH(t), json={
            "cliente_id": cid, "ingresos_anuales": "500000",
            "volumen_operaciones": "0",
        })
        r = await client.get(f"/pld/resumen/{cid}", headers=AUTH(t))
        assert r.status_code == 200
        d = r.json()
        assert d["riesgo"] is not None
