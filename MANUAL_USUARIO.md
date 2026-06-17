# Balance OS — Manual de Usuario

> **Versión:** 0.1.0 | **Última actualización:** Junio 2026
> **URL producción:** https://balanceos-production.up.railway.app

---

## 🚀 Primer acceso

### Registro inicial
1. Abre `https://balanceos-production.up.railway.app`
2. Si es el **primer usuario del sistema**, verás el formulario de registro directamente
3. Ingresa nombre, email y contraseña (mín. 6 caracteres)
4. El primer usuario se convierte automáticamente en **admin**

### Login
1. Email + contraseña
2. Si olvidaste tu contraseña, haz clic en **"¿Olvidaste tu contraseña?"**
3. Recibirás un email con link para restablecerla (válido 15 minutos)

### Onboarding
Al primer inicio de sesión, verás un **wizard de 4 pasos**:
1. Bienvenida
2. Crear primer cliente
3. Crear primer empleado
4. Crear primer período de nómina

Puedes **saltar** cualquier paso. Solo se muestra una vez.

---

## 📋 Módulos del ERP

### 🏢 Clientes
- **Crear:** RFC, Razón Social, Régimen Fiscal obligatorios
- **Buscar:** por RFC, nombre, email o teléfono
- **Exportar:** CSV con todos los datos
- **Importar:** CSV con columnas: RFC, Razon Social, Regimen Fiscal, Email, Teléfono, Dirección
- **Vencimientos:** FIEL, REPSE, PLD con alertas por proximidad
- **Límite:** depende de tu plan (Starter=10, Pro=50, Enterprise=∞)

### 👤 Empleados
- **Crear:** RFC, CURP, nombre, salario diario, tipo contrato, tipo jornada
- **Importar CSV:** RFC, CURP, Nombre, Apellidos, Salario Diario, Tipo Contrato
- **Soft delete:** los empleados se marcan como inactivos, no se eliminan

### 💰 Nómina
1. **Crear período:** nombre + tipo (semanal/quincenal/mensual) + fechas
2. **Calcular:** genera recibos automáticos para todos los empleados activos
3. **Timbrar:** desde la vista CFDI, timbra cada recibo individualmente
4. **Descargar PDF:** botón 📄 en cada recibo
5. **Límite mensual:** Starter=50 nóminas/mes, Pro/Enterprise=ilimitado

### 🏥 IMSS
- **Calculadora SBC:** Salario Base de Cotización con factor de integración
- **Altas:** registro de nuevo empleado ante IMSS
- **Bajas:** terminación de relación laboral
- **Trámites:** modificaciones de salario, tipo de jornada
- **Resumen:** estado actual por cliente

### 📄 CFDI (Facturación Electrónica)
- **CSD:** subir archivos `.cer` y `.key` del emisor
- **Timbrar:** genera CFDI 4.0 de nómina vía PAC Finkok
- **Consultar:** verifica estatus de un CFDI por UUID
- **Cancelar:** cancela un CFDI con UUID + RFC emisor
- **Historial:** todos los CFDI timbrados con estatus

### 🧾 Facturación (Ingresos)
- **Crear factura:** cliente, conceptos, impuestos
- **Complementos de pago:** para facturas con pago diferido
- **Descargar PDF:** factura profesional con todos los detalles
- **Cancelar factura:** desde el listado

### 📊 Contabilidad
- **Catálogo de cuentas:** crear/editar/eliminar cuentas contables
- **Pólizas:** ingresos, egresos, diario con partida doble
- **Balanza de comprobación:** por mes/año

### 💸 Impuestos
- **Declaraciones:** ISR, IVA, retenciones
- **DIOT:** Declaración Informativa de Operaciones con Terceros
- **Estímulos fiscales:** configuración y asignación por cliente

### 🏦 Tesorería
- **Cuentas bancarias:** registro por cliente
- **Movimientos:** ingresos, egresos, transferencias
- **Conciliación:** match automático vs pólizas
- **Vista multi-cliente:** resumen financiero global

### 📈 Estados Financieros
- Balance General
- Estado de Resultados
- Flujo de Efectivo
- Por mes/año

### 🔍 CRM
- **Timeline:** actividad cronológica por cliente
- **Seguimientos:** registro de llamadas, reuniones, emails
- **Notas:** información libre por cliente
- **Búsqueda global:** por nombre, RFC, email

### 🛡️ REPSE
- **Registros:** alta de prestadoras de servicios especializados
- **Personal:** asignar empleados (administrativos/operativos)
- **Avisos trimestrales:** generación y seguimiento
- **Alertas de vencimiento:** 30/15/7/1 días antes

### 🔐 PLD (Prevención de Lavado de Dinero)
- **Cuestionario:** evaluación de riesgo automática (0-100 puntos)
- **Scoring:** bajo/medio/alto según metodología CNBV
- **Documentos:** identificaciones, comprobantes, actas

### ⚠️ Alertas EFOS
- **Listas negras SAT:** actualización automática desde DOF
- **Verificar cliente:** consulta si un RFC está en listas
- **Carga manual:** subir CSV con RFCs a verificar

### 🔌 API Pública
- **Documentación interactiva:** `/docs` (Swagger)
- **Endpoints públicos:** acceso a datos con autenticación

---

## 💡 Consejos para testear el ERP

### 1. Flujo completo de nómina (prueba crítica)
```
① Crear cliente → ② Crear empleado → ③ Crear período → 
④ Calcular nómina → ⑤ Timbrar CFDI → ⑥ Descargar PDF → 
⑦ Cancelar CFDI → ⑧ Verificar estatus
```
**Checklist:**
- [ ] ¿Se creó el cliente sin errores?
- [ ] ¿El empleado aparece en el listado?
- [ ] ¿El período aparece con estatus "calculado"?
- [ ] ¿Se generaron los recibos correctamente?
- [ ] ¿El timbrado devolvió un UUID?
- [ ] ¿El PDF se descarga y muestra todos los datos?
- [ ] ¿La cancelación marcó el CFDI como cancelado?

### 2. Multi-tenancy (aislamiento)
```
① Registrar Usuario A (admin@despacho1.com) → login → crear clientes
② Registrar Usuario B (admin@despacho2.com) → login
③ Verificar que Usuario B NO ve los clientes de Usuario A
```
**Checklist:**
- [ ] ¿Usuario B ve 0 clientes al entrar?
- [ ] ¿Usuario B puede crear sus propios clientes?
- [ ] ¿Los clientes de A no aparecen para B?

### 3. Plan enforcement (límites)
```
① Usar plan Starter (default) → crear 10 clientes → intentar crear el #11
② Verificar que devuelve HTTP 402 con mensaje claro
```
**Checklist:**
- [ ] ¿El endpoint `/clientes/plan-usage` muestra el uso correcto?
- [ ] ¿Al llegar al límite, la API bloquea con 402?
- [ ] ¿El mensaje sugiere hacer upgrade a Pro?

### 4. CSV Import
```
① Preparar CSV con 5 clientes (RFC, Razon Social, Regimen Fiscal, Email)
② POST /clientes/importar/csv con el archivo
③ Verificar respuesta: importados=5, errores=[]
④ Repetir con RFC duplicado → verificar error
```
**Checklist:**
- [ ] ¿Importa correctamente con headers en español?
- [ ] ¿Detecta RFCs duplicados?
- [ ] ¿Reporta errores con número de fila?

### 5. Stripe (simulación)
```
① GET /stripe/plans → verificar 3 planes
② POST /stripe/create-checkout con plan_id="starter" 
③ En modo mock (sin API key), debe devolver URL fake
```
**Checklist:**
- [ ] ¿Los 3 planes tienen precios correctos?
- [ ] ¿El checkout mock devuelve una URL?

### 6. Reset password
```
① Ir al login → clic en "¿Olvidaste tu contraseña?"
② Ingresar email registrado → enviar
③ Verificar que llega email (o se loguea en consola en modo dev)
④ Usar token para resetear contraseña vía POST /auth/reset-password
```
**Checklist:**
- [ ] ¿El mensaje "si el email existe..." aparece siempre?
- [ ] ¿Con token válido se puede cambiar la contraseña?
- [ ] ¿Con token inválido/vencido da error 400?

### 7. Onboarding wizard
```
① Limpiar localStorage: `localStorage.removeItem('onboarding_completed')`
② Hacer login → debe aparecer el wizard
③ Seguir pasos: crear cliente → empleado → período
④ Verificar que al finalizar redirige al dashboard
```
**Checklist:**
- [ ] ¿El wizard aparece solo en primer login?
- [ ] ¿Los botones "Saltar" funcionan?
- [ ] ¿Los datos creados desde el wizard persisten?

### 8. PDFs
```
① Crear un recibo de nómina → descargar PDF
② Crear una factura → descargar PDF
③ Crear un finiquito → descargar PDF
```
**Checklist:**
- [ ] ¿El PDF de nómina muestra percepciones y deducciones?
- [ ] ¿El PDF de factura muestra conceptos e IVA?
- [ ] ¿El PDF de finiquito muestra el desglose completo?
- [ ] ¿Todos los PDFs tienen header "BALANCE OS"?

### 9. PAC Finkok (si hay credenciales)
```
① Configurar FINKOK_USERNAME, FINKOK_PASSWORD en .env
② FINKOK_SANDBOX=true para pruebas
③ Timbrar un CFDI y verificar que devuelve UUID real
④ Cancelar ese CFDI
```
**Checklist:**
- [ ] ¿El timbrado con credenciales reales funciona?
- [ ] ¿El sandbox no cobra timbres?
- [ ] ¿La cancelación en sandbox funciona?

### 10. Carga y rendimiento
```
① Crear 50 clientes vía CSV import
② Navegar entre módulos (dashboard → clientes → nómina → IMSS)
③ Verificar tiempos de respuesta < 2 segundos
```
**Checklist:**
- [ ] ¿La UI no se congela con 50+ clientes?
- [ ] ¿Las tablas tienen scroll fluido?
- [ ] ¿Los KPIs del dashboard se actualizan?

---

## 🛟 Solución de problemas comunes

| Problema | Solución |
|---|---|
| "Token inválido o expirado" | La sesión expiró (8 horas). Vuelve a hacer login |
| "Límite de clientes alcanzado" | Haz upgrade a Pro desde `/pricing` o contacta a soporte |
| "RFC duplicado en este despacho" | Ya existe un cliente/empleado con ese RFC. Verifica en el listado |
| "No hay empleados activos para calcular" | Crea al menos un empleado antes de calcular nómina |
| "PAC no configurado" | Configura FINKOK_USERNAME y FINKOK_PASSWORD en variables de entorno |
| "Email no llega" | En modo desarrollo los emails se loguean en consola. En producción, verifica SMTP |

---

## 📞 Soporte

- **Email:** freddy.izquierdo@balance-consultores.com.mx
- **Dashboard:** https://balanceos-production.up.railway.app
- **API Docs:** https://balanceos-production.up.railway.app/docs
