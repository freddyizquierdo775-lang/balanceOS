"""
Balance OS — Seed de Datos de Prueba

Carga RFCs conocidos en listas EFOS (69-B) + impuestos estatales + estímulos fiscales
para demostración y pruebas.

Ejecutar: python scripts/seed_data.py
"""
import asyncio, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime
from app.database import engine, async_session, Base
from app.models import ListaEfos, CuentaContable, TipoCuenta, NaturalezaCuenta
from sqlalchemy import select, func

# ─── RFCs conocidos en listas EFOS (simulados para pruebas) ───────
EFOS_LIST = [
    {"rfc": "AAA010101AAA", "tipo_lista": "69-B", "fecha_publicacion": "2026-01-15"},
    {"rfc": "BBB020202BBB", "tipo_lista": "69-B", "fecha_publicacion": "2026-02-20"},
    {"rfc": "CCC030303CCC", "tipo_lista": "69", "fecha_publicacion": "2025-11-10"},
    {"rfc": "DDD040404DDD", "tipo_lista": "definitivos", "fecha_publicacion": "2026-03-01"},
    {"rfc": "EEE050505EEE", "tipo_lista": "69-B", "fecha_publicacion": "2026-04-05"},
    {"rfc": "FFF060606FFF", "tipo_lista": "sentencias", "fecha_publicacion": "2025-09-22"},
    {"rfc": "GGG070707GGG", "tipo_lista": "69-B", "fecha_publicacion": "2026-05-10"},
]

# ─── Catálogo de cuentas contables ampliado con impuestos ─────────
CATALOGO_IMPUESTOS = [
    # Impuestos Federales
    {"codigo": "118-01", "nombre": "IVA Acreditable", "tipo": "activo", "naturaleza": "deudora", "nivel": 2},
    {"codigo": "118-02", "nombre": "IVA por Acreditar", "tipo": "activo", "naturaleza": "deudora", "nivel": 2},
    {"codigo": "213-01", "nombre": "IVA Trasladado", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    {"codigo": "213-02", "nombre": "IVA por Pagar", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    {"codigo": "213-03", "nombre": "ISR por Pagar", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    {"codigo": "213-04", "nombre": "ISR Retenido por Pagar", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    {"codigo": "213-05", "nombre": "IEPS por Pagar", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    {"codigo": "213-06", "nombre": "IDE por Pagar", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    # Impuestos Estatales
    {"codigo": "213-11", "nombre": "ISN por Pagar (Impuesto Sobre Nóminas)", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    {"codigo": "213-12", "nombre": "Impuesto al Hospedaje por Pagar", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    {"codigo": "213-13", "nombre": "Impuesto a la Venta Final por Pagar", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    {"codigo": "213-14", "nombre": "Tenencia por Pagar", "tipo": "pasivo", "naturaleza": "acreedora", "nivel": 2},
    # Estimulos Fiscales / Cuentas de activo
    {"codigo": "118-11", "nombre": "IVA Acreditable Especial (Construcción)", "tipo": "activo", "naturaleza": "deudora", "nivel": 2},
    {"codigo": "118-12", "nombre": "Estímulo Fiscal Combustibles", "tipo": "activo", "naturaleza": "deudora", "nivel": 2},
    {"codigo": "118-13", "nombre": "Deducción Inmediata Inversiones", "tipo": "activo", "naturaleza": "deudora", "nivel": 2},
    {"codigo": "610-01", "nombre": "Gastos por ISN", "tipo": "gastos", "naturaleza": "deudora", "nivel": 2},
    {"codigo": "610-02", "nombre": "Gastos por Impuesto al Hospedaje", "tipo": "gastos", "naturaleza": "deudora", "nivel": 2},
    {"codigo": "610-03", "nombre": "Gastos por Tenencia", "tipo": "gastos", "naturaleza": "deudora", "nivel": 2},
    # Ingresos por estímulos
    {"codigo": "410-01", "nombre": "Ingresos por Estímulos Fiscales", "tipo": "ingresos", "naturaleza": "acreedora", "nivel": 2},
]


async def seed():
    async with async_session() as db:
        # 1. Seed EFOS
        result = await db.execute(select(func.count()).select_from(ListaEfos))
        count = result.scalar()
        if count == 0:
            print("📥 Sembrando listas EFOS...")
            for item in EFOS_LIST:
                db.add(ListaEfos(
                    rfc=item["rfc"],
                    tipo_lista=item["tipo_lista"],
                    fecha_publicacion=datetime.strptime(item["fecha_publicacion"], "%Y-%m-%d"),
                ))
            await db.commit()
            print(f"   ✅ {len(EFOS_LIST)} RFCs agregados a listas EFOS")
        else:
            print(f"   ⏭️  Listas EFOS ya tienen {count} registros")

        # 2. Seed Catálogo de Cuentas (solo las de impuestos si no existen)
        result2 = await db.execute(select(func.count()).select_from(CuentaContable))
        existentes = result2.scalar()
        if existentes < 5:
            print("📥 Sembrando catálogo de cuentas de impuestos...")
            for c in CATALOGO_IMPUESTOS:
                db.add(CuentaContable(
                    codigo=c["codigo"],
                    nombre=c["nombre"],
                    tipo=TipoCuenta(c["tipo"]),
                    nivel=c["nivel"],
                    naturaleza=NaturalezaCuenta(c["naturaleza"]),
                    acepta_movimientos=True,
                ))
            await db.commit()
            print(f"   ✅ {len(CATALOGO_IMPUESTOS)} cuentas de impuestos agregadas")
        else:
            print(f"   ⏭️  Catálogo ya tiene {existentes} registros (saltando seed)")

    print("\n✅ Seed completado")

if __name__ == "__main__":
    asyncio.run(seed())
