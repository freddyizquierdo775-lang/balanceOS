const MODULOS = [
  { id: 'contabilidad', nombre: 'Contabilidad Electrónica', icono: '📒', precio: '$490/mes', descripcion: 'Contabilidad electrónica completa con catálogo de cuentas y pólizas automáticas.',
    features: ['Catálogo de cuentas SAT', 'Pólizas automáticas', 'Balanza de comprobación', 'Auxiliares contables', 'Reportes financieros'] },
  { id: 'facturacion', nombre: 'Facturación CFDI 4.0', icono: '📄', precio: '$390/mes', descripcion: 'Emisión, recepción y timbrado de CFDI con complementos de pago.',
    features: ['CFDI 4.0', 'Complementos de pago', 'Nómina y recepción', 'Cancelaciones', 'Addenda'] },
  { id: 'nomina', nombre: 'Nómina + IMSS', icono: '👷', precio: '$590/mes', descripcion: 'Cálculo de nómina, timbrado, IMSS, INFONAVIT y finiquitos.',
    features: ['Nómina timbrada', 'Altas/bajas IMSS', 'SUA y SIDIMSS', 'Finiquitos', 'Aguinaldo y PTU'] },
  { id: 'repse', nombre: 'REPSE', icono: '📋', precio: '$290/mes', descripcion: 'Registro de Prestadoras de Servicios Especializados ante la STPS.',
    features: ['Registro REPSE', 'Validación trimestral', 'Reportes STPS', 'Contratos de servicio', 'Padrón activo'] },
  { id: 'pld', nombre: 'PLD', icono: '🛡️', precio: '$290/mes', descripcion: 'Prevención de Lavado de Dinero con scoring de riesgo regulatorio.',
    features: ['Scoring de riesgo', 'KYC/KYB digital', 'Reportes UIF', 'Alertas PEP', 'Matriz de riesgo'] },
  { id: 'tesoreria', nombre: 'Tesorería', icono: '🏦', precio: '$390/mes', descripcion: 'Control de ingresos, egresos y conciliación bancaria automatizada.',
    features: ['Flujo de efectivo', 'Conciliación bancaria', 'Cobranza', 'Cuentas por pagar', 'Forecast'] },
  { id: 'estados-financieros', nombre: 'Estados Financieros', icono: '📊', precio: '$290/mes', descripcion: 'Balance general, estado de resultados y métricas financieras.',
    features: ['Estado de resultados', 'Balance general', 'Flujo de efectivo', 'Razones financieras', 'Dashboard visual'] },
  { id: 'alertas-efos', nombre: 'Alertas EFOS', icono: '⚠️', precio: '$190/mes', descripcion: 'Monitoreo SAT de operaciones simuladas y validación EFOS.',
    features: ['Validación EFOS/EDOS', 'Alertas 69-B', 'Listas negras SAT', 'Reportes mensuales', 'Notificaciones'] },
];

export default function PricingCard({ moduleId, onActivate, className = '' }) {
  const mod = MODULOS.find(m => m.id === moduleId);
  if (!mod) return null;

  return (
    <div className={`relative group ${className}`}>
      {/* Glass card */}
      <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:border-slate-300/80">
        {/* Icono + Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl">{mod.icono}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {mod.precio}
          </span>
        </div>

        {/* Título + Descripción */}
        <h3 className="text-base font-semibold text-slate-900 mb-1.5">{mod.nombre}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-5">{mod.descripcion}</p>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          {mod.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <svg className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {f}
            </li>
          ))}
        </ul>

        {/* Botón */}
        <button
          onClick={() => onActivate && onActivate(mod.id)}
          className="w-full py-2.5 px-4 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all duration-200 active:scale-[0.98]"
        >
          Activar módulo
        </button>

        <p className="text-center text-[10px] text-slate-400 mt-2">Prueba gratis 14 días</p>
      </div>
    </div>
  );
}
