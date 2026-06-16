# Proyecto Fisco — Plan Maestro de Ejecución (Zero to Market)

> **Objetivo:** Lanzar Fisco como el ERP #1 para contadores jóvenes en México.
> **Alcance:** Desde validación legal de módulos hasta campaña de lanzamiento agresiva.
> **Fecha:** Junio 2026

---

## 1. RETOS CRÍTICOS — Diagnóstico sin filtros

### 1.1 REPSE y PLD: Contenido y validez legal

**Riesgo:** Estos módulos no son "nice-to-have". Si fallan, el contador tiene sanciones reales del SAT/STPS.

**REPSE (Registro de Prestadoras de Servicios Especializados):**
- Obligatorio desde 2021 para subcontratación de personal
- Requiere registro ante STPS, avisos trimestrales, altas/bajas de personal
- Si el sistema emite un aviso con datos incorrectos → multa de $50,000-$500,000 MXN

**Cómo garantizar eficiencia:**

| Requisito | Acción |
|---|---|
| **Actualización normativa** | Cron job semanal que monitorea cambios en DOF (ya existe: `efos_scraper.py`). Extenderlo a cambios en lineamientos REPSE |
| **Validación de datos** | Validar RFC contra formato SAT (regex + algoritmo de dígito verificador). Validar que el registro REPSE exista consultando API pública STPS |
| **Avisos trimestrales** | Calendario automático con alertas 30/15/7/1 día antes del vencimiento. Generación de archivo en formato oficial STPS |
| **Audit trail** | Cada aviso generado queda registrado en el motor de eventos con timestamp, usuario, y datos enviados |
| **Disclaimer legal** | Incluir en UI: "Este sistema es una herramienta de apoyo. La responsabilidad de la veracidad de los datos es del contador." |

**PLD (Prevención de Lavado de Dinero):**
- Obligatorio para contadores que realizan actividades vulnerables (Art. 17 LFPIORPI)
- Requiere: identificación de cliente, scoring de riesgo, reportes a la UIF
- Si no se presenta reporte → multa de $13,000-$260,000 MXN

| Requisito | Acción |
|---|---|
| **Scoring de riesgo** | Motor basado en el modelo oficial de la CNBV: ubicación, PEP, tipo de operación, monto. Modelo `evaluacion_riesgo.py` ya existe — necesita revisión por un experto PLD |
| **Reportes UIF** | Generar archivo en formato oficial XML que la UIF acepta. Validar esquema XSD antes de "entregar" |
| **Checklist de cumplimiento** | Por cliente: ¿tiene expediente completo? ¿firmó política PLD? ¿se presentó aviso? Dashboard visual de cumplimiento |

**Acción inmediata:** Contratar revisión de un abogado fiscal/PLD para auditar ambos módulos antes del lanzamiento. Costo estimado: $15,000-$30,000 MXN por revisión única.

---

### 1.2 Modelo de negocio: Precio base y campaña agresiva

**Propuesta de pricing (validada contra mercado):**

| Plan | Precio/mes | Incluye | Para quién |
|---|---|---|---|
| **Starter** | $29 USD (~$500 MXN) | 1 usuario, 10 clientes, 50 nóminas/mes, módulos core | Contador independiente empezando |
| **Pro** | $79 USD (~$1,350 MXN) | 5 usuarios, 50 clientes, nóminas ilimitadas, todos los módulos | Despacho mediano |
| **Enterprise** | $199 USD (~$3,400 MXN) | Usuarios ilimitados, clientes ilimitados, API, soporte prioritario | Despacho grande / maquiladora |

**Campaña agresiva de adquisición: "Plan Cero"**

Objetivo: 500 despachos en 90 días con CAC cercano a $0.

| Táctica | Canal | Costo | Proyección |
|---|---|---|---|
| **"Timbrado gratis de por vida"** | Plan Starter incluye 10 nóminas/mes sin costo de timbrado | $0 (PAC Finkok ~$0.20 por timbre, absorbido) | 200+ registros en mes 1 |
| **"Tu primer cliente es gratis"** | Starter permite 3 clientes gratis indefinido | $0 | Retención >70% → upgrade a Pro |
| **"Trae a 3 colegas"** | Programa de referidos con 1 mes gratis para ambos | $0 (costo de oportunidad) | Factor viral 1.5x |
| **Embajadores universitarios** | 5-10 estudiantes de contaduría promoviendo en sus universidades | $2,000 MXN/mes por embajador | 50+ registros/mes por universidad |
| **Contenido viral en TikTok** | "Un día en la vida de un contador que usa Fisco" — antes vs después | $0 (orgánico) | 100K+ views → 1-2% conversión |
| **Google Ads (competidores)** | Keywords: "alternativa a Contalink", "software contable gratis", "sistema de nómina" | $5,000 MXN/mes inicial | 200+ clicks/mes → 5% conversión |

---

### 1.3 Diferenciación real vs competidores

**Lo que NADIE más tiene (y será nuestro ángulo de ataque):**

| Diferenciador | Contalink | Siigo | CONTPAQi | **Fisco** |
|---|---|---|---|---|
| Dark mode premium | ❌ | ❌ | ❌ | ✅ |
| CRM integrado (timeline, notas) | ❌ | ❌ | ❌ | ✅ |
| Motor IMSS real | ❌ | ❌ | Parcial | ✅ |
| REPSE + PLD en un solo lugar | ❌ | ❌ | ❌ | ✅ |
| API pública para devs | Básica | ❌ | ❌ | ✅ |
| Comunidad de contadores | ❌ | ❌ | ❌ | ✅ (Discord/WhatsApp) |
| Plan gratuito real | Demo 7 días | ❌ | ❌ | ✅ (Starter con 3 clientes gratis) |

**Nuestra tesis de diferenciación:**

> *"CONTPAQi fue para el contador de los 90s. Contalink es para el contador del 2015. Fisco es para el contador que usa Figma, Notion y Spotify."*

---

### 1.4 CAC y romper la inercia del contador

**El problema real:** El contador mexicano promedio cambia de herramienta cada 7-10 años. Hay una resistencia cultural enorme.

**Tácticas para romper la inercia:**

| Barrera | Solución |
|---|---|
| **"Ya pagué CONTPAQi de por vida"** | Mensaje: "No pagaste el software. Pagaste la licencia. ¿Cuánto pagas en tiempo perdido cada mes?" |
| **"Migrar mis datos es un desmadre"** | Importador CSV/Excel en 2 clics. Servicio de migración asistida gratuito para early adopters |
| **"¿Y si quiebra la startup?"** | Open source el motor de cálculo fiscal. Los datos son exportables en cualquier momento. No lock-in |
| **"Mis clientes usan CONTPAQi"** | Portal de cliente gratuito: tus clientes ven sus facturas y declaraciones sin pagar licencia |

**Atacar el nicho de recién egresados:**

| Canal | Estrategia |
|---|---|
| **Universidades** | Convenio con facultades de contaduría: licencias gratis para profesores y alumnos |
| **Servicio social** | "Haz tus prácticas con Fisco" — mentoría + acceso premium durante el semestre |
| **Bolsa de trabajo** | Los despachos que usan Fisco pueden publicar vacantes. Los estudiantes que usan Fisco tienen perfil destacado |
| **Certificación** | "Certificación Fisco" — curso de 4 horas. Los contadores certificados aparecen en nuestro directorio público |

**Dato clave:** El 60% de los egresados de contaduría en México (aprox 30,000/año) NO encuentra empleo formal en los primeros 6 meses. Muchos emprenden como independientes. Si capturamos al 5% de ellos: **1,500 nuevos usuarios al año sin costo de adquisición.**

---

## 2. DISEÑO Y EXPERIENCIA — Nuestra verdadera ventaja

### 2.1 Tendencias de diseño B2B SaaS 2025-2026

| Tendencia | Cómo aplicarla |
|---|---|
| **Modo oscuro como default** | Ya lo tenemos. El dark mode es premium, no un afterthought |
| **Micro-interacciones sutiles** | Hover states, transiciones 150-200ms, skeleton loaders, botones que se hunden 2px al click |
| **Tipografía como identidad** | Inter (ya la usamos) + una serif para headings en landing page (Playfair Display o Cormorant) |
| **Asimetría controlada** | Layouts no simétricos en dashboard, tarjetas con bordes orgánicos (border-radius asimétrico), grids rotos intencionalmente |
| **Glassmorphism funcional** | No decorativo. El glass (backdrop-blur) lo usamos en headers y nav. Es funcional: jerarquiza sin agregar peso visual |
| **Espacio negativo abundante** | Padding generoso, interlineado 1.5, márgenes amplios. La densidad de información es enemiga de la claridad |
| **Ilustraciones abstractas** | En vez de fotos de stock, usar formas geométricas abstractas (como Stripe, Linear). Nuestro isotipo de 3 pilares ya va en esa dirección |

### 2.2 Sistema de diseño: elementos armónicos y sutiles

| Elemento | Especificación |
|---|---|
| **Paleta base** | `#0A0A0A` (bg), `#141414` (cards), `#1A1A1A` (inputs), `#262626` (borders) |
| **Acento** | `#10B981` (esmeralda) — transmite confianza, crecimiento, dinero |
| **Acento secundario** | `#F59E0B` (ámbar) — alertas, advertencias, atención |
| **Tipografía** | Inter (UI) + Playfair Display (landing headlines) |
| **Curvas** | `border-radius: 8/12/16/20px`. No border-radius uniformes: las cards de KPI tienen esquina superior-izquierda más redondeada |
| **Sombras** | Doble capa: `0 4px 6px -1px rgba(0,0,0,0.5)` + `0 2px 4px -1px rgba(0,0,0,0.3)`. No sombras planas de Tailwind default |
| **Transiciones** | `cubic-bezier(0.16, 1, 0.3, 1)` — ease-out con overshoot sutil. Duración 150ms para micro, 300ms para navegación |
| **Líneas asimétricas** | Los separadores no son líneas rectas completas. Son gradientes que se desvanecen: `linear-gradient(to right, rgba(255,255,255,0.08), transparent)`. Las líneas decorativas en la landing son curvas bezier, no rectas |

### 2.3 Landing page — Elementos clave

```
┌────────────────────────────────────────────┐
│  [Logo Fisco]          [Producto] [Precios] │
│                                   [Login]   │
├────────────────────────────────────────────┤
│                                            │
│    El ERP que tu contador de los 90s        │
│    no entendería.                           │
│                                            │
│    Motor IMSS · CFDI ilimitado · REPSE      │
│    Dark mode por defecto · Sin lock-in      │
│                                            │
│    [Comenzar gratis]  [Ver demo 90s]        │
│                                            │
│         ↙ Curva bezier asimétrica           │
│                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 600,000  │  │  80,000  │  │   #1 en  │  │
│  │contadores│  │despachos │  │ diseño   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                            │
│  "Dejé de usar Excel para todo. Ahora       │
│   duermo 8 horas." — Ana, contadora CDMX   │
│                                            │
│  [Features grid con ilustraciones]          │
│  [Pricing table con 3 planes]               │
│  [FAQ] [Footer]                             │
└────────────────────────────────────────────┘
```

---

## 3. CONSTRUCCIÓN DE COMUNIDAD

### 3.1 Estrategia de comunidad

**Tesis:** El software se copia. La comunidad no.

| Capa | Plataforma | Propósito |
|---|---|---|
| **Inner circle** | Grupo WhatsApp de 20-30 contadores beta testers | Feedback en tiempo real, bugs, ideas |
| **Comunidad abierta** | Discord "Contadores Tech" | Soporte entre pares, compartir tips, networking |
| **Contenido público** | Twitter/X + TikTok | Construir marca personal de Fisco, atraer nuevos |
| **Directorio público** | Página en fisco.app/directorio | Contadores certificados Fisco visibles para empresas que buscan contador |

### 3.2 Eventos de comunidad

| Evento | Frecuencia | Formato |
|---|---|---|
| **Jueves Fiscal** | Semanal | Space en Twitter/X de 45min: tema fiscal + demo de una feature |
| **Café con Contadores** | Quincenal | Zoom informal de 30min con un contador invitado |
| **FiscoConf** | Anual | Evento presencial en CDMX (año 2): 200 contadores, workshops, keynotes |
| **Reto Fisco** | Trimestral | "Automatiza tu despacho en 7 días" — challenge con premios |

---

## 4. HABILIDADES NECESARIAS (Skills para el proyecto)

### 4.1 Técnicas (ya cubiertas o a adquirir)

| Skill | Categoría | Estado |
|---|---|---|
| **subagent-driven-development** | Ejecución de planes con agentes | ✅ Instalada |
| **test-driven-development** | Calidad de código | ✅ Instalada |
| **writing-plans** | Planificación estructurada | ✅ Instalada |
| **simplify-code** | Refactorización | ✅ Instalada |
| **systematic-debugging** | Debugging metódico | ✅ Instalada |
| **web-developer** | Desarrollo web | ✅ Instalada |
| **orbai-premium-website** | Landing page premium | ✅ Instalada |
| **requesting-code-review** | Code review pre-commit | ✅ Instalada |
| **brand-identity** | Desarrollo de identidad de marca | 🔴 Necesaria |
| **business-branding** | Branding completo para negocio | 🔴 Necesaria |
| **popular-web-designs** | Referencias de diseño (Stripe, Linear) | 🔴 Necesaria |
| **plan** | Planificar antes de ejecutar | 🔴 Necesaria |

### 4.2 Skills a cargar para Fase 0

```
hermes skills install obra/superpowers --skill brand-identity
hermes skills install obra/superpowers --skill business-branding
hermes skills install obra/superpowers --skill popular-web-designs
hermes skills install obra/superpowers --skill plan
```

---

## 5. PLAN DE EJECUCIÓN — Fase por fase

### 🏁 FASE 0 — Fundación (Semanas 1-2)

**Objetivo:** Identidad + infraestructura lista para recibir beta testers.

| # | Tarea | Skills necesarias | Días |
|---|---|---|---|
| 0.1 | Definir identidad de marca (nombre final, logo, paleta, voz) | `brand-identity`, `business-branding` | 2 |
| 0.2 | Landing page completa (orbai-style, secciones, SEO) | `orbai-premium-website`, `popular-web-designs` | 3 |
| 0.3 | Migrar a PostgreSQL + Railway | `subagent-driven-development` | 2 |
| 0.4 | Multi-tenancy (aislamiento por despacho) | `subagent-driven-development` | 2 |
| 0.5 | Dashboard real con KPIs | `subagent-driven-development` | 2 |
| 0.6 | SidePanel con datos reales de API | `subagent-driven-development` | 1 |
| 0.7 | Onboarding de primer uso | `subagent-driven-development` | 2 |
| 0.8 | Auditoría legal REPSE + PLD (contratar abogado) | Externa | 2 |

### 🏁 FASE 1 — Motor de Ingresos (Semanas 3-5)

| # | Tarea | Días |
|---|---|---|
| 1.1 | Integración PAC Finkok (timbrar real) | 3 |
| 1.2 | Sistema de suscripciones Stripe | 3 |
| 1.3 | Email/SMTP (Resend o SendGrid) | 2 |
| 1.4 | PDFs profesionales (nómina, factura, finiquito) | 3 |
| 1.5 | Importar clientes/empleados desde CSV | 2 |
| 1.6 | Plan gratuito funcional (3 clientes, 10 nóminas) | 1 |

### 🏁 FASE 2 — Beta Cerrada (Semanas 6-7)

| # | Tarea | Días |
|---|---|---|
| 2.1 | Invitar 20 contadores beta (Cancún + contactos) | 1 |
| 2.2 | Sesiones de onboarding 1:1 por Zoom | 3 |
| 2.3 | Iterar con feedback (bugs, UX, prioridades) | 5 |
| 2.4 | Grabar testimonios en video | 2 |

### 🏁 FASE 3 — Lanzamiento (Semanas 8-10)

| # | Tarea | Días |
|---|---|---|
| 3.1 | Contenido de lanzamiento (blog, videos, tweets) | 3 |
| 3.2 | Publicar en ProductHunt, BetaList | 1 |
| 3.3 | Campaña de referidos (invita a 3 = 1 mes gratis) | 1 |
| 3.4 | Programa de embajadores universitarios | 2 |
| 3.5 | Google Ads keywords competidores | 2 |
| 3.6 | Comunidad Discord + grupo WhatsApp | 1 |
| 3.7 | Lanzamiento público | 1 |

---

## 📅 Timeline visual

```
Semana  1  2  3  4  5  6  7  8  9  10
        ├───────────┼──────────┼──────┼──────────┤
        │  FASE 0   │  FASE 1  │FASE 2│  FASE 3  │
        │Fundación  │ Ingresos │ Beta │Lanzamiento│
        │           │          │      │           │
        │Marca      │PAC Finkok│20 test│ProductHunt│
        │Landing    │Stripe    │Feedback│Referidos  │
        │PostgreSQL │Email     │Iterar │Embajadores│
        │Multi-ten  │PDFs      │       │Comunidad  │
        │Dashboard  │Import CSV│       │Google Ads │
        │Onboarding │          │       │           │
        └───────────┴──────────┴───────┴───────────┘
                                     🚀 LAUNCH
```

---

## 🏁 Acción inmediata

1. **Instalar skills necesarias:** `brand-identity`, `business-branding`, `popular-web-designs`, `plan`
2. **Definir nombre final** (Fisco u otro) con disponibilidad de dominio
3. **Arrancar Fase 0.1:** Identidad de marca + landing page
4. **Contactar abogado fiscal** para auditoría REPSE/PLD
