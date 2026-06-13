"""Tests de API de Empleados — CRUD completo."""

import pytest
from decimal import Decimal

pytestmark = pytest.mark.asyncio

def AUTH(t):
    return {"Authorization": f"Bearer {t}"}


class TestEmpleadosAPI:
    RFC = "EMP000101AAA"
    CURP = "PERE000101HDFAAA01"

    async def test_crear(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": self.RFC, "curp": self.CURP,
            "nombre": "Juan", "apellidos": "Pérez García",
            "salario_diario": "500.00",
            "tipo_contrato": "base", "tipo_jornada": "diurna",
            "email": "juan@example.com",
        })
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["rfc"] == self.RFC
        assert d["salario_diario"] == "500.00"
        assert d["activo"] is True

    async def test_rfc_duplicado(self, client, test_env):
        t = test_env["admin_token"]
        r1 = await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "DUP000101AAA", "curp": "DUPA000101HDFAAA01",
            "nombre": "A", "apellidos": "B",
            "salario_diario": "300.00", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        assert r1.status_code == 201, r1.text
        r2 = await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "DUP000101AAA", "curp": "DUPB000102HDFAAA02",
            "nombre": "B", "apellidos": "C",
            "salario_diario": "300.00", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        assert r2.status_code == 409, r2.text

    async def test_listar(self, client, test_env):
        t = test_env["admin_token"]
        await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "LST000101AAA", "curp": "LIST000101HDFAAA01",
            "nombre": "List", "apellidos": "Uno",
            "salario_diario": "400", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "LST000202BBB", "curp": "LIST000202HDFBBB02",
            "nombre": "List", "apellidos": "Dos",
            "salario_diario": "400", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        r = await client.get("/empleados/", headers=AUTH(t))
        assert r.status_code == 200
        assert len(r.json()) >= 2

    async def test_obtener_por_id(self, client, test_env):
        t = test_env["admin_token"]
        c = await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "GET000101AAA", "curp": "GETT000101HDFAAA01",
            "nombre": "Get", "apellidos": "Me",
            "salario_diario": "500", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        assert c.status_code == 201, c.text
        eid = c.json()["id"]
        r = await client.get(f"/empleados/{eid}", headers=AUTH(t))
        assert r.status_code == 200
        assert r.json()["rfc"] == "GET000101AAA"

    async def test_actualizar(self, client, test_env):
        t = test_env["admin_token"]
        c = await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "UPD000101AAA", "curp": "UPDT000101HDFAAA01",
            "nombre": "Original", "apellidos": "Name",
            "salario_diario": "500", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        assert c.status_code == 201, c.text
        eid = c.json()["id"]
        r = await client.put(f"/empleados/{eid}", headers=AUTH(t), json={
            "salario_diario": "600.00",
            "telefono": "9991112233",
        })
        assert r.status_code == 200
        assert r.json()["salario_diario"] == "600.00"
        assert r.json()["telefono"] == "9991112233"

    async def test_eliminar_soft(self, client, test_env):
        t = test_env["admin_token"]
        c = await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "DEL000101AAA", "curp": "DELT000101HDFAAA01",
            "nombre": "Delete", "apellidos": "Me",
            "salario_diario": "500", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        assert c.status_code == 201, c.text
        eid = c.json()["id"]
        r = await client.delete(f"/empleados/{eid}", headers=AUTH(t))
        assert r.status_code == 204
        r = await client.get(f"/empleados/{eid}", headers=AUTH(t))
        assert r.json()["activo"] is False
        assert r.json()["estatus"] == "baja"

    async def test_validacion_rfc(self, client, test_env):
        t = test_env["admin_token"]
        r = await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "INVALIDO", "curp": "INVA000101HDFAAA01",
            "nombre": "Bad", "apellidos": "RFC",
            "salario_diario": "500", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        assert r.status_code == 422

    async def test_401_sin_token(self, client):
        r = await client.post("/empleados/", json={
            "rfc": "SIN000101AAA", "curp": "SINT000101HDFAAA01",
            "nombre": "No", "apellidos": "Auth",
            "salario_diario": "500", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        assert r.status_code in (401, 403)

    async def test_buscar_por_q(self, client, test_env):
        t = test_env["admin_token"]
        await client.post("/empleados/", headers=AUTH(t), json={
            "rfc": "SRH000101AAA", "curp": "SEAR000101HDFAAA01",
            "nombre": "Search", "apellidos": "Target",
            "salario_diario": "350", "tipo_contrato": "base", "tipo_jornada": "diurna",
        })
        r = await client.get("/empleados/?q=Search", headers=AUTH(t))
        assert r.status_code == 200
        assert len(r.json()) >= 1
