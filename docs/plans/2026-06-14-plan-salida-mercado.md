# Balance OS — Plan de Salida al Mercado

> **Para Freddy:** Roadmap objetivo para convertir el prototipo en producto comercial.
> **Target:** Contadores jóvenes (25-40 años), nativos digitales, despachos contables, maquiladoras de nómina.
> **Propuesta de valor:** Motor que centraliza, automatiza y organiza toda la operación contable y fiscal en un solo lugar.

**Goal:** Lanzar Balance OS como producto SaaS comercial (MVP) en 3 fases, ~12 semanas.

**Arquitectura objetivo:**
- Backend: FastAPI + PostgreSQL multi-tenant + PAC real (Finkok)
- Frontend: React SPA + PWA offline-capable
- Infra: Railway (prod) + Cloudflare (dominio + CDN)
- Pagos: Stripe (suscripciones mensuales/anuales)

**Tech Stack:** FastAPI, SQLAlchemy async, PostgreSQL, React 18, Vite, Tailwind v4, Stripe API, Finkok API, SendGrid/Resend SMTP, WeasyPrint (PDFs)

---

## 📊 Diagnóstico de partida

| Indicador | Valor actual |
|---|---|
| Módulos backend | 20 routers, 130+ endpoints |
| Motores reales | IMSS ✅, Nómina ✅, Finiquitos ✅, Contabilidad ✅ |
| Páginas frontend | 23 páginas completas |
| Líneas de código | ~20,000 (Python + JSX/CSS) |
| Producción | Railway (SQLite, sin auth funcional) |
| Nivel de madurez | Prototipo avanzado (TRL 4/9) |

**Brechas críticas detectadas:** PostgreSQL, multi-tenancy, PAC real, suscripciones, email, dashboard real, onboarding, PDFs, permisos granulares.

---

## 🎯 FASE 0 — Cimientos de Producción (Semanas 1-2)

> **Objetivo:** Convertir el prototipo en una aplicación lista para recibir usuarios reales.

### 0.1 — Migración a PostgreSQL

**Archivos:**
- Modificar: `backend/app/database.py`
- Modificar: `backend/app/config.py`
- Modificar: `backend/requirements.txt` (agregar `asyncpg`, `psycopg2-binary`)
- Modificar: `backend/railway.json` (agregar PostgreSQL service)
- Crear: `backend/alembic/` (migraciones)
- Crear: `backend/app/models/tenant.py`

**Tareas:**
1. Crear servicio PostgreSQL en Railway (gratis: 1GB RAM, 5GB storage)
2. Instalar `asyncpg` + configurar `DATABASE_URL` con PostgreSQL
3. Verificar que `Base.metadata.create_all` cree todas las tablas (20+ modelos)
4. Crear seed script: `backend/seed.py` con datos demo (admin, clientes, cuentas)
5. Configurar Alembic para migraciones versionadas
6. Ejecutar seed en deploy inicial

**Verificación:** `curl https://balanceos.app/health` devuelve `{"status":"ok","db":"postgresql"}`

### 0.2 — Autenticación funcional

**Archivos:**
- Modificar: `backend/app/routers/auth.py`
- Modificar: `backend/app/main.py`

**Tareas:**
1. Fix: primer usuario registrado es admin automáticamente
2. Seed: crear `admin@balanceos.com` con contraseña segura en seed.py
3. Agregar rate limiting en login (5 intentos / 15 min)
4. Agregar refresh tokens (JWT access 15min + refresh 7d)
5. Agregar endpoint `POST /auth/logout` (revocar refresh token)

### 0.3 — Multi-tenancy (aislamiento por despacho)

**Archivos:**
- Crear: `backend/app/models/tenant.py`
- Modificar: `backend/app/database.py`
- Modificar: `backend/app/middleware/tenant.py`
- Modificar: Todos los routers (agregar filtro `tenant_id`)

**Tareas:**
1. Modelo `Despacho`: id, nombre, subdomain, plan (free/pro/enterprise), activo
2. Modelo `Usuario` ← agregar `despacho_id` FK
3. Middleware que extrae `despacho_id` del JWT y lo inyecta en la sesión
4. Todos los queries agregan `WHERE despacho_id = current_tenant`
5. Seed: crear despacho demo + admin + 5 clientes

**Estrategia:** Single-DB shared schema con `tenant_id` en cada tabla. No schema-per-tenant (overkill para MVP).

**Verificación:** El usuario del despacho A no puede ver clientes del despacho B.

### 0.4 — Dominio + SSL

**Tareas:**
1. Comprar dominio: `balanceos.app` o `balanceconsultores.app`
2. Configurar Cloudflare DNS → Railway
3. Activar SSL automático en Railway
4. Configurar `balanceos-production.up.railway.app` → redirigir a dominio

---

## 🎯 FASE 1 — Motor de Ingresos (Semanas 3-5)

> **Objetivo:** Activar el modelo de negocio — la app genera dinero.

### 1.1 — Integración PAC real (Finkok)

**Archivos:**
- Modificar: `backend/app/cfdi/pac_adapter.py`
- Crear: `backend/app/pac/finkok_client.py`
- Crear: `backend/app/pac/prodigia_client.py` (fallback)

**Tareas:**
1. Registrarse en Finkok (plan pruebas gratuito, 10 CFDI/mes)
2. Implementar `finkok_client.py`: timbrar, cancelar, consultar estatus
3. Conectar `pac_adapter.py` → `finkok_client.py` (factory pattern ya existe)
4. Implementar cola de reintentos (3 intentos con backoff exponencial)
5. Guardar XML timbrado + PDF en storage local (futuro: S3)
6. Modo sandbox para desarrollo (sin consumir créditos reales)

**Verificación:** Crear nómina → timbrar CFDI → obtener UUID real del SAT.

### 1.2 — Sistema de Suscripciones (Stripe)

**Archivos:**
- Crear: `backend/app/routers/billing.py`
- Crear: `backend/app/models/billing.py` (Suscripcion, FacturaPropia)
- Crear: `frontend/src/Billing.jsx`

**Tareas:**
1. Crear cuenta Stripe, configurar productos:
   - Plan Starter: $29/mes (1 usuario, 10 clientes, 50 nóminas)
   - Plan Pro: $79/mes (5 usuarios, 50 clientes, ilimitado nóminas)
   - Plan Enterprise: $199/mes (ilimitado)
2. Implementar Stripe Checkout (página de pago hosted)
3. Webhook `POST /billing/webhook` para recibir eventos Stripe
4. Middleware que bloquea requests si suscripción no está activa
5. Página de billing: plan actual, facturas, cambiar plan, cancelar
6. Trial de 14 días automático al registrarse

### 1.3 — Email/SMTP

**Archivos:**
- Crear: `backend/app/services/email_service.py`
- Modificar: `backend/app/routers/facturacion.py` (enviar factura)
- Modificar: `backend/requirements.txt` (agregar `resend`)

**Tareas:**
1. Configurar Resend (100 emails/día gratis) o SendGrid
2. Templates HTML: bienvenida, factura emitida, nómina timbrada, alerta EFOS
3. Función `enviar_email(destinatario, template, data)`
4. Conectar facturación: botón "Enviar por correo" → email con PDF adjunto
5. Conectar nómina: timbrado exitoso → email automático al cliente

---

## 🎯 FASE 2 — Experiencia de Usuario (Semanas 6-8)

> **Objetivo:** La primera impresión del contador es profesional y productiva.

### 2.1 — Dashboard real con KPIs

**Archivos:**
- Modificar: `frontend/src/Dashboard.jsx` (de 43 líneas a ~400)
- Crear: `backend/app/routers/dashboard.py`

**Tareas:**
1. Endpoint `GET /dashboard/kpis`: clientes activos, nóminas mes, facturas pendientes, IVA por pagar, alertas EFOS activas
2. Endpoint `GET /dashboard/actividad`: últimos 20 eventos del motor de eventos
3. Endpoint `GET /dashboard/graficos`: ingresos vs egresos (últimos 6 meses), distribución de clientes por régimen
4. Frontend: 4 KPI cards reales + gráfico de barras + timeline de actividad
5. Widget de vencimientos próximos (IMSS, declaraciones, FIEL)

### 2.2 — SidePanel con datos reales

**Archivos:**
- Modificar: `frontend/src/components/SidePanel.jsx`
- Crear: `backend/app/routers/sidepanel.py`

**Tareas:**
1. Endpoint `GET /sidepanel/context?page=` — devuelve datos reales según módulo
2. Reemplazar todos los mocks del SidePanel con llamadas a la API
3. Conectar búsqueda global con `/crm/buscar`

### 2.3 — Onboarding guiado

**Archivos:**
- Crear: `frontend/src/Onboarding.jsx`
- Modificar: `frontend/src/App.jsx`

**Tareas:**
1. Flujo de 4 pasos al primer login:
   - Paso 1: Datos del despacho (nombre, RFC, dirección)
   - Paso 2: Importar clientes (subir CSV/Excel o agregar manual)
   - Paso 3: Configurar primeros 3 empleados de prueba
   - Paso 4: Elegir plan (trial de 14 días)
2. Progress bar + checklist de configuración
3. Tooltips contextuales en puntos clave ("¿Primera nómina? Haz clic aquí")

### 2.4 — Permisos granulares

**Archivos:**
- Modificar: `backend/app/models/__init__.py` (modelo Permiso)
- Modificar: `backend/app/routers/auth.py`

**Tareas:**
1. Tabla `permisos`: usuario_id, modulo, accion (leer/escribir/admin)
2. Middleware de autorización: `@requiere_permiso("nomina", "escribir")`
3. UI de gestión de equipo: invitar miembros, asignar roles + permisos
4. Roles predefinidos: Socio (todo), Contador Senior (todo menos billing), Auxiliar (solo lectura + carga), Cliente (solo su portal)

---

## 🎯 FASE 3 — Reportes, Documentos y Diferenciadores (Semanas 9-12)

> **Objetivo:** Pulir la herramienta con lo que el contador realmente necesita para trabajar.

### 3.1 — Generación de PDFs

**Archivos:**
- Crear: `backend/app/services/pdf_service.py`
- Modificar: `backend/requirements.txt` (agregar `weasyprint`)

**Tareas:**
1. Templates PDF con WeasyPrint (HTML → PDF):
   - Recibo de nómina timbrado
   - Finiquito / Liquidación
   - Factura CFDI
   - Declaración de impuestos (resumen)
   - Estado de cuenta (tesorería)
2. Endpoint `GET /pdf/{tipo}/{id}` — genera y devuelve PDF
3. Botón "Descargar PDF" en cada módulo relevante
4. Logo del despacho en cada PDF (configurable en settings)

### 3.2 — Importación masiva de datos

**Archivos:**
- Crear: `backend/app/services/import_service.py`
- Crear: `frontend/src/components/ImportWizard.jsx`

**Tareas:**
1. Importar clientes desde CSV/Excel (template descargable)
2. Importar empleados desde CSV (nombre, NSS, salario, fecha ingreso, RFC)
3. Importar catálogo de cuentas contables desde Excel
4. Validación + preview antes de confirmar importación
5. Mapeo de columnas flexible (el usuario asigna columnas del Excel a campos)

### 3.3 — Integración FIEL (e.firma)

**Archivos:**
- Crear: `backend/app/services/fiel_service.py`

**Tareas:**
1. Subir archivos .cer y .key + contraseña por despacho
2. Firmar XML de CFDI con e.firma del despacho (requisito SAT)
3. Validar vigencia del certificado
4. Alertas 30 días antes del vencimiento

### 3.4 — Buzón de notificaciones real

**Archivos:**
- Modificar: `backend/app/services/event_engine.py`
- Crear: `frontend/src/components/NotificationBell.jsx`

**Tareas:**
1. Conectar motor de eventos → buzón de notificaciones en UI
2. Contador de no leídas en el header (campanita con badge)
3. Dropdown de últimas 5 notificaciones
4. Página de notificaciones con filtros (leídas/no leídas, por módulo)
5. Notificaciones push (futuro: PWA)

### 3.5 — PWA + Offline

**Archivos:**
- Modificar: `frontend/index.html` (manifest ya existe)
- Crear: `frontend/src/service-worker.js`
- Modificar: `frontend/vite.config.js`

**Tareas:**
1. Configurar Vite PWA plugin
2. Cache de assets estáticos para carga offline
3. Ícono de app en home screen (iOS/Android)
4. Splash screen
5. Sincronización de datos pendientes al reconectar

---

## 📅 Cronograma resumen

| Fase | Semanas | Entregable principal |
|---|---|---|
| **F0** — Cimientos | 1-2 | PostgreSQL, multi-tenancy, auth real, dominio |
| **F1** — Ingresos | 3-5 | PAC Finkok, Stripe, email, facturación real |
| **F2** — UX | 6-8 | Dashboard real, onboarding, permisos, SidePanel real |
| **F3** — Pulido | 9-12 | PDFs, importación, FIEL, notificaciones, PWA |

---

## 🏁 MVP mínimo viable (corte temprano)

Si necesitas salir más rápido, este es el **subconjunto mínimo** para un MVP que cobre dinero:

| Requisito | Incluir |
|---|---|
| PostgreSQL | ✅ F0.1 |
| Auth + multi-tenancy | ✅ F0.2 + F0.3 |
| PAC Finkok | ✅ F1.1 |
| Stripe (un solo plan Pro) | ✅ F1.2 (simplificado) |
| Email facturas | ✅ F1.3 |
| Dashboard real | ✅ F2.1 |
| Onboarding | ✅ F2.3 |
| PDF nómina + factura | ✅ F3.1 |
| Importar clientes CSV | ✅ F3.2 |
| Dominio + SSL | ✅ F0.4 |

**Tiempo: 6-8 semanas.** Todo lo demás (F2.2, F2.4, F3.3-F3.5) puede esperar a post-MVP.

---

## 🚀 Métricas de éxito post-lanzamiento

| Métrica | Meta mes 1 | Meta mes 3 |
|---|---|---|
| Despachos registrados | 10 | 50 |
| Usuarios activos (DAU) | 5 | 30 |
| Nóminas timbradas | 50 | 500 |
| Churn rate | <20% | <10% |
| MRR | $290 | $2,370 |

---

> **¿Siguiente paso?** Con tu visto bueno, arranco Fase 0.1: migración a PostgreSQL.
