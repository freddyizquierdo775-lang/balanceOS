"""
Balance OS — Verificador de Vencimientos
========================================
Lee la DB SQLite directamente y reporta vencimientos próximos.
Ejecutado por cron los lunes a las 8am.
"""
import sqlite3
from datetime import datetime, timedelta
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "app.db")


def conectar():
    if not os.path.exists(DB_PATH):
        print(f"❌ DB no encontrada en {DB_PATH}")
        return None
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def reportar():
    conn = conectar()
    if not conn:
        return

    now = datetime.utcnow()
    en_30d = now + timedelta(days=30)
    en_7d = now + timedelta(days=7)
    en_90d = now + timedelta(days=90)

    print("📋 REPORTE SEMANAL DE VENCIMIENTOS")
    print(f"📅 {now.strftime('%d/%m/%Y %H:%M')} UTC")
    print("=" * 50)

    # ── FIEL (CLIENTES) ──
    cursor = conn.execute("""
        SELECT id, rfc, razon_social, fiel_vencimiento
        FROM clientes
        WHERE fiel_vencimiento IS NOT NULL
          AND fiel_vencimiento <= ?
        ORDER BY fiel_vencimiento
    """, (en_90d.isoformat(),))
    filas = cursor.fetchall()
    if filas:
        print(f"\n🔴 FIEL por vencer ({len(filas)}):")
        for f in filas:
            dias = (datetime.fromisoformat(f["fiel_vencimiento"]) - now).days
            emoji = "🚨" if dias <= 7 else "⚠️" if dias <= 30 else "🔶"
            print(f"  {emoji} {f['razon_social']} ({f['rfc']}) — vence {f['fiel_vencimiento'][:10]} ({dias} días)")

    # ── REPSE ──
    cursor = conn.execute("""
        SELECT r.id, r.numero_registro, r.fecha_vencimiento, r.estatus,
               c.razon_social
        FROM repse_registros r
        JOIN clientes c ON r.cliente_id = c.id
        WHERE r.estatus = 'activo'
          AND r.fecha_vencimiento <= ?
        ORDER BY r.fecha_vencimiento
    """, (en_90d.isoformat(),))
    filas = cursor.fetchall()
    if filas:
        print(f"\n📋 REPSE por vencer ({len(filas)}):")
        for f in filas:
            dias = (datetime.fromisoformat(f["fecha_vencimiento"]) - now).days
            emoji = "🚨" if dias <= 7 else "⚠️" if dias <= 30 else "🔶"
            print(f"  {emoji} {f['razon_social']} — {f['numero_registro']} — vence {f['fecha_vencimiento'][:10]} ({dias} días)")

    # ── AVISOS REPSE PENDIENTES ──
    cursor = conn.execute("""
        SELECT a.id, a.periodo, a.registro_id, r.numero_registro
        FROM repse_avisos a
        JOIN repse_registros r ON a.registro_id = r.id
        WHERE a.presentado = 0
        ORDER BY a.periodo
    """)
    filas = cursor.fetchall()
    if filas:
        print(f"\n⏳ Avisos REPSE pendientes ({len(filas)}):")
        for f in filas:
            print(f"  📝 {f['numero_registro']} — {f['periodo']}")

    # ── PLD ──
    cursor = conn.execute("""
        SELECT c.id, c.razon_social, c.rfc, c.tiene_pld,
               (SELECT nivel_riesgo FROM pld_cuestionarios
                WHERE cliente_id = c.id
                ORDER BY created_at DESC LIMIT 1) as riesgo
        FROM clientes c
        WHERE c.tiene_pld = 1
    """)
    filas = cursor.fetchall()
    if filas:
        print(f"\n🛡️ Clientes con PLD ({len(filas)}):")
        for f in filas:
            riesgo = f["riesgo"] or "sin evaluar"
            print(f"  {'🔴' if riesgo == 'alto' else '🟡' if riesgo == 'medio' else '🟢'} {f['razon_social']} — riesgo: {riesgo}")

    # Resumen
    cursor = conn.execute("SELECT COUNT(*) as n FROM clientes WHERE fiel_vencimiento <= ?", (en_30d.isoformat(),))
    fiel_30 = cursor.fetchone()["n"]
    cursor = conn.execute("SELECT COUNT(*) as n FROM repse_registros WHERE estatus='activo' AND fecha_vencimiento <= ?", (en_30d.isoformat(),))
    repse_30 = cursor.fetchone()["n"]
    cursor = conn.execute("SELECT COUNT(*) as n FROM repse_avisos WHERE presentado=0")
    avisos_pend = cursor.fetchone()["n"]

    print("\n" + "=" * 50)
    print(f"📊 RESUMEN — Próximos 30 días:")
    print(f"   FIEL por vencer: {fiel_30}")
    print(f"   REPSE por vencer: {repse_30}")
    print(f"   Avisos REPSE pendientes: {avisos_pend}")

    if fiel_30 == 0 and repse_30 == 0 and avisos_pend == 0:
        print("\n✅ Todo al corriente. No hay vencimientos próximos.")

    conn.close()


if __name__ == "__main__":
    reportar()
