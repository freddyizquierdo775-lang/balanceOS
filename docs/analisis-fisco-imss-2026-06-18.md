# Análisis Estructural: Módulo Fisco / IMSS — Diagnóstico y Metodología ERP

> **Contexto:** Revisión profunda del módulo IMSS de Balance OS. Se evaluó el 100% del código existente (backend, frontend, modelos, routers, tests, arquitectura multi-tenancy).
> **Fecha:** 18 Jun 2026

---

## 1. DIAGNÓSTICO DEL ESTADO ACTUAL

### ✅ Lo que YA funciona (bien)

| Componente | Estado | Observaciones |
|------------|--------|---------------|
| **Calculadora IMSS** | ✅ Completo | SBC, factor integración, 6 cuotas obrero-patronales, proyección mensual. Con tests unitarios. |
| **Altas IMSS** (CRUD) | ✅ Funcional | Crear, listar, actualizar estatus. Pendiente: upload de acuse. |
| **Bajas IMSS** (CRUD) | ✅ Funcional | Con 4 motivos (renuncia, despido, fin_contrato, otro). |
| **Trámites IMSS** (CRUD) | ✅ Funcional | 5 tipos incluyendo riesgo_trabajo. |
| **Resumen KPIs** | ✅ Funcional | Conteo de altas/bajas/tramites pendientes. |
| **Lista de clases de riesgo** | ✅ Funcional | 5 clases con primas (estático). |
| **Frontend IMSS** | ✅ Funcional | 6 tabs: Calculadora, Altas, Bajas, Trámites, Riesgos, Resumen. |
| **Tests unitarios IMSS** | ✅ 50+ tests | Factor integración, SBC, cuotas completas. |
| **Multi-tenancy** | ✅ Implementado | `despacho_id` en modelos. |
| **Motor de eventos** | ✅ Implementado | Cada alta/baja/tramite emite evento auditable. |

### ❌ Lo que NO existe ni está modelado

| Componente | Estado | Impacto |
|------------|--------|---------|
| **Modelo `RiesgoTrabajo`** | ❌ No existe | No hay entidad dedicada para riesgos de trabajo con seguimiento de calificación |
| **Upload de documentos (riesgos)** | ❌ No existe | No se pueden subir documentos escaneados (iniciales ni calificados) |
| **Flujo de calificación** | ❌ No existe | No hay ciclo de vida: pendiente → en_calificacion → calificado |
| **Estado "pendiente_alta" en empleado** | ❌ No existe | Empleado se crea activo, no hay bandera de "pendiente de alta IMSS" |
| **Automatización SUA/IMSS** | ❌ No existe | No hay integración con sistemas del IMSS (SUA, IDSE) |
| **Seguimiento de vencimientos** | ❌ No existe | No hay alertas por riesgos no calificados en tiempo |

---

## 2. FLUJO OPERATIVO REQUERIDO (lo que necesitas)

### 2.1 Riesgos de Trabajo

```
┌─────────────────────────────────────────────────────────┐
│                 CICLO DE VIDA DE RIESGO                    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  1. REPORTE INICIAL                                        │
│     ┌──────────────────┐    ┌──────────────────┐          │
│     │ Subir documento  │───→│ Estatus:         │          │
│     │ escaneado inicial│    │ PENDIENTE        │          │
│     └──────────────────┘    └────────┬─────────┘          │
│                                      │                    │
│  2. EN CALIFICACIÓN                   │                    │
│                                      ▼                    │
│     ┌──────────────────┐    ┌──────────────────┐          │
│     │ IMSS califica    │───→│ Estatus:         │          │
│     │ el riesgo        │    │ EN_CALIFICACION  │          │
│     └──────────────────┘    └────────┬─────────┘          │
│                                      │                    │
│  3. CALIFICADO                        │                    │
│                                      ▼                    │
│     ┌──────────────────┐    ┌──────────────────┐          │
│     │ Subir documento  │───→│ Estatus:         │          │
│     │ calificado       │    │ CALIFICADO       │          │
│     └──────────────────┘    └──────────────────┘          │
│                                                           │
│  ⚠️ SEGUIMIENTO:                                          │
│     - Alerta si riesgo >30 días sin calificar             │
│     - Historial completo de cambios                       │
│     - Vinculado al empleado y cliente                     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 2.2 Alta de Trabajadores vía IMSS

```
┌─────────────────────────────────────────────────────────┐
│              FLUJO DE ALTA DE TRABAJADOR                  │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  1. REGISTRO DEL EMPLEADO                                  │
│     ┌──────────────────┐                                  │
│     │ Empleado creado  │──→ estatus_alta: PENDIENTE       │
│     │ en el sistema    │    (aparece en dashboard)        │
│     └────────┬─────────┘                                  │
│              │                                            │
│  2. SOLICITUD DE ALTA                                     │
│              ▼                                            │
│     ┌──────────────────┐                                  │
│     │ Generar solicitud│──→ Se crea ImssAlta              │
│     │ alta IMSS        │    con datos del empleado        │
│     └────────┬─────────┘                                  │
│              │                                            │
│  3. PROCESAR ALTA                                         │
│              ▼                                            │
│     ┌──────────────────┐    ┌──────────────────┐          │
│     │ Alta vía SUA/   │───→│ Se sube acuse   │          │
│     │ portal IMSS     │    │ (documento)      │          │
│     └──────────────────┘    └────────┬─────────┘          │
│                                      │                    │
│  4. CONFIRMACIÓN                      │                    │
│                                      ▼                    │
│     ┌──────────────────┐                                  │
│     │ estatus_alta:    │──→ Empleado ahora activo         │
│     │ COMPLETADO       │    en IMSS                        │
│     └──────────────────┘                                  │
│                                                           │
│  ⚠️ CADA EMPLEADO SIN ALTA = FOCO ROJO EN DASHBOARD      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 3. COMPLEJIDAD DEL ERP — RAZONAMIENTO ESTRUCTURAL

### 3.1 La verdadera complejidad no es técnica, es fiscal/laboral

Balance OS **no es un CRM genérico**. Es un sistema de **gestión de cumplimiento fiscal-laboral** donde:

| Si falla... | Consecuencia real para el contador |
|-------------|-----------------------------------|
| Un riesgo de trabajo no se califica a tiempo | Multa IMSS + recargos |
| Un alta IMSS se pierde | Trabajador sin seguridad social → contingencia |
| Una nómina tiene error de SBC | Devolución de timbres + multa SAT |
| Un aviso REPSE no se presenta | Suspensión del registro + multa STPS |
| Un PLD vence | Sanción administrativa SAT |

**Cada módulo es una obligación legal**, no una feature opcional. Eso cambia:
- El diseño: require **estados auditables** (no solo CRUD)
- El testing: requiere **validación de reglas de negocio** (no solo HTTP codes)
- El UI: requiere **alertas proactivas** (no solo tablas)

### 3.2 Descomposición por capas

```
NEGOCIO (Contadores/Despachos)
│
├── Gestión de Cartera      ← Razón de ser del ERP
│   ├── Clientes (patronales)
│   ├── Empleados (trabajadores)
│   ├── Periodos fiscales
│   └── Vencimientos (alertas)
│
├── Obligaciones IMSS       ← Riesgo legal si falla
│   ├── Cálculo de cuotas (SBC)
│   ├── Altas y bajas
│   ├── Riesgos de trabajo
│   └── Determinación de primas
│
├── Obligaciones Fiscales    ← Riesgo SAT
│   ├── CFDI de nómina
│   ├── ISR / Subsidio
│   ├── Declaraciones
│   └── Contabilidad electrónica
│
├── Obligaciones STPS        ← Riesgo REPSE
│   ├── Registro REPSE
│   ├── Avisos trimestrales
│   └── Personal especializado
│
└── Obligaciones PLD/SAT     ← Riesgo administrativo
    ├── Cuestionarios de riesgo
    ├── Documentación de soporte
    └── Alertas de vencimiento
```

### 3.3 Patrón arquitectónico que emerge

Cada módulo en Balance OS sigue **el mismo patrón de ciclo de vida**:

```
┌──────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│ INICIAL  │───→│ PENDIENTE│───→│ EN_PROCESO│───→│COMPLETADO│
└──────────┘    └─────────┘    └──────────┘    └──────────┘
                      │               │
                      ▼               ▼
                  ┌──────────┐   ┌──────────┐
                  │RECHAZADO │   │CANCELADO │
                  └──────────┘   └──────────┘
```

Este patrón se repite en: Altas IMSS, Bajas IMSS, Trámites, Riesgos, REPSE, Avisos trimestrales, PLD, Finiquitos, CFDI, Documentos...

**Implicación:** Puedes abstraer un **motor de ciclos de vida** genérico y reutilizarlo. No reinventar la rueda por módulo.

---

## 4. METODOLOGÍA PARA QUE EL ERP CUMPLA SU OBJETIVO

### 4.1 Principios rectores

1. **Cada módulo = un ciclo de vida auditable**
   - No CRUD plano. Cada entidad tiene estados, transiciones válidas, reglas por estado.
   - Ej: No puedes "calificar" un riesgo sin subir el documento calificado.

2. **Cada módulo = alertas proactivas**
   - Si algo está pendiente más de X días → alarma.
   - El contador no tiene que "recordar" hacer las cosas.
   - Las alertas deben llegar al dashboard, email y (eventualmente) WhatsApp.

3. **La cartera del despacho se gestiona desde el Dashboard, no desde tablas individuales**
   - Un contador no quiere ir a Clientes → IMSS → Altas → buscar. Quiere un panel que le diga:
     * "Tienes 8 trabajadores sin alta IMSS"
     * "3 riesgos de trabajo sin calificar (>30 días)"
     * "Próximos vencimientos: 5 FIEL, 2 REPSE"

4. **Documentos = evidencia legal, no adjuntos bonitos**
   - Cada documento (acuse, dictamen, formato) debe tener: tipo, subido_por, fecha, hash.
   - Los documentos se vinculan a su entidad (riesgo, alta, trámite).

5. **Multi-tenancy por despacho = aislamiento total**
   - Un despacho no ve los datos de otro despacho.
   - El admin del despacho puede ver TODO lo de sus clientes.

### 4.2 Metodología de construcción

```
FASE 0 — AUDITORÍA (estamos aquí)
├── Revisar qué existe (✅ hecho)
├── Identificar gaps (✅ hecho)
└── Priorizar con valor de mercado (siguiente paso)

FASE 1 — CORE DE CUMPLIMIENTO (MVP Fisco)
├── 1a. Modelo RiesgoTrabajo + seguimiento con documentos
├── 1b. Flag "pendiente_alta" en Empleado
├── 1c. Dashboard de pendientes IMSS
└── 1d. Alertas automáticas por tiempo de inactividad

FASE 2 — AUTOMATIZACIÓN
├── 2a. Upload de documentos (acuses, dictámenes)
├── 2b. Vinculación automática empleado ↔ alta IMSS
├── 2c. Explorar integración SUA/IDSE para altas directas
└── 2d. Reportes exportables (PDF/CSV por cliente)

FASE 3 — INTELIGENCIA
├── 3a. Calendario predictivo de vencimientos
├── 3b. Sugerencias de regularización
├── 3c. Dashboard ejecutivo multi-despacho
└── 3d. API pública para integración con terceros
```

### 4.3 Regla de negocio: el Dashboard manda

El módulo Fisco debe tener un **Dashboard de Cumplimiento** que conteste estas preguntas:

| Pregunta | Métrica | Alerta si... |
|----------|---------|-------------|
| ¿Cuántos trabajadores sin alta IMSS? | `empleados WHERE estatus_alta = pendiente` | > 0 |
| ¿Cuántos riesgos de trabajo sin calificar? | `riesgos WHERE estatus != calificado AND creado > 30d` | > 0 |
| ¿Cuántos trámites IMSS activos? | `tramites WHERE estatus IN (pendiente, en_proceso)` | > 5 |
| ¿Próximos vencimientos de clientes? | `clientes WHERE vencimiento < 30d` | Sí hay |
| ¿Altas solicitadas la semana pasada? | `altas WHERE created_at > 7d` | 0 = anormal |

---

## 5. PLAN DE ACCIÓN INMEDIATO (Propuesta)

### Lo que hay que construir para completar el módulo Fisco/IMSS

| # | Tarea | Esfuerzo | Dependencia |
|---|-------|----------|-------------|
| 1 | **Modelo `RiesgoTrabajo`** con estatus (pendiente, en_calificacion, calificado, rechazado) + documento inicial + documento calificado + seguimiento | 1 día | — |
| 2 | **Flag `pendiente_alta` en Empleado** + actualizar ImssAlta para que automáticamente lo marque | 0.5 día | #1 |
| 3 | **Router riesgos-trabajo completo** — CRUD + upload de documentos + cambio de estatus | 1 día | #1 |
| 4 | **Dashboard IMSS/Fisco** — resumen visual de pendientes con alertas | 1.5 días | #1, #2, #3 |
| 5 | **Frontend RiesgosTrabajo** — tab con lista, filtros, upload de docs, timeline | 1.5 días | #3 |
| 6 | **Actualizar frontend Altas** — mostrar empleado con estatus_alta | 0.5 día | #2 |
| 7 | **Alertas automáticas** — cron que revise riesgos no calificados y altas pendientes | 1 día | #4 |
| 8 | **Tests** — modelo, API, frontend | 1 día | #1-#7 |

**Total estimado: ~8 días de trabajo estructurado.**

---

## ¿Quieres que proceda con la implementación?

Mi recomendación es empezar por **Fase 1** en este orden:

1. 🔨 **Modelo `RiesgoTrabajo`** (backbone del flujo)
2. 🔨 **Upload de documentos** (reutilizando el módulo `documentos` existente)
3. 🔨 **Flag `pendiente_alta` + vinculación**
4. 🔨 **Dashboard de cumplimiento**

¿Aprieto el acelerador?
