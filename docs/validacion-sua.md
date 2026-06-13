# Validación contra SUA real

## Propósito

Validar los cálculos del motor de **Balance OS** (IMSS + Nómina) contra el **Sistema Único de Autodeterminación (SUA)** del IMSS. SUA es la herramienta oficial del IMSS para determinar cuotas obrero-patronales.

## Cuándo validar

- ⚡ **Inmediatamente** si ya tienes acceso a una computadora con SUA instalado
- **Cada año** cuando se publiquen nuevas UMA, tablas ISR o tasas LSS
- **Después de cualquier cambio** en `app/imss/rates.py` o `app/nomina/calculo.py`
- **Antes del primer cálculo real** con empleados de un cliente

## Casos de prueba manuales

### 1. SBC y Factor de Integración

| # | Salario diario | Días aguinaldo | Prima vac. | Años servicio | SBC esperado (SUA) |
|---|---------------|----------------|------------|--------------|-------------------|
| 1 | $500.00 | 15 | 25% | 1 | — |
| 2 | $500.00 | 15 | 25% | 5 | — |
| 3 | $500.00 | 15 | 25% | 15 | — |
| 4 | $2,932.75 | 15 | 25% | 1 | (tope 25 UMAs) |
| 5 | $257.00 | 15 | 25% | 1 | (salario mínimo) |

**Procedimiento:**
1. En SUA: alta de trabajador con esos datos
2. En Balance OS: `POST /imss/calcular` con los mismos parámetros
3. Comparar: factor_integracion, sbc_diario, sbc_mensual

### 2. Cuotas Obrero-Patronales

| # | SBC | Clase riesgo | Descripción |
|---|-----|-------------|-------------|
| 1 | $524.66 | I | Caso base $500/día, 1 año |
| 2 | $1,200.00 | III | Salario medio |
| 3 | $2,932.75 | V | Tope 25 UMAs, riesgo máximo |

**Procedimiento:**
1. En SUA: consultar detalle de cuotas del trabajador
2. En Balance OS: `POST /imss/calcular`
3. Comparar cada concepto: RT, EyM, IV, RCV, Guarderías, Infonavit
4. Comparar total_obrero, total_patronal y gran_total

### 3. Nómina completa (ISR + IMSS)

| # | Salario/día | Días | Clase riesgo | Fecha ingreso | Descripción |
|---|------------|------|-------------|--------------|-------------|
| 1 | $500.00 | 15 | I | Hace 1 año | Quincena normal |
| 2 | $257.00 | 15 | I | Hace 5 años | Salario mínimo + subsidio |
| 3 | $2,000.00 | 30 | IV | Hace 10 años | Mensual, sueldo alto |
| 4 | $800.00 | 7 | II | Hace 3 años | Semanal |

**Procedimiento:**
1. En SUA o nómina real: generar recibo del periodo
2. En Balance OS: crear periodo y `POST /nomina/periodos/{id}/calcular`
3. Comparar: percepciones (sueldo, aguinaldo proporcional, prima vacacional)
4. Comparar: deducciones (IMSS obrero, ISR con subsidio)
5. Comparar: neto

## Tolerancia aceptada

| Concepto | Tolerancia | Razón |
|----------|-----------|-------|
| SBC | ±$0.01 | Redondeo a 2 decimales |
| Factor integración | ±0.000001 | Redondeo a 6 decimales |
| Cuotas IMSS | ±$0.01 | Redondeo independiente por concepto |
| ISR | ±$0.01 | Redondeo de cuota fija y excedente |
| Subsidio al empleo | ±$0.01 | Aplica igual que ISR |

## Si hay discrepancias

1. **SBC diferente** → Revisar `calcular_factor_integracion()` y `Días vacaciones tabla (Art. 76)`
2. **Cuotas IMSS diferentes** → Revisar `app/imss/rates.py` (tasas porcentuales, UMA, base exenta)
3. **ISR diferente** → Revisar `TARIFA_ISR_MENSUAL` y `SUBSIDIO_AL_EMPLEO` en `app/nomina/calculo.py` (actualizar con valores DOF más recientes)
4. **Percepciones diferentes** → Revisar `calcular_aguinaldo_proporcional()` y `calcular_prima_vacacional_proporcional()`

## Script de validación rápida

```bash
# Backend tests
cd backend
SECRET_KEY=*** python -m pytest tests/ -v --tb=short

# Si todo pasa, probar casos manuales contra SUA
```

Para validar un caso manual específico desde terminal:

```bash
# Calcular IMSS para un caso
curl -X POST http://127.0.0.1:8000/imss/calcular \
  -H "Content-Type: application/json" \
  -d '{"salario_diario": 500, "clase_riesgo": 1}'
```

## Notas importantes

- **SUA es la referencia oficial**, no SICOSS ni calculadoras web
- Las tablas ISR se actualizan anualmente (DOF enero/febrero)
- La UMA se actualiza anualmente (DOF enero, INEGI)
- Las cuotas LSS pueden cambiar por reformas (congreso)
- El subsidio al empleo es transitorio (LISR Art. 8vo transitorio) — puede eliminarse
- Después de validar con SUA, **guardar los resultados como referencia** en el vault

## Referencias

- [DOF - UMA 2026](https://www.dof.gob.mx/)
- [LISR Art. 96 - Tarifa ISR](https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf)
- [LSS Arts. 72-76 - RT, 106 - EyM, 120 - IV, 168 - RCV, 211 - Guarderías](https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf)
- [LFT Art. 76 - Vacaciones](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf)
