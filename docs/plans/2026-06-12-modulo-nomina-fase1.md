# Módulo de Nómina — Fase 1 | Catálogo + Ciclo Base

> **Para Hermes:** Usar subagent-driven-development, task por task.
> **Meta:** Tener empleados + periodos de nómina funcionales (backend + frontend + tests)

**Goal:** Construir el catálogo de empleados y el ciclo básico de nómina sobre el IMSS Engine existente

**Arquitectura:**
- Backend: FastAPI + SQLAlchemy async + SQLite (mismo patrón)
- Frontend: React + Vite + Tailwind (mismos componentes)
- IMSS Engine existente se reutiliza para cálculo de SBC/cuotas

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, React, Vite, Tailwind, Decimal (cálculos)

---

### Task 1: Modelo Empleado + DB migration

**Objective:** Crear modelo SQLAlchemy para empleados con campos fiscales/laborales

**Files:**
- Modify: `backend/app/models/__init__.py`
- Test: `backend/tests/test_models.py`

**Campos del modelo Empleado:**
```
- id, rfc (unique, index), curp, nombre, apellidos
- fecha_nacimiento, fecha_ingreso
- salario_diario (Decimal), salario_mensual (Decimal)
- tipo_contrato: base, confianza, sindicalizado, temporal
- tipo_jornada: diurna, nocturna, mixta, especial
- clase_riesgo: 1-5
- banco, cuenta_bancaria
- email, telefono
- activo (bool)
- created_at, updated_at
```

**Verificación:** Migración automática al arrancar, test de creación en DB

---

### Task 2: Schema + CRUD endpoints Empleado

**Objective:** API REST para empleados (crear, listar, obtener, actualizar, eliminar)

**Files:**
- Create: `backend/app/schemas/empleado.py`
- Create: `backend/app/routers/empleados.py`
- Modify: `backend/app/main.py` (registrar router)
- Test: `backend/tests/test_empleados_api.py`

**Endpoints:**
```
POST   /empleados/         → crear empleado
GET    /empleados/         → listar (con filtros: q, activo)
GET    /empleados/{id}     → obtener
PUT    /empleados/{id}     → actualizar
DELETE /empleados/{id}     → eliminar (soft)
```

---

### Task 3: Modelo Periodo + Ciclo de Nómina

**Objective:** Modelo y endpoints para periodos de nómina (semanal/quincenal/mensual)

**Files:**
- Modify: `backend/app/models/__init__.py` (añadir PeriodoNomina)
- Create: `backend/app/routers/nomina.py`
- Modify: `backend/app/main.py` (registrar router)
- Test: `backend/tests/test_nomina_api.py`

**Modelo PeriodoNomina:**
```
- id, empleado_id (FK), fecha_inicio, fecha_fin
- tipo_periodo: semanal, quincenal, mensual
- dias_trabajados, salario_diario, sbc
- percepciones_total, deducciones_total, neto
- estado: borrador, calculado, timbrado, pagado
- created_at, updated_at
```

---

### Task 4: Cálculo de Nómina (base)

**Objective:** Integrar IMSS Engine con el ciclo de nómina para calcular percepciones y deducciones

**Files:**
- Modify: `backend/app/routers/nomina.py`
- Create: `backend/app/nomina/calculadora.py`
- Test: `backend/tests/test_nomina_calculos.py`

**Funcionalidad:**
- Calcular SBC desde el empleado (reusa IMSS Engine)
- Calcular ISR (tabla mensual 2026)
- Calcular cuotas IMSS obrero (reusa IMSS Engine)
- Generar registro de periodo con desglose

---

### Task 5: Frontend — Lista de Empleados

**Objective:** Página de catálogo de empleados con tabla, búsqueda y CRUD modal

**Files:**
- Create: `frontend/src/Empleados.jsx`
- Modify: `frontend/src/App.jsx` (ruta + navbar)
- Modify: `frontend/src/api.js` (endpoints empleados)
- Modify: `frontend/vite.config.js` (proxy /empleados)

---

### Task 6: Frontend — Formulario de Empleado

**Objective:** Modal/formulario completo para crear/editar empleado con validación

**Files:**
- Create: `frontend/src/components/FormularioEmpleado.jsx`
- Modify: `frontend/src/Empleados.jsx` (modal integration)

---

### Task 7: Frontend — Ciclo de Nómina

**Objective:** Página para generar y visualizar periodos de nómina

**Files:**
- Create: `frontend/src/Nomina.jsx`
- Modify: `frontend/src/App.jsx` (ruta + navbar)
- Modify: `frontend/src/api.js` (endpoints nomina)
- Modify: `frontend/vite.config.js` (proxy /nomina)

---

### Task 8: Tests de Integración

**Objective:** Tests completos para empleados + nómina (backend)

**Files:**
- Test: `backend/tests/test_empleados_api.py` (completar)
- Test: `backend/tests/test_nomina_api.py` (completar)
- Test: `backend/tests/test_nomina_calculos.py` (completar)

---

## Ejecución

Cada task sigue el ciclo TDD:
1. Escribir test → falla
2. Implementar → pasa
3. Commit

El plan se ejecuta secuencialmente. Cada task es ~2-5 min.
