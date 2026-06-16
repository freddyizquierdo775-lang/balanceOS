# Balance OS → Plan de Ejecución Final

> **Objetivo:** Terminar el ERP y lanzarlo al mercado.  
> **Duración:** 8-10 semanas.  
> **Principio:** Cada fase produce algo que un usuario real puede usar.

---

## 🎯 FASE 0 — Fundación (AHORA)

**Meta:** El prototipo se convierte en una app funcional donde un contador puede registrarse, ver su dashboard y navegar módulos con datos reales.

| Tarea | Acción | Resultado |
|---|---|---|
| **0.1** | PostgreSQL en Railway | Base de datos que sobrevive deploys |
| **0.2** | Seed de datos demo | Al hacer deploy, hay admin + clientes + cuentas + empleados |
| **0.3** | Auth funcional | Login funciona en producción |
| **0.4** | Dashboard real | KPIs desde API: clientes activos, nóminas mes, IVA por pagar, alertas |
| **0.5** | SidePanel real | Buscador consulta API, datos vienen de DB, no mock |
| **0.6** | Multi-tenancy básico | `despacho_id` en usuarios. Filtro por despacho en queries |

**Verificación:** Entrar a la URL, registrarse, ver dashboard con datos demo reales, navegar módulos.

---

## 🎯 FASE 1 — Ingresos (Semanas 2-4)

**Meta:** La app puede cobrar dinero y timbrar CFDI reales.

| Tarea | Acción |
|---|---|
| **1.1** | PAC Finkok — timbrar nóminas y facturas de verdad |
| **1.2** | Stripe — checkout, webhooks, planes Starter/Pro/Enterprise |
| **1.3** | Email — Resend/SendGrid para facturas, bienvenida, alertas |

**Verificación:** Registrar despacho → elegir plan → pagar con Stripe → timbrar una nómina → recibir email con CFDI.

---

## 🎯 FASE 2 — Pulido (Semanas 5-7)

**Meta:** La app se siente profesional. Un contador puede trabajar todo el día en ella.

| Tarea | Acción |
|---|---|
| **2.1** | PDFs — nómina, factura, finiquito (WeasyPrint) |
| **2.2** | Importar CSV — clientes, empleados, cuentas contables |
| **2.3** | Onboarding — flujo guiado de 4 pasos al primer login |
| **2.4** | Permisos — socio, contador senior, auxiliar, cliente |

**Verificación:** Subir Excel con 50 clientes → procesar nómina → descargar PDF → enviar por email.

---

## 🎯 FASE 3 — Lanzamiento (Semanas 8-10)

**Meta:** La app está viva con dominio propio, landing page, y los primeros usuarios pagando.

| Tarea | Acción |
|---|---|
| **3.1** | Dominio + SSL + landing page |
| **3.2** | Blog + 5 artículos SEO |
| **3.3** | Beta cerrada: 20 contadores, feedback, iterar |
| **3.4** | Programa de referidos |
| **3.5** | Comunidad (Discord/WhatsApp) |

---

## 🔥 ARRANQUE INMEDIATO (F0)

Ejecutando AHORA en paralelo:
1. PostgreSQL en Railway + seed + auth fix
2. Dashboard real con KPIs
3. SidePanel real
