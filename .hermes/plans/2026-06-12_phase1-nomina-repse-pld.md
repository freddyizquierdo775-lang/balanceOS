# Balance OS — Plan Fase 1: Nómina, REPSE, PLD & Automatización

> **Para Hermes:** Ejecutar con `subagent-driven-development` tarea por tarea.

**Goal:** Expandir Balance OS de CRM a plataforma operativa — agregar motor de nómina, módulos REPSE y PLD, y automatización de notificaciones.

**Arquitectura:** Backend FastAPI monolítico (SQLite para MVP), frontend React+Vite+Tailwind. Cada módulo nuevo sigue el patrón probado de IMSS Engine: `router + engine + types + rates`.

**Priorización:** Backend primero (testeable via API sin UI visual), frontend después (cuando Freddy tenga acceso a su PC para validar).

---

## Estado Actual (Línea Base)

### ✅ Completado (Fase 0)
- **Auth**: JWT, 3 roles (admin/asesor/juridico), login, registro, /me
- **Clientes**: CRUD completo, búsqueda, RFC validado, stats
- **Documentos**: Subida/descarga/eliminación, filtro por tipo, 10MB
- **Alertas vencimiento**: FIEL/REPSE/PLD con criticidad 🟥🟧🟨
- **Gestión Usuarios**: Admin edita rol/activo
- **Exportar CSV**: Clientes a CSV
- **IMSS Engine**: SBC + 6 cuotas obrero-patronales, UMA $117.31 (2026 oficial)
- **Tests**: 50 tests (28 unitarios IMSS + 22 API) — todos pasan ✅

### ⏳ Pendiente de validación (requiere PC de Freddy)
- UI del IMSS Engine (`http://127.0.0.1:3000`)
- Validación contra SUA real
- CSS refinamiento / pixel-perfect

---

## Fase 1 — Plan de Implementación

### Fase 1A: Motor de Nómina (Backend + Tests)

#### Task 1: Modelo de datos — Nóminas y Empleados

**Files:**
- Modify: `backend/app/models/__init__.py`
- Add model `Empleado` (vinculado a Cliente como patrón)
- Add model `Nomina` (encabezado: periodo, tipo, empleado_id, totales)
- Add model `NominaDetalle` (percepciones, deducciones, neto)

Relaciones:
- `Cliente` → muchos `Empleado` (un patrón tiene muchos trabajadores)
- `Empleado` → muchas `Nomina`
- `Nomina` → muchos `NominaDetalle`

Campos Empleado: nss, curp, rfc, nombre, salario_diario, fecha_ingreso, riesgo_puesto, banco, clabe, email

#### Task 2: Schema Pydantic — Schemas de Nómina

**Files:**
- Modify: `backend/app/schemas/__init__.py`
- Add: `EmpleadoCreate`, `EmpleadoUpdate`, `EmpleadoResponse`
- Add: `NominaCreate`, `NominaResponse`, `NominaDetalleResponse`

#### Task 3: Router CRUD Empleados

**Files:**
- Create: `backend/app/routers/empleados.py`
- Incluir en: `backend/app/main.py`
- Endpoints: `GET/POST /empleados/`, `GET/PUT/DELETE /empleados/{id}`, `GET /empleados/?cliente_id=X`
- Tests: CRUD básico en `tests/test_api.py`

#### Task 4: Calcular Nómina Individual

**Files:**
- Create: `backend/app/nomina/__init__.py`
- Create: `backend/app/nomina/tipos.py`
- Función: `calcular_nomina(empleado, periodo, incidencias)`
- Percepciones: sueldo, prima dominical, horas extra, prima vacacional, aguinaldo proporcional
- Deducciones: ISR (tabla), IMSS (reutilizar engine), subsidio empleo, caja ahorro, pensión alimenticia, INFONAVIT crédito, FONACOT
- Préstamos: préstamo personal, descuento INFONAVIT

#### Task 5: Calcular ISR (Tabla 2026)

**Files:**
- Create: `backend/app/nomina/isr.py`
- Tablas ISR 2026 (LISR Art. 96): límite inferior, cuota fija, excedente, subsidio
- Función: `calcular_isr(salario_gravado, periodicidad, subsidio_empleo)`
- Periodicidades: diario, semanal, decenal, catorcenal, mensual, anual
- Tests: `tests/test_nomina.py` — ISR para varios rangos salariales

#### Task 6: Router Cálculo de Nómina

**Files:**
- Modify: `backend/app/routers/empleados.py` o crear `backend/app/routers/nomina.py`
- Endpoints: `POST /nomina/calcular` (calcula una nómina sin guardar), `POST /nomina/generar` (calcula y guarda)
- Respuesta: desglose percepciones/deducciones/neto
- Tests: verificar cálculo contra valores conocidos

#### Task 7: Configuración por Cliente (Empresa Patrón)

**Files:**
- Modify: `backend/app/schemas/__init__.py` — agregar campos a ClienteCreate/Update
- Campos patrón: regimen_contratacion, periodicidad_pago, salario_base, riesgo_clase, prestaciones (aguinaldo, prima vacacional %, fondo ahorro, vales),
  repse_registro, pld_obligado

#### Task 8: Nómina Masiva (Batch)

**Files:**
- Add endpoint: `POST /nomina/batch`
- Toma array de empleados + incidencias
- Calcula todas individualmente, suma totales
- Útil para generar la nómina quincenal de toda la empresa

---

### Fase 1B: Módulo REPSE

#### Task 9: REPSE Engine

**Files:**
- Create: `backend/app/repse/__init__.py`, `backend/app/repse/clasificaciones.py`
- Clasificaciones REPSE (96 actividades), niveles de riesgo
- Validación REPSECONT03, REPSECONT05, REPSECONT07
- Calculadora de: movilidad de personal, especialidad, diferencias salariales
- Vencimiento automático (3 años desde registro)

#### Task 10: Router REPSE

**Files:**
- Create: `backend/app/routers/repse.py`
- Endpoints: Validar especialidad, calcular movilidad, verificar vencimiento
- Vincular a Cliente (especialidad_repse, nivel_riesgo, registro_repse, fecha_registro)

---

### Fase 1C: Módulo PLD

#### Task 11: PLD Engine

**Files:**
- Create: `backend/app/pld/__init__.py`, `backend/app/pld/obligaciones.py`
- Catálogo de obligaciones: SOC, INV, PRE, ACT, BILL, etc.
- Umbrales de aviso (USD $1,000, $5,000, $10,000)
- Calculadora de: umbrales al SAT, prevención de operaciones vulnerables
- Alertas automáticas por monto de operación

#### Task 12: Router PLD

**Files:**
- Create: `backend/app/routers/pld.py`
- Vincular a Cliente: declaraciones, registro de operaciones, vencimiento declaraciones

---

### Fase 1D: Automatización y Alertas

#### Task 13: Sistema de Notificaciones por Email

**Files:**
- Create: `backend/app/notifications/__init__.py`, `backend/app/notifications/email.py`
- Integración SendGrid o SMTP (reutilizar credenciales de Orion)
- Plantillas: vencimiento FIEL, REPSE, PLD; recordatorio nómina
- Cron: revisión diaria de vencimientos → enviar email automático
- Tests con mocking de SMTP

#### Task 14: Endpoint para Configurar Alertas por Usuario

**Files:**
- Modify: `backend/app/schemas/__init__.py`
- Add modelo/config: qué alertas recibe, a qué email, frecuencia

---

### Fase 1E: Frontend (cuando Freddy tenga PC)

#### Task 15: UI Empleados
- Componente `Empleados.jsx` — CRUD con tabla, formulario, búsqueda
- Vincular a Cliente (selector de empresa)

#### Task 16: UI Nómina
- Componente `Nomina.jsx` — seleccionar empresa/empleados, llenar incidencias
- Resultado desglosado (percepciones, deducciones, neto)
- Vista histórica de nóminas generadas

#### Task 17: UI REPSE
- Dashboard REPSE por cliente
- Validación de especialidad, vencimiento

#### Task 18: UI PLD
- Registro de operaciones
- Dashboard de alertas (montos acumulados, próximas declaraciones)

---

## Orden de Ejecución Recomendado

```
Semana 1 (Backend - sin PC)         Semana 2 (Backend - sin PC)
├── Task 1: Modelos Empleado/Nomina  ├── Task 7: Config patrón por Cliente
├── Task 2: Schemas                  ├── Task 9: REPSE Engine
├── Task 3: CRUD Empleados          ├── Task 10: Router REPSE
├── Task 4: Calcular Nómina         ├── Task 11: PLD Engine
├── Task 5: ISR Engine              ├── Task 12: Router PLD
├── Task 6: Router Nómina           ├── Task 13: Email Notifications
├── Task 8: Batch Nómina            └── Task 14: Alertas Config
```

## Dependencias entre Tareas

```
Task 1 ──→ Task 2 ──→ Task 3 ──→ Task 4 ──→ Task 6
                                        ↑
                                      Task 5
                                        
Task 7 → dependiente de Cliente (ya existe)
Task 8 → dependiente de Task 4+6
Task 9,10 → independientes (paralelo con T1-T8)
Task 11,12 → independientes (paralelo)
Task 13 → dependiente de módulo alertas (ya existe)
```

## Verificación

Cada tarea incluye:
- Prueba unitaria del motor (sin DB)
- Test de integración del endpoint (con DB)
- `pytest tests/ -v` — 0 failures

## Riesgos

1. **Tablas ISR 2026**: pueden cambiar en DOF — verificar antes de implementar
2. **REPSE clasificaciones**: catálogo de 96 especialidades, requiere fuente actualizada
3. **PLD umbrales**: cambian periódicamente — parametrizar en rates.py
4. **Validación SUA**: sin PC de Freddy no podemos cotejar nómina contra simulación real
5. **Frontend bloqueado**: no se puede avanzar UI sin acceso a PC para pruebas visuales
