"""
Seed de datos demo para Balance OS — Multi-tenancy v2.

Idempotente: solo ejecuta si la BD está vacía (sin usuarios).
Soporta SQLite (desarrollo local) y PostgreSQL (Railway producción).
"""
import asyncio
import sys
from datetime import datetime

from app.database import async_session, init_db, engine
from app.models import (
    Usuario, Cliente, Empleado, CuentaContable, Despacho,
    RegimenFiscal, TipoPersona, EstatusCliente, RolUsuario,
    NaturalezaCuenta, TipoCuenta,
)
from app.models import (
    PeriodoNomina, Recibo, CfdiRecibo, CsdCertificado,
    Finiquito, RepseRegistro, RepsePersonal, RepseAviso,
    PldCuestionario, PldDocumento, Documento, Evento,
)
from app.models.facturacion import (
    CfdiIngreso, CfdiIngresoConcepto, CfdiIngresoImpuesto,
    CfdiComplementoPago, CfdiPagoDetalle,
)
from app.models.impuestos import (
    Declaracion, DeclaracionConcepto, ConfiguracionDiot,
    EstimuloFiscal, ClienteEstimulo,
)
from app.models.tesoreria import (
    CuentaBancaria, MovimientoBancario, ConciliacionBancaria,
    ListaEfos, AlertaEfos,
)
from app.models.crm import Seguimiento, Nota
from app.models.imss_seguimiento import ImssAlta, ImssBaja, ImssTramite
import bcrypt as _bcrypt


def _hash(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


# Modelos tenant a los que se asignará despacho_id
TENANT_MODELS = [
    Cliente, Documento, Empleado, PeriodoNomina, Recibo,
    CfdiRecibo, CsdCertificado, Finiquito,
    RepseRegistro, RepsePersonal, RepseAviso,
    PldCuestionario, PldDocumento,
    CfdiIngreso, CfdiIngresoConcepto, CfdiIngresoImpuesto,
    CfdiComplementoPago, CfdiPagoDetalle,
    Declaracion, DeclaracionConcepto, ConfiguracionDiot,
    EstimuloFiscal, ClienteEstimulo,
    CuentaBancaria, MovimientoBancario, ConciliacionBancaria,
    ListaEfos, AlertaEfos,
    Seguimiento, Nota,
    ImssAlta, ImssBaja, ImssTramite,
    Evento,
]


async def migrar_despacho_id(db, despacho_id: int):
    """Asigna despacho_id a todos los registros existentes en modelos tenant."""
    from sqlalchemy import update
    total = 0
    for model in TENANT_MODELS:
        stmt = (
            update(model)
            .where(model.despacho_id == None)  # noqa: E711
            .values(despacho_id=despacho_id)
        )
        result = await db.execute(stmt)
        total += result.rowcount
    if total > 0:
        print(f"  ✓ {total} registros migrados al despacho default")


async def seed() -> bool:
    """Ejecuta seed de datos demo. Retorna True si se insertaron datos."""
    await init_db()

    async with async_session() as db:
        # Verificar si ya hay usuarios (seed ya ejecutado)
        from sqlalchemy import select, func

        result = await db.execute(select(func.count()).select_from(Usuario))
        count_usuarios = result.scalar()
        if count_usuarios > 0:
            print("✅ Datos ya existen.")

            # ── Migración multi-tenancy: asignar despacho_id si es necesario ──
            result = await db.execute(select(Despacho).limit(1))
            despacho = result.scalar_one_or_none()
            if not despacho:
                print("  → Creando despacho default para datos existentes...")
                despacho = Despacho(nombre="default", plan="enterprise")
                db.add(despacho)
                await db.flush()
            else:
                print("  → Despacho default ya existe.")

            # Asignar despacho_id a usuarios sin despacho
            from sqlalchemy import update as sql_update
            users_updated = await db.execute(
                sql_update(Usuario)
                .where(Usuario.despacho_id == None)  # noqa: E711
                .values(despacho_id=despacho.id)
            )
            if users_updated.rowcount > 0:
                print(f"  ✓ {users_updated.rowcount} usuarios asignados al despacho default")

            # Migrar todos los datos tenant existentes
            await migrar_despacho_id(db, despacho.id)

            await db.commit()
            print("  ✓ Migración multi-tenancy completada.")
            return False

        # ─── Crear despacho default ──────────────────
        despacho = Despacho(nombre="default", plan="enterprise")
        db.add(despacho)
        await db.flush()
        print("  ✓ Despacho default creado")

        # ─── 1. Admin ─────────────────────────────────────
        admin = Usuario(
            nombre="Admin Balance OS",
            email="admin@balanceos.com",
            password_hash=_hash("Admin123!"),
            rol=RolUsuario.ADMIN,
            activo=1,
            despacho_id=despacho.id,
        )
        db.add(admin)
        await db.flush()
        print("  ✓ Admin creado: admin@balanceos.com / Admin123!")

        # ─── 2. Clientes demo ────────────────────────────
        clientes_data = [
            {
                "rfc": "SOS230501ABC", "razon_social": "Corporativo Sosa S.A. de C.V.",
                "regimen": RegimenFiscal.MORAL_GENERAL, "tipo": TipoPersona.MORAL,
                "email": "contacto@corpsosa.com", "telefono": "5551000101",
            },
            {
                "rfc": "PELJ850312XYZ", "razon_social": "Juan Pérez López",
                "regimen": RegimenFiscal.PF_ACTIVIDAD_EMPRESARIAL, "tipo": TipoPersona.FISICA,
                "email": "juan.perez@email.com", "telefono": "5552000202",
            },
            {
                "rfc": "DNO120405DEF", "razon_social": "Distribuidora del Norte S.A.",
                "regimen": RegimenFiscal.MORAL_GENERAL, "tipo": TipoPersona.MORAL,
                "email": "info@distnorte.com", "telefono": "5553000303",
            },
            {
                "rfc": "HERM780920GHI", "razon_social": "María Hernández Ruiz",
                "regimen": RegimenFiscal.PF_SERVICIOS_PROFESIONALES, "tipo": TipoPersona.FISICA,
                "email": "maria.h@email.com", "telefono": "5554000404",
            },
            {
                "rfc": "TSM990101JKL", "razon_social": "TechSolutions México S.A.P.I.",
                "regimen": RegimenFiscal.MORAL_GENERAL, "tipo": TipoPersona.MORAL,
                "email": "hola@techsolutions.mx", "telefono": "5555000505",
            },
        ]
        clientes_creados = []
        for cd in clientes_data:
            cliente = Cliente(
                rfc=cd["rfc"],
                razon_social=cd["razon_social"],
                regimen_fiscal=cd["regimen"],
                tipo_persona=cd["tipo"],
                email=cd["email"],
                telefono=cd["telefono"],
                estatus=EstatusCliente.ACTIVO,
                asesor_id=admin.id,
                despacho_id=despacho.id,
            )
            db.add(cliente)
            clientes_creados.append(cliente)
        await db.flush()
        print(f"  ✓ {len(clientes_creados)} clientes creados")

        # ─── 3. Empleados demo (2 por cliente) ──────────
        empleados_data = [
            # Cliente 0: Corporativo Sosa
            {"nombre": "Carlos", "apellidos": "Mendoza Ruiz", "rfc": "MERC800115H01", "curp": "MERC800115HDFNNR09",
             "salario_diario": 500.00, "fecha_ingreso": "2024-01-15", "cliente_idx": 0},
            {"nombre": "Ana Laura", "apellidos": "Sánchez García", "rfc": "SAGA900320M01", "curp": "SAGA900320MDFNRN02",
             "salario_diario": 650.00, "fecha_ingreso": "2024-03-01", "cliente_idx": 0},
            # Cliente 1: Juan Pérez
            {"nombre": "Roberto", "apellidos": "Díaz Gómez", "rfc": "DIGR750610H02", "curp": "DIGR750610HDFZMB05",
             "salario_diario": 420.00, "fecha_ingreso": "2023-06-10", "cliente_idx": 1},
            {"nombre": "Patricia", "apellidos": "López Vega", "rfc": "LOVP820505M03", "curp": "LOVP820505MDFPGT08",
             "salario_diario": 380.00, "fecha_ingreso": "2024-02-20", "cliente_idx": 1},
            # Cliente 2: Distribuidora del Norte
            {"nombre": "Miguel", "apellidos": "Torres Alba", "rfc": "TOAM700912H04", "curp": "TOAM700912HDFRLG01",
             "salario_diario": 720.00, "fecha_ingreso": "2022-11-05", "cliente_idx": 2},
            {"nombre": "Laura", "apellidos": "Flores Díaz", "rfc": "FODL880228M05", "curp": "FODL880228MDFLRR03",
             "salario_diario": 550.00, "fecha_ingreso": "2023-08-15", "cliente_idx": 2},
            # Cliente 3: María Hernández
            {"nombre": "Gabriel", "apellidos": "Reyes Soto", "rfc": "RESG950714H06", "curp": "RESG950714HDFYTB04",
             "salario_diario": 480.00, "fecha_ingreso": "2024-06-01", "cliente_idx": 3},
            {"nombre": "Carmen", "apellidos": "Vargas Luna", "rfc": "VALC820120M07", "curp": "VALC820120MDFRNR06",
             "salario_diario": 590.00, "fecha_ingreso": "2023-12-10", "cliente_idx": 3},
            # Cliente 4: TechSolutions
            {"nombre": "Alejandro", "apellidos": "Núñez Cruz", "rfc": "NUCA910505H08", "curp": "NUCA910505HDFRZL07",
             "salario_diario": 850.00, "fecha_ingreso": "2022-03-20", "cliente_idx": 4},
            {"nombre": "Fernanda", "apellidos": "Ortiz Ríos", "rfc": "OIRF860815M09", "curp": "OIRF860815MDFRTR09",
             "salario_diario": 670.00, "fecha_ingreso": "2024-01-05", "cliente_idx": 4},
        ]
        for ed in empleados_data:
            emp = Empleado(
                nombre=ed["nombre"],
                apellidos=ed["apellidos"],
                rfc=ed["rfc"],
                curp=ed["curp"],
                salario_diario=ed["salario_diario"],
                fecha_ingreso=datetime.strptime(ed["fecha_ingreso"], "%Y-%m-%d"),
                despacho_id=despacho.id,
            )
            db.add(emp)
        await db.flush()
        print(f"  ✓ {len(empleados_data)} empleados creados")

        # ─── 4. Cuentas contables básicas ───────────────
        cuentas = [
            {"codigo": "1000", "nombre": "Activo", "tipo": TipoCuenta.ACTIVO, "nivel": 1, "naturaleza": NaturalezaCuenta.DEUDORA, "acepta_movimientos": False},
            {"codigo": "1100", "nombre": "Activo Circulante", "tipo": TipoCuenta.ACTIVO, "nivel": 2, "naturaleza": NaturalezaCuenta.DEUDORA, "acepta_movimientos": False},
            {"codigo": "1110", "nombre": "Caja", "tipo": TipoCuenta.ACTIVO, "nivel": 3, "naturaleza": NaturalezaCuenta.DEUDORA, "acepta_movimientos": True},
            {"codigo": "1120", "nombre": "Bancos", "tipo": TipoCuenta.ACTIVO, "nivel": 3, "naturaleza": NaturalezaCuenta.DEUDORA, "acepta_movimientos": True},
            {"codigo": "2000", "nombre": "Pasivo", "tipo": TipoCuenta.PASIVO, "nivel": 1, "naturaleza": NaturalezaCuenta.ACREEDORA, "acepta_movimientos": False},
            {"codigo": "2100", "nombre": "Pasivo a Corto Plazo", "tipo": TipoCuenta.PASIVO, "nivel": 2, "naturaleza": NaturalezaCuenta.ACREEDORA, "acepta_movimientos": False},
            {"codigo": "2110", "nombre": "Proveedores", "tipo": TipoCuenta.PASIVO, "nivel": 3, "naturaleza": NaturalezaCuenta.ACREEDORA, "acepta_movimientos": True},
            {"codigo": "2120", "nombre": "Acreedores Diversos", "tipo": TipoCuenta.PASIVO, "nivel": 3, "naturaleza": NaturalezaCuenta.ACREEDORA, "acepta_movimientos": True},
            {"codigo": "3000", "nombre": "Capital Contable", "tipo": TipoCuenta.CAPITAL, "nivel": 1, "naturaleza": NaturalezaCuenta.ACREEDORA, "acepta_movimientos": False},
            {"codigo": "3100", "nombre": "Capital Social", "tipo": TipoCuenta.CAPITAL, "nivel": 2, "naturaleza": NaturalezaCuenta.ACREEDORA, "acepta_movimientos": True},
            {"codigo": "4000", "nombre": "Ingresos", "tipo": TipoCuenta.INGRESOS, "nivel": 1, "naturaleza": NaturalezaCuenta.ACREEDORA, "acepta_movimientos": False},
            {"codigo": "4100", "nombre": "Ingresos por Servicios", "tipo": TipoCuenta.INGRESOS, "nivel": 2, "naturaleza": NaturalezaCuenta.ACREEDORA, "acepta_movimientos": True},
            {"codigo": "5000", "nombre": "Gastos", "tipo": TipoCuenta.GASTOS, "nivel": 1, "naturaleza": NaturalezaCuenta.DEUDORA, "acepta_movimientos": False},
            {"codigo": "5100", "nombre": "Gastos de Administración", "tipo": TipoCuenta.GASTOS, "nivel": 2, "naturaleza": NaturalezaCuenta.DEUDORA, "acepta_movimientos": True},
            {"codigo": "5200", "nombre": "Gastos de Venta", "tipo": TipoCuenta.GASTOS, "nivel": 2, "naturaleza": NaturalezaCuenta.DEUDORA, "acepta_movimientos": True},
        ]
        for c in cuentas:
            db.add(CuentaContable(**c, despacho_id=despacho.id))
        await db.flush()
        print(f"  ✓ {len(cuentas)} cuentas contables creadas")

        await db.commit()
        print(f"✅ Seed completado: 1 despacho, 1 admin, {len(clientes_creados)} clientes, "
              f"{len(empleados_data)} empleados, {len(cuentas)} cuentas contables")
        print(f"   Login: admin@balanceos.com / Admin123!")
        return True


if __name__ == "__main__":
    asyncio.run(seed())
