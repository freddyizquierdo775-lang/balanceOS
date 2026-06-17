export const API_BASE = '';

let onUnauthorized = null; // callback to set from App

export function setOnUnauthorized(cb) {
  onUnauthorized = cb;
}

export async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;
  const headers = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    if (onUnauthorized) onUnauthorized();
    throw new Error('Sesión expirada');
  }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error del servidor');
  return data;
}

export const auth = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  registro: (data) => api('/auth/registro', { method: 'POST', body: JSON.stringify(data) }),
  me: () => api('/auth/me'),
  checkUsuarios: () => api('/auth/check-usuarios'),
  usuarios: () => api('/auth/usuarios'),
  actualizarUsuario: (id, data) => api(`/auth/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export const clientes = {
  listar: (params = '') => api(`/clientes/${params}`),
  obtener: (id) => api(`/clientes/${id}`),
  crear: (data) => api('/clientes/', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id, data) => api(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id) => api(`/clientes/${id}`, { method: 'DELETE' }),
  stats: () => api('/clientes/stats'),
  vencimientos: (dias = 90) => api(`/clientes/vencimientos?dias=${dias}`),
  exportarCsvUrl: () => `${API_BASE}/clientes/exportar/csv`,
  importarCsv: (file) => {
    const form = new FormData();
    form.append('archivo', file);
    return api('/clientes/importar/csv', { method: 'POST', body: form });
  },
};

export const documentos = {
  listar: (clienteId, tipo = '') => api(`/documentos/${clienteId}${tipo ? `?tipo=${tipo}` : ''}`),
  subir: (clienteId, archivo, tipo = 'otro', notas = '') => {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('tipo', tipo);
    form.append('notas', notas);
    return api(`/documentos/${clienteId}`, { method: 'POST', body: form });
  },
  descargarUrl: (docId) => `${API_BASE}/documentos/descargar/${docId}`,
  eliminar: (docId) => api(`/documentos/${docId}`, { method: 'DELETE' }),
};

export const imss = {
  calcular: (data) => api('/imss/calcular', { method: 'POST', body: JSON.stringify(data) }),
  factorIntegracion: (data) => api('/imss/factor-integracion', { method: 'POST', body: JSON.stringify(data) }),
  // Riesgos
  riesgos: () => api('/imss/riesgos'),
  // Altas
  listarAltas: (params = '') => api(`/imss/altas${params}`),
  crearAlta: (data) => api('/imss/altas', { method: 'POST', body: JSON.stringify(data) }),
  actualizarAlta: (id, data) => api(`/imss/altas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Bajas
  listarBajas: (params = '') => api(`/imss/bajas${params}`),
  crearBaja: (data) => api('/imss/bajas', { method: 'POST', body: JSON.stringify(data) }),
  actualizarBaja: (id, data) => api(`/imss/bajas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Trámites
  listarTramites: (params = '') => api(`/imss/tramites${params}`),
  crearTramite: (data) => api('/imss/tramites', { method: 'POST', body: JSON.stringify(data) }),
  actualizarTramite: (id, data) => api(`/imss/tramites/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Resumen
  resumen: (clienteId = '') => api(`/imss/resumen${clienteId ? `?cliente_id=${clienteId}` : ''}`),
};

export const nomina = {
  crearPeriodo: (data) => api('/nomina/periodos', { method: 'POST', body: JSON.stringify(data) }),
  listarPeriodos: () => api('/nomina/periodos'),
  obtenerPeriodo: (id) => api(`/nomina/periodos/${id}`),
  calcularPeriodo: (id) => api(`/nomina/periodos/${id}/calcular`, { method: 'POST' }),
  listarRecibos: (periodoId = '') => api(`/nomina/recibos${periodoId ? `?periodo_id=${periodoId}` : ''}`),
  obtenerRecibo: (id) => api(`/nomina/recibos/${id}`),
  descargarPdfUrl: (reciboId) => `${API_BASE}/nomina/recibos/${reciboId}/pdf`,
};

export const repse = {
  crearRegistro: (data) => api('/repse/registros', { method: 'POST', body: JSON.stringify(data) }),
  listarRegistros: (params = '') => api(`/repse/registros${params}`),
  obtenerRegistro: (id) => api(`/repse/registros/${id}`),
  actualizarRegistro: (id, data) => api(`/repse/registros/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarRegistro: (id) => api(`/repse/registros/${id}`, { method: 'DELETE' }),
  crearAviso: (data) => api('/repse/avisos', { method: 'POST', body: JSON.stringify(data) }),
  listarAvisos: (registroId) => api(`/repse/avisos/${registroId}`),
  listarPersonal: (registroId) => api(`/repse/personal/${registroId}`),
  asignarPersonal: (data) => api('/repse/personal', { method: 'POST', body: JSON.stringify(data) }),
  stats: () => api('/repse/stats'),
};

export const pld = {
  crearCuestionario: (data) => api('/pld/cuestionarios', { method: 'POST', body: JSON.stringify(data) }),
  listarCuestionarios: (clienteId) => api(`/pld/cuestionarios/${clienteId}`),
  ultimoCuestionario: (clienteId) => api(`/pld/cuestionarios/ultimo/${clienteId}`),
  listarDocumentos: (clienteId) => api(`/pld/documentos/${clienteId}`),
  crearDocumento: (data) => api('/pld/documentos', { method: 'POST', body: JSON.stringify(data) }),
  verificarDocumento: (docId) => api(`/pld/documentos/${docId}/verificar`, { method: 'PUT' }),
  resumenCliente: (clienteId) => api(`/pld/resumen/${clienteId}`),
};

export const finiquitos = {
  preview: (data) => api('/finiquitos/preview', { method: 'POST', body: JSON.stringify(data) }),
  calcular: (data) => api('/finiquitos/calcular', { method: 'POST', body: JSON.stringify(data) }),
  listar: (clienteId = '') => api(`/finiquitos/${clienteId ? `?cliente_id=${clienteId}` : ''}`),
  obtener: (id) => api(`/finiquitos/${id}`),
  porEmpleado: (eid) => api(`/finiquitos/empleado/${eid}`),
  buscarTrabajador: (q) => api(`/finiquitos/buscar-trabajador?q=${encodeURIComponent(q)}`),
  datosTrabajador: (eid, fechaBaja = '') => api(`/finiquitos/trabajador/${eid}/datos${fechaBaja ? `?fecha_baja=${fechaBaja}` : ''}`),
  descargarPdfUrl: (finiquitoId) => `${API_BASE}/finiquitos/${finiquitoId}/pdf`,
};

export const cfdi = {
  registrarCsd: (data) => api('/cfdi/csd', { method: 'POST', body: JSON.stringify(data) }),
  listarCsd: () => api('/cfdi/csd'),
  timbrar: (reciboId) => api('/cfdi/timbrar', { method: 'POST', body: JSON.stringify({ recibo_id: reciboId }) }),
  listarRecibos: (estatus = '') => api(`/cfdi/recibos${estatus ? `?estatus=${estatus}` : ''}`),
  obtenerPorRecibo: (reciboId) => api(`/cfdi/recibos/${reciboId}`),
  pacStatus: () => api('/cfdi/pac-status'),
  consultar: (uuid, rfc_emisor = '') => api(`/cfdi/consultar/${uuid}${rfc_emisor ? `?rfc_emisor=${encodeURIComponent(rfc_emisor)}` : ''}`),
  cancelar: (data) => api('/cfdi/cancelar', { method: 'POST', body: JSON.stringify(data) }),
};

export const empleados = {
  listar: () => api('/empleados/'),
  obtener: (id) => api(`/empleados/${id}`),
  crear: (data) => api('/empleados/', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id, data) => api(`/empleados/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id) => api(`/empleados/${id}`, { method: 'DELETE' }),
  importarCsv: (file) => {
    const form = new FormData();
    form.append('archivo', file);
    return api('/empleados/importar/csv', { method: 'POST', body: form });
  },
};

export const contabilidad = {
  listarCuentas: () => api('/contabilidad/cuentas'),
  crearCuenta: (data) => api('/contabilidad/cuentas', { method: 'POST', body: JSON.stringify(data) }),
  actualizarCuenta: (id, data) => api(`/contabilidad/cuentas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarCuenta: (id) => api(`/contabilidad/cuentas/${id}`, { method: 'DELETE' }),
  listarPolizas: (params) => api(`/contabilidad/polizas${params}`),
  crearPoliza: (data) => api('/contabilidad/polizas', { method: 'POST', body: JSON.stringify(data) }),
  obtenerPoliza: (id) => api(`/contabilidad/polizas/${id}`),
  eliminarPoliza: (id) => api(`/contabilidad/polizas/${id}`, { method: 'DELETE' }),
  balanza: (mes, anio) => api(`/contabilidad/balanza?mes=${mes}&anio=${anio}`),
};

export const impuestos = {
  listarDeclaraciones: (params) => api(`/impuestos/declaraciones${params}`),
  crearDeclaracion: (data) => api('/impuestos/declaraciones', { method: 'POST', body: JSON.stringify(data) }),
  obtenerDeclaracion: (id) => api(`/impuestos/declaraciones/${id}`),
  calcular: (data) => api('/impuestos/calcular', { method: 'POST', body: JSON.stringify(data) }),
  calcularCompleto: (data) => api('/impuestos/calcular-completo', { method: 'POST', body: JSON.stringify(data) }),
  diot: (clienteId, mes, anio) => api(`/impuestos/diot?cliente_id=${clienteId}&mes=${mes}&anio=${anio}`),
  // Estímulos fiscales
  listarEstimulos: (activo = null) => api(`/impuestos/estimulos${activo !== null ? `?activo=${activo}` : ''}`),
  crearEstimulo: (data) => api('/impuestos/estimulos', { method: 'POST', body: JSON.stringify(data) }),
  actualizarEstimulo: (id, data) => api(`/impuestos/estimulos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarEstimulo: (id) => api(`/impuestos/estimulos/${id}`, { method: 'DELETE' }),
  seedEstimulos: () => api('/impuestos/seed-estimulos', { method: 'POST' }),
  // Cliente-estímulos
  listarEstimulosCliente: (clienteId) => api(`/impuestos/clientes/${clienteId}/estimulos`),
  asignarEstimuloCliente: (clienteId, data) => api(`/impuestos/clientes/${clienteId}/estimulos`, { method: 'POST', body: JSON.stringify(data) }),
  quitarEstimuloCliente: (clienteId, estimuloId) => api(`/impuestos/clientes/${clienteId}/estimulos/${estimuloId}`, { method: 'DELETE' }),
};

export const facturacion = {
  listarFacturas: (params) => api(`/facturacion/facturas${params}`),
  crearFactura: (data) => api('/facturacion/facturas', { method: 'POST', body: JSON.stringify(data) }),
  obtenerFactura: (id) => api(`/facturacion/facturas/${id}`),
  cancelarFactura: (id) => api(`/facturacion/facturas/${id}/cancelar`, { method: 'PUT' }),
  descargarPdfUrl: (facturaId) => `${API_BASE}/facturacion/facturas/${facturaId}/pdf`,
  listarComplementos: () => api('/facturacion/complementos-pago'),
  crearComplemento: (data) => api('/facturacion/complementos-pago', { method: 'POST', body: JSON.stringify(data) }),
};

export const tesoreria = {
  // Clientes (vista multi-cliente)
  listarClientes: () => api('/tesoreria/clientes'),
  resumen: (clienteId) => api(`/tesoreria/resumen${clienteId ? `?cliente_id=${clienteId}` : ''}`),
  // Cuentas
  listarCuentas: (clienteId) => api(`/tesoreria/cuentas${clienteId ? `?cliente_id=${clienteId}` : ''}`),
  crearCuenta: (data) => api('/tesoreria/cuentas', { method: 'POST', body: JSON.stringify(data) }),
  // Movimientos
  listarMovimientos: ({ cuentaId, clienteId, limite } = {}) => {
    const params = new URLSearchParams();
    if (cuentaId) params.append('cuenta_id', cuentaId);
    if (clienteId) params.append('cliente_id', clienteId);
    if (limite) params.append('limite', limite);
    const qs = params.toString();
    return api(`/tesoreria/movimientos${qs ? `?${qs}` : ''}`);
  },
  crearMovimiento: (data) => api('/tesoreria/movimientos', { method: 'POST', body: JSON.stringify(data) }),
  conciliar: (data) => api('/tesoreria/conciliar', { method: 'POST', body: JSON.stringify(data) }),
  estadoCuenta: (cuentaId, mes, anio) => api(`/tesoreria/estado-cuenta/${cuentaId}?mes=${mes}&anio=${anio}`),
};

export const estadosFinancieros = {
  balanceGeneral: (mes, anio) => api(`/estados-financieros/balance-general?mes=${mes}&anio=${anio}`),
  estadoResultados: (mes, anio) => api(`/estados-financieros/estado-resultados?mes=${mes}&anio=${anio}`),
  flujoEfectivo: (mes, anio) => api(`/estados-financieros/flujo-efectivo?mes=${mes}&anio=${anio}`),
};

export const alertasEfos = {
  listarListas: () => api('/alertas-efos/listas'),
  crearLista: (data) => api('/alertas-efos/listas', { method: 'POST', body: JSON.stringify(data) }),
  verificarCliente: (clienteId) => api(`/alertas-efos/verificar/${clienteId}`, { method: 'POST' }),
  verificarTodos: () => api('/alertas-efos/verificar/todos', { method: 'POST' }),
  listarAlertas: () => api('/alertas-efos/alertas'),
  resolverAlerta: (alertaId) => api(`/alertas-efos/alertas/${alertaId}/resolver`, { method: 'PUT' }),
  actualizarDesdeSAT: () => api('/alertas-efos/actualizar', { method: 'POST' }),
  cargarCSV: (tipoLista, contenido) => api(`/alertas-efos/carga-csv?tipo_lista=${encodeURIComponent(tipoLista)}&contenido=${encodeURIComponent(contenido)}`, { method: 'POST' }),
};

export const crm = {
  // Seguimientos
  listarSeguimientos: (params = '') => api(`/crm/seguimientos${params}`),
  crearSeguimiento: (data) => api('/crm/seguimientos', { method: 'POST', body: JSON.stringify(data) }),
  actualizarSeguimiento: (id, data) => api(`/crm/seguimientos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Notas
  listarNotas: (clienteId = '') => api(`/crm/notas${clienteId ? `?cliente_id=${clienteId}` : ''}`),
  crearNota: (data) => api('/crm/notas', { method: 'POST', body: JSON.stringify(data) }),
  // Timeline
  timeline: (clienteId = '', entidad = '') => api(`/crm/timeline${clienteId || entidad ? `?${clienteId ? `cliente_id=${clienteId}` : ''}${clienteId && entidad ? '&' : ''}${entidad ? `entidad=${entidad}` : ''}` : ''}`),
  // Búsqueda global
  buscar: (q) => api(`/crm/buscar?q=${encodeURIComponent(q)}`),
};

export const dashboard = {
  kpis: () => api('/dashboard/kpis'),
  actividad: (limit = 10) => api(`/dashboard/actividad?limit=${limit}`),
  graficos: () => api('/dashboard/graficos'),
  planUsage: () => api('/clientes/plan-usage'),
};

export const stripe = {
  plans: () => api('/stripe/plans'),
  createCheckout: (planId) => api('/stripe/create-checkout', { method: 'POST', body: JSON.stringify({ plan_id: planId }) }),
  subscription: () => api('/stripe/subscription'),
  portal: () => api('/stripe/portal'),
  cancel: () => api('/stripe/cancel', { method: 'POST' }),
};
