"""
IMSS Engine — Tablas de tasas y constantes 2026
Fuentes: LSS, DOF, IMSS (valores estimados actualizados)
"""
from decimal import Decimal

# UMA 2026 ($117.31/día — DOF 09-ene-2026, INEGI)
UMA_DIARIA = Decimal("117.31")
UMA_MENSUAL = UMA_DIARIA * 30
UMA_ANUAL = UMA_DIARIA * 365

# Tope SBC en UMAs (25 UMAs)
TOPE_SBC_UMAS = Decimal("25")
TOPE_SBC_DIARIO = UMA_DIARIA * TOPE_SBC_UMAS

# ─── FACTOR DE INTEGRACIÓN (LFT Art. 84-87) ───
# Factor = 1 + (días_aguinaldo / 365) + (prima_vacacional * días_vacaciones / 365)
# Días de vacaciones según años de servicio (Art. 76 LFT)
DIAS_VACACIONES_POR_ANIO = {
    1: 12, 2: 14, 3: 16, 4: 18, 5: 20,
    6: 22, 7: 24, 8: 26, 9: 28, 10: 30,
    11: 32, 12: 34, 13: 36, 14: 38, 15: 40,
}

# ─── PRIMA DE RIESGO DE TRABAJO (LSS Art. 72-76) ───
# Clase de riesgo → prima base (%) + prima mín/máx
RIESGO_CLASE = {
    1: {"descripcion": "Clase I - Riesgo mínimo", "prima_base": Decimal("0.5000"), "prima_min": Decimal("0.3474"), "prima_max": Decimal("0.6526")},
    2: {"descripcion": "Clase II - Riesgo bajo",   "prima_base": Decimal("1.0000"), "prima_min": Decimal("0.6938"), "prima_max": Decimal("1.3062")},
    3: {"descripcion": "Clase III - Riesgo medio",  "prima_base": Decimal("1.5000"), "prima_min": Decimal("1.0412"), "prima_max": Decimal("1.9588")},
    4: {"descripcion": "Clase IV - Riesgo alto",   "prima_base": Decimal("2.5000"), "prima_min": Decimal("1.7346"), "prima_max": Decimal("3.2654")},
    5: {"descripcion": "Clase V - Riesgo máximo",  "prima_base": Decimal("3.5000"), "prima_min": Decimal("2.4280"), "prima_max": Decimal("4.5720")},
}

# ─── CUOTAS OBRERO-PATRONALES (LSS 2026 - tasas en %) ───

# Enfermedades y Maternidad (LSS Art. 106)
# - Patronal: 20.40% del SBC sobre UMA (prestaciones en especie)
# - Patronal: 0.70% sobre excedente de 3 UMAs
# - Obrera: 0.40% sobre excedente de 3 UMAs
ENF_MAT = {
    "especie_patronal_pct": Decimal("20.40"),  # sobre SBC hasta 25 UMAs
    "dineros_patronal_base_pct": Decimal("0.70"),  # sobre excedente de 3 UMAs
    "dineros_obrera_pct": Decimal("0.40"),  # sobre excedente de 3 UMAs
    "tope_especie_umas": Decimal("25"),
    "base_exenta_umas": Decimal("3"),
}

# Invalidez y Vida (LSS Art. 120)
INVALIDEZ_VIDA = {
    "patronal_pct": Decimal("1.75"),
    "obrera_pct": Decimal("0.625"),
}

# Retiro, Cesantía en Edad Avanzada y Vejez (LSS Art. 168)
RCIV = {
    "retiro_patronal_pct": Decimal("2.00"),
    "ceav_patronal_pct": Decimal("3.15"),
    "ceav_obrera_pct": Decimal("1.125"),
}

# Guarderías y Prestaciones Sociales (LSS Art. 211)
GUARDERIAS = {
    "patronal_pct": Decimal("1.00"),
}

# Infonavit (LFI Art. 29)
INFONAVIT = {
    "patronal_pct": Decimal("5.00"),
}
