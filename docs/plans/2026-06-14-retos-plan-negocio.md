# Fisco — Retos Técnicos, Plan de Negocio & Campaña Agresiva

> Complemento al documento de estrategia de mercado. Junio 2026.

---

## 🔴 RETO 1: Módulos PLD y REPSE — Contenido y Eficiencia

### Diagnóstico actual

| Módulo | Backend | Frontend | Motor real | Contenido regulatorio |
|---|---|---|---|---|
| **PLD** | ✅ 268 líneas, 7 endpoints | ✅ 267 líneas | ⚠️ Cuestionario simple, scoring manual | ❌ Vacío |
| **REPSE** | ✅ 298 líneas, 11 endpoints | ✅ 405 líneas | ✅ Registros, personal, avisos | ❌ Vacío |

**El problema real:** Ambos módulos tienen la infraestructura técnica lista, pero **el contenido normativo es el que da valor real.** Sin guías, plantillas, checklists y conocimiento experto, son formularios vacíos. El contador no va a llenar un cuestionario PLD si no sabe qué implica cada pregunta.

### Estrategia de contenido para PLD

**Fuente oficial:** Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita (LFPIORPI) + disposiciones CNBV + UIF.

**Lo que hay que construir:**

| Componente | Descripción | Esfuerzo |
|---|---|---|
| **Cuestionario guiado** | No solo preguntas sueltas. Cada pregunta tiene tooltip explicativo, referencia al artículo de ley, y ejemplo concreto | 3 días |
| **Calculadora de nivel de riesgo** | Algoritmo que pondera respuestas y asigna riesgo automático (bajo/medio/alto) | 2 días |
| **Kit de cumplimiento por cliente** | Checklist de documentos requeridos según nivel de riesgo (identificación, comprobante domicilio, acta constitutiva, estados financieros) | 2 días |
| **Plantillas de reportes** | Formato de "Aviso de operaciones inusuales", "Aviso de operaciones relevantes", "Informe anual PLD" | 2 días |
| **Alertas automáticas** | Cuando un cliente supera umbrales (ej: $500,000 MXN en operaciones en efectivo), el sistema genera alerta automática | 1 día |
| **Guía de cumplimiento** | PDF descargable: "PLD para despachos contables en 10 pasos" — contenido evergreen que además sirve como lead magnet | 2 días |

**Estrategia de garantía:** Alianza con un **abogado fiscalista** o **consultor PLD certificado** (puede ser Adrián Ake, que ya está en el equipo de Balance Consultores). Él revisa el contenido, lo firma, y se convierte en el "sello de calidad" del módulo. A cambio, comisión por despacho que active el módulo o tarifa plana de consultoría.

### Estrategia de contenido para REPSE

**Fuente oficial:** Reforma laboral 2021 (subcontratación) + reglas del SAT + STPS.

| Componente | Descripción | Esfuerzo |
|---|---|---|
| **Evaluador de necesidad REPSE** | Formulario de 5 preguntas que determina si el cliente necesita REPSE (muchas PYMEs ni saben que están obligadas) | 1 día |
| **Calculadora de vigencia** | Según la fecha de registro, calcula vencimiento y alerta 60 días antes | 1 día |
| **Catálogo de actividades especializadas** | Lista completa del SAT de actividades que requieren REPSE, con buscador | 1 día |
| **Generador de contrato REPSE** | Plantilla de contrato de servicios especializados (obligatorio por ley), pre-llenada con datos del cliente | 2 días |
| **Generador de aviso trimestral** | Plantilla del formato de aviso al SAT/STPS, auto-completado con datos del sistema | 1 día |
| **Checklist de cumplimiento** | Paso a paso: 1. Registro REPSE, 2. Contrato, 3. Alta trabajadores, 4. Aviso trimestral, 5. Facturación correcta | 1 día |
| **Guía descargable** | "REPSE para despachos contables: lo que debes saber en 2026" — lead magnet | 2 días |

**Garantía de eficiencia:** 
1. **Actualización automática:** Un cron job semanal consulta el DOF (Diario Oficial de la Federación) por cambios en regulación REPSE/PLD y notifica si hay novedades
2. **Sello de experto:** Contenido revisado por un especialista en derecho laboral (Jorge del equipo, o externo)
3. **Métrica de éxito:** "Clientes con REPSE al día" → el contador ve de un vistazo quién está en riesgo

### Resumen: ¿cómo garantizamos que estos módulos no sean "cascarones"?

| Mecanismo | PLD | REPSE |
|---|---|---|
| Contenido experto (abogado/consultor) | ✅ | ✅ |
| Checklists guiados | ✅ | ✅ |
| Plantillas descargables | ✅ | ✅ |
| Cálculos automáticos | ✅ (nivel de riesgo) | ✅ (vigencia) |
| Alertas proactivas | ✅ (umbrales de efectivo) | ✅ (vencimiento 60 días) |
| Actualización regulatoria automática | ✅ (DOF scraper) | ✅ (DOF scraper) |
| Lead magnet (guía PDF) | ✅ | ✅ |

---

## 💰 RETO 2: Plan de Negocio — Precio Base

### El problema del pricing en software contable mexicano

```
CONTPAQi:    $5,000-$15,000 MXN (licencia perpetua + anualidad) → $400-$1,250/mes efectivo
Siigo/Aspel: $1,200-$3,500 MXN/mes (por módulo, se vuelve caro al sumar)
Contalink:   ~$499-$799 MXN/mes (precio no público, difícil de encontrar)
Alegra:      ~$400-$700 MXN/mes (más barato, menos profundo)
```

**La realidad del contador joven mexicano:**
- Ingreso promedio: $15,000-$30,000 MXN/mes (independiente)
- Gasto en software: actualmente ~$0-$500 MXN/mes (la mayoría usa Excel + portal SAT gratuito)
- **Disposición a pagar:** $300-$800 MXN/mes si el valor es evidente

### Estrategia de precios: "Freemium agresivo"

**Plan gratuito permanente** (no trial, GRATIS de por vida):
- 1 usuario
- 3 clientes
- 10 nóminas/mes
- Sin timbrado CFDI (solo cálculo)
- Sin módulos PLD ni REPSE
- Marca de agua "Generado con Fisco" en PDFs

**¿Por qué freemium permanente y no solo trial de 14 días?**
- Efecto red: el contador lo adopta, invita a sus clientes al portal
- Los clientes ven la herramienta y quieren que su contador tenga la versión Pro
- Barrera de salida: una vez que tienen 3 clientes cargados, migrar es molesto
- El 85% de los usuarios gratuitos eventualmente pagan (benchmark SaaS)

**Plan Starter — $29 USD/mes (~$520 MXN):**
- 1 usuario
- 10 clientes
- 50 nóminas/mes con timbrado incluido
- Módulos core: Clientes, IMSS, Nómina, Facturación, Contabilidad, Impuestos

**Plan Pro — $79 USD/mes (~$1,420 MXN):**
- 5 usuarios
- 50 clientes
- Nóminas ilimitadas con timbrado incluido
- Todos los módulos: + CRM, REPSE, PLD, Finiquitos, Tesorería, Estados Financieros, Alertas EFOS, API

**Plan Enterprise — $199 USD/mes (~$3,580 MXN):**
- Usuarios ilimitados
- Clientes ilimitados
- Todo ilimitado
- API pública + soporte prioritario + SSO + personalización de marca (logo del despacho)

### Por qué estos precios funcionan

| Razón | Explicación |
|---|---|
| **Precio psicológico** | $29 suena accesible. No es "$500 MXN", es "menos de 30 dólares". Aspiracional |
| **El plan Starter cubre la necesidad real** | 10 clientes es un despacho pequeño real. 50 nóminas/mes cubre una quincena de 25 empleados |
| **El plan Pro es donde está el valor** | Al crecer a 5 usuarios + 50 clientes, el contador ya factura $50K-$100K MXN/mes. $1,420 es el 2-3% de sus ingresos |
| **Timbrado incluido** | Contalink cobra timbrado por separado. Nosotros lo incluimos. Mensaje: "sin costo extra" |
| **Sin contratos anuales** | Mes a mes. Cancela cuando quieras. Reduce fricción de compra |

### Proyección financiera con estos precios

| Escenario | Usuarios | Starter (30%) | Pro (55%) | Enterprise (15%) | MRR |
|---|---|---|---|---|---|
| Mes 6 | 200 | 60×$29 | 110×$79 | 30×$199 | $16,400 |
| Mes 12 | 800 | 240×$29 | 440×$79 | 120×$199 | $65,600 |
| Mes 24 | 6,000 | 1,800×$29 | 3,300×$79 | 900×$199 | $491,700 |

**Costo de adquisición de cliente (CAC) objetivo:** <$50 MXN por usuario gratuito, <$500 MXN por usuario de pago.

---

## 📢 RETO 3: Campaña Agresiva de Marketing

### La tesis: "No competimos en features. Competimos en identidad."

CONTPAQi, Aspel y Contalink venden características: "módulo de nómina", "timbra CFDI", "calcula impuestos". Nadie vende **identidad, comunidad y estatus.**

**Nuestra campaña no dice "somos un software contable". Dice "somos lo que usan los contadores que van en serio."**

### Estrategia de 3 olas

---

### 🌊 OLA 1: Comunidad y Contenido (Mes 1-3, $0 presupuesto)

**Canal principal: Twitter/X + TikTok**

**Contenido que funciona para contadores jóvenes:**

| Tipo | Ejemplo | Enganche |
|---|---|---|
| **Hilo fiscal polémico** | "Por qué el 90% de los contadores están calculando mal el IMSS (y ni siquiera lo saben)" | Miedo + curiosidad |
| **Hilo aspiracional** | "Cómo pasé de 5 clientes a 30 en 18 meses sin contratar a nadie" | Inspiración |
| **Meme contable** | "El SAT cuando declaras a tiempo vs cuando se te pasa un día" | Humor identificable |
| **Behind the scenes** | "Así se ve el dashboard de un despacho que factura $150K/mes" | Aspiración + FOMO |
| **Tutorial narrado** | "Cómo calculé el finiquito de un empleado en 3 minutos con Fisco" | Utilidad directa |

**Frecuencia:** 3-5 tweets/hilos por día + 1 TikTok diario.

**Estrategia de crecimiento en Twitter:**
1. Seguir a los 200 contadores más activos en Twitter México
2. Comentar en sus hilos con valor real (no spam)
3. Los hilos con mejor engagement → invertir $20 en promocionarlos
4. Al llegar a 1,000 seguidores: lanzar el producto con link en bio

**TikTok:**
- Formato: "POV: eres contador y descubres esta herramienta"
- Sin mencionar la marca al inicio. Solo mostrar la interfaz
- Call to action: "Link en mi perfil para probarla gratis"
- Meta: 10 videos = 1 viral. 1 viral = 500-1,000 registros

---

### 🌊 OLA 2: Lanzamiento con Ruido (Mes 3-4, $200 USD presupuesto)

**Táctica: "Product Hunt Mexicano"**

No lanzamos en ProductHunt (es muy gringo). Lanzamos en:
1. **Twitter Spaces** — Un space en vivo "El futuro de la contabilidad en México" con 3 invitados contadores tech. 100-300 oyentes en vivo. Al final, mostramos Fisco.
2. **Grupos de WhatsApp de contadores** — Hay cientos de grupos de 100-200 contadores. Un mensaje bien escrito y no spam: "Chicos, construí esto para nosotros. Es gratis. Díganme qué opinan."
3. **Hacker News en español** — Comunidades como Platzi, Dev.f, grupos de tech mexicanos

**Táctica: "El Cierre" — Newsletter**

- Nombre: "El Cierre" (el momento más importante para un contador)
- Frecuencia: Semanal (viernes)
- Contenido: 1 resumen fiscal de la semana + 1 tip de Fisco + 1 caso de éxito de un usuario
- Crecimiento: De los 800 usuarios en mes 12, meta de 5,000 suscriptores a la newsletter
- Monetización futura: Sponsors de bancos, aseguradoras, plataformas de inversión que quieren llegar a contadores

**Táctica: Partnership con influencers contables**

- Identificar 5 "contadores influencers" en Twitter/TikTok México (tienen 5K-50K seguidores)
- Ofrecerles: acceso gratuito de por vida + 20% de comisión recurrente por cada usuario que traigan
- Un solo influencer con 20K seguidores puede traer 50-100 usuarios en un mes

---

### 🌊 OLA 3: Tráfico de Pago y Escala (Mes 5-12, $500-$2,000 USD/mes)

**Google Ads:**

| Keyword | Intención | CPC estimado |
|---|---|---|
| "software para despachos contables" | Compra | $15-25 MXN |
| "cómo timbrar nómina" | Informativa → capturamos con lead magnet | $8-12 MXN |
| "alternativa a contalink" | Comparación | $10-15 MXN |
| "programa para contadores" | Compra | $12-18 MXN |
| "sistema de nómina para despachos" | Compra | $15-20 MXN |

**Estrategia de keywords:** Pujar por los nombres de los competidores. "Alternativa a Aspel COI", "Mejor que Contalink", "vs CONTPAQi". Caro pero efectivo para capturar intención de compra.

**Presupuesto mensual escalonado:**

| Mes | Presupuesto Ads | Usuarios estimados | Costo por registro |
|---|---|---|---|
| 5 | $500 | 80-120 | $4-6 USD |
| 6 | $1,000 | 150-200 | $5-7 USD |
| 7-9 | $1,500 | 200-280 | $5-8 USD |
| 10-12 | $2,000 | 280-350 | $6-8 USD |

**Facebook/Instagram Ads:**
- Público personalizado: contadores 25-40, México, intereses en "SAT", "impuestos", "nómina", "contabilidad"
- Formato: video de 15-30 segundos mostrando la interfaz + "Prueba gratis"
- Retargeting: pixel en la página de pricing para usuarios que visitaron pero no compraron

---

### 📊 KPI's de la campaña

| Métrica | Mes 3 | Mes 6 | Mes 12 |
|---|---|---|---|
| Usuarios registrados | 200 | 1,000 | 4,000 |
| Usuarios de pago | 50 | 200 | 800 |
| Tasa de conversión gratuita → pago | 25% | 20% | 20% |
| Churn mensual | <15% | <10% | <5% |
| Seguidores Twitter | 2,000 | 8,000 | 25,000 |
| Newsletter suscriptores | 500 | 2,000 | 10,000 |
| CAC (costo adquisición pago) | $4 | $6 | $8 |
| LTV (valor de vida del cliente) | $290 | $580 | $870 |

---

### 🏁 Resumen: los 3 retos y sus soluciones

| Reto | Solución | Tiempo |
|---|---|---|
| **PLD/REPSE vacíos de contenido** | Alianza con abogado fiscalista + plantillas + calculadoras + actualización DOF automática | 2 semanas |
| **Precio base** | Freemium permanente + $29 Starter + $79 Pro + $199 Enterprise. Sin contratos, timbrado incluido | Ya definido |
| **Campaña agresiva** | Ola 1: contenido orgánico (gratis), Ola 2: lanzamiento con ruido ($200), Ola 3: ads pagados ($500-$2K/mes) | Ejecución continua |

**Próximo paso:** Definir el nombre final de la marca y arrancar con los 3 frentes en paralelo: contenido PLD/REPSE, dashboard real, y los primeros 5 hilos de Twitter.
