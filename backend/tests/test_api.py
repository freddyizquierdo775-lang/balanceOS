"""Tests de integración de API — auth, clientes, documentos, IMSS, vencimientos."""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta

from app.imss.types import DatosTrabajador
from app.imss import calcular_cuotas

pytestmark = pytest.mark.asyncio

AUTH = lambda t: {"Authorization": f"Bearer {t}"}

# RFC válido: ^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$  → 12 o 13 chars


class TestAuth:
    async def test_registro(self, client):
        r = await client.post("/auth/registro", json={
            "nombre": "Nuevo", "email": "nuevo@test.com", "password": "test123", "rol": "asesor",
        })
        assert r.status_code == 200 and r.json()["email"] == "nuevo@test.com"

    async def test_registro_duplicado(self, client):
        await client.post("/auth/registro", json={"nombre": "U1", "email": "dup@test.com", "password": "test123"})
        r = await client.post("/auth/registro", json={"nombre": "U2", "email": "dup@test.com", "password": "test123"})
        assert r.status_code == 400

    async def test_login(self, client, test_env):
        r = await client.post("/auth/login", json={"email": "admin@test.com", "password": "test123"})
        assert r.status_code == 200 and "access_token" in r.json()

    async def test_login_fallido(self, client):
        r = await client.post("/auth/login", json={"email": "no@existe.com", "password": "x"})
        assert r.status_code == 401

    async def test_me(self, client, test_env):
        r = await client.get("/auth/me", headers=AUTH(test_env["admin_token"]))
        assert r.status_code == 200 and r.json()["email"] == "admin@test.com"

    async def test_health(self, client):
        r = await client.get("/health")
        assert r.status_code == 200 and r.json()["status"] == "ok"


class TestClientes:
    async def test_crear(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/clientes/", headers=AUTH(t), json={
            "rfc": "ABC010101AAA", "razon_social": "Cliente Test SA",
            "regimen_fiscal": "601", "tipo_persona": "moral",
        })
        assert r.status_code == 201, r.text
        assert r.json()["rfc"] == "ABC010101AAA"

    async def test_rfc_duplicado(self, client, test_env):
        t = test_env["admin_token"]
        await client.post("/clientes/", headers=AUTH(t), json={"rfc": "XYZ010101AAA", "razon_social": "A", "regimen_fiscal": "601", "tipo_persona": "moral"})
        r = await client.post("/clientes/", headers=AUTH(t), json={"rfc": "XYZ010101AAA", "razon_social": "B", "regimen_fiscal": "601", "tipo_persona": "moral"})
        assert r.status_code == 409

    async def test_listar(self, client, test_env):
        t = test_env["admin_token"]
        await client.post("/clientes/", headers=AUTH(t), json={"rfc": "AAA010101AAA", "razon_social": "Uno", "regimen_fiscal": "601", "tipo_persona": "moral"})
        await client.post("/clientes/", headers=AUTH(t), json={"rfc": "BBB010101BBB", "razon_social": "Dos", "regimen_fiscal": "602", "tipo_persona": "fisica"})
        r = await client.get("/clientes/", headers=AUTH(t))
        assert r.status_code == 200 and len(r.json()) >= 2

    async def test_obtener_por_id(self, client, test_env):
        t = test_env["admin_token"]
        c = await client.post("/clientes/", headers=AUTH(t), json={"rfc": "CCC010101CCC", "razon_social": "Get Me", "regimen_fiscal": "601", "tipo_persona": "moral"})
        assert c.status_code == 201, c.text
        r = await client.get(f"/clientes/{c.json()['id']}", headers=AUTH(t))
        assert r.status_code == 200 and r.json()["rfc"] == "CCC010101CCC"

    async def test_actualizar(self, client, test_env):
        t = test_env["admin_token"]
        c = await client.post("/clientes/", headers=AUTH(t), json={"rfc": "DDD010101DDD", "razon_social": "Original", "regimen_fiscal": "601", "tipo_persona": "moral"})
        assert c.status_code == 201, c.text
        r = await client.put(f"/clientes/{c.json()['id']}", headers=AUTH(t), json={"razon_social": "Nuevo SA", "email": "nuevo@email.com"})
        assert r.status_code == 200 and r.json()["razon_social"] == "Nuevo SA"

    async def test_eliminar(self, client, test_env):
        t = test_env["admin_token"]
        c = await client.post("/clientes/", headers=AUTH(t), json={"rfc": "EEE010101EEE", "razon_social": "Delete", "regimen_fiscal": "601", "tipo_persona": "moral"})
        assert c.status_code == 201, c.text
        r = await client.delete(f"/clientes/{c.json()['id']}", headers=AUTH(t))
        assert r.status_code == 204
        r = await client.get(f"/clientes/{c.json()['id']}", headers=AUTH(t))
        assert r.status_code == 404

    async def test_401_sin_token(self, client):
        r = await client.post("/clientes/", json={"rfc": "FFF010101FFF", "razon_social": "No Auth", "regimen_fiscal": "601", "tipo_persona": "moral"})
        assert r.status_code in (401, 403)

    async def test_buscar_por_q(self, client, test_env):
        t = test_env["admin_token"]
        await client.post("/clientes/", headers=AUTH(t), json={"rfc": "GGG010101GGG", "razon_social": "Busca esto SA", "regimen_fiscal": "601", "tipo_persona": "moral"})
        r = await client.get("/clientes/?q=Busca", headers=AUTH(t))
        assert r.status_code == 200 and len(r.json()) >= 1

    async def test_stats(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.get("/clientes/stats", headers=AUTH(t))
        assert r.status_code == 200 and "total" in r.json()


class TestPermisos:
    async def test_asesor_solo_suyos(self, client, test_env):
        ta, te = test_env["admin_token"], test_env["asesor_token"]
        assert (await client.post("/clientes/", headers=AUTH(ta), json={"rfc": "HHH010101HHH", "razon_social": "Admin", "regimen_fiscal": "601", "tipo_persona": "moral"})).status_code == 201
        assert (await client.post("/clientes/", headers=AUTH(te), json={"rfc": "III010101III", "razon_social": "Asesor", "regimen_fiscal": "601", "tipo_persona": "moral"})).status_code == 201
        r = await client.get("/clientes/", headers=AUTH(te))
        rfcs = {c["rfc"] for c in r.json()}
        assert "III010101III" in rfcs and "HHH010101HHH" not in rfcs


class TestDocumentos:
    async def _c(self, client, t, suf=""):
        r = await client.post("/clientes/", headers=AUTH(t), json={"rfc": f"JJJ010101{suf}", "razon_social": "Doc", "regimen_fiscal": "601", "tipo_persona": "moral"})
        assert r.status_code == 201, r.text
        return r.json()["id"]

    async def test_subir(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._c(client, t, "SUB")
        r = await client.post(f"/documentos/{cid}", headers=AUTH(t), data={"tipo": "constancia", "notas": "p"}, files={"archivo": ("t.pdf", b"%PDF", "application/pdf")})
        assert r.status_code == 201

    async def test_listar(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._c(client, t, "LST")
        await client.post(f"/documentos/{cid}", headers=AUTH(t), data={"tipo": "cfdi"}, files={"archivo": ("f.xml", b"<c/>", "application/xml")})
        r = await client.get(f"/documentos/{cid}", headers=AUTH(t))
        assert r.status_code == 200 and len(r.json()) == 1

    async def test_eliminar(self, client, test_env):
        t = test_env["admin_token"]
        cid = await self._c(client, t, "DEL")
        d = await client.post(f"/documentos/{cid}", headers=AUTH(t), data={"tipo": "otro"}, files={"archivo": ("d.txt", b"d", "text/plain")})
        r = await client.delete(f"/documentos/{d.json()['id']}", headers=AUTH(t))
        assert r.status_code == 204


class TestIMSSAPI:
    async def test_calcular(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/imss/calcular", headers=AUTH(t), json={"salario_diario": 500, "clase_riesgo": 1})
        assert r.status_code == 200
        assert len(r.json()["cuotas"]) == 6

    async def test_factor(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/imss/factor-integracion", headers=AUTH(t), json={"salario_diario": 500})
        assert r.status_code == 200 and r.json()["factor_integracion"] > 1.04

    async def test_api_vs_unit(self, client, test_env):
        t = test_env["admin_token"]
        api = (await client.post("/imss/calcular", headers=AUTH(t), json={"salario_diario": 500, "clase_riesgo": 1})).json()
        unit = calcular_cuotas(DatosTrabajador(salario_diario=Decimal("500"), clase_riesgo=1))
        assert Decimal(api["sbc_diario"]) == unit.sbc_diario
        assert Decimal(api["gran_total"]) == unit.gran_total

    async def test_401_sin_token(self, client):
        r = await client.post("/imss/calcular", json={"salario_diario": 500})
        assert r.status_code in (401, 403)

    async def test_input_invalido(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/imss/calcular", headers=AUTH(t), json={"salario_diario": -100})
        assert r.status_code == 422


class TestVencimientos:
    async def test_fiel_proximo(self, client, test_env):
        t = test_env["admin_token"]
        futuro = (datetime.utcnow() + timedelta(days=5)).isoformat()
        await client.post("/clientes/", headers=AUTH(t), json={
            "rfc": "KKK010101KKK", "razon_social": "Vence",
            "regimen_fiscal": "601", "tipo_persona": "moral",
            "fiel_vencimiento": futuro,
        })
        r = await client.get("/clientes/vencimientos?dias=90", headers=AUTH(t))
        assert r.status_code == 200
        assert len(r.json()) >= 1
        assert r.json()[0]["alertas"][0]["criticidad"] == "critico"

    async def test_sin_vencimiento(self, client, test_env):
        t = test_env["admin_token"]
        await client.post("/clientes/", headers=AUTH(t), json={"rfc": "LLL010101LLL", "razon_social": "NoVence", "regimen_fiscal": "601", "tipo_persona": "moral"})
        for item in (await client.get("/clientes/vencimientos", headers=AUTH(t))).json():
            assert item["rfc"] != "LLL010101LLL"
