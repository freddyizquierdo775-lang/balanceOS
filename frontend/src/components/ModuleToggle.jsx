import { useState, useEffect } from 'react';

const MODULOS = [
  { id: 'contabilidad', nombre: 'Contabilidad', icono: '📒', precio: '$490/mes', descripcion: 'Contabilidad electrónica completa con catálogo de cuentas y pólizas automáticas.' },
  { id: 'facturacion', nombre: 'Facturación CFDI', icono: '📄', precio: '$390/mes', descripcion: 'Emisión, recepción y timbrado de CFDI 4.0 con complementos de pago.' },
  { id: 'nomina', nombre: 'Nómina + IMSS', icono: '👷', precio: '$590/mes', descripcion: 'Cálculo de nómina, timbrado, IMSS, INFONAVIT y finiquitos.' },
  { id: 'repse', nombre: 'REPSE', icono: '📋', precio: '$290/mes', descripcion: 'Registro de Prestadoras de Servicios Especializados ante la STPS.' },
  { id: 'pld', nombre: 'PLD', icono: '🛡️', precio: '$290/mes', descripcion: 'Prevención de Lavado de Dinero con análisis de riesgo y reportes regulatorios.' },
  { id: 'tesoreria', nombre: 'Tesorería', icono: '🏦', precio: '$390/mes', descripcion: 'Control de ingresos, egresos, conciliación bancaria y flujo de efectivo.' },
  { id: 'estados-financieros', nombre: 'Estados Financieros', icono: '📊', precio: '$290/mes', descripcion: 'Estado de resultados, balance general y ratios financieros automatizados.' },
  { id: 'alertas-efos', nombre: 'Alertas EFOS', icono: '⚠️', precio: '$190/mes', descripcion: 'Monitoreo de operaciones simuladas, alertas del SAT y validación de proveedores.' },
];

export default function ModuleToggle({ className = '' }) {
  const [activos, setActivos] = useState(() => {
    const saved = localStorage.getItem('modulos_activos');
    return saved ? JSON.parse(saved) : ['contabilidad', 'facturacion', 'nomina'];
  });

  useEffect(() => {
    localStorage.setItem('modulos_activos', JSON.stringify(activos));
    window.dispatchEvent(new Event('modulos-updated'));
  }, [activos]);

  const toggle = (id) => {
    setActivos(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <div className={`${className}`}>
      <h2 className="text-base font-semibold text-slate-900 mb-1">Módulos</h2>
      <p className="text-xs text-slate-500 mb-4">Activa o desactiva los módulos de tu plan</p>

      <div className="space-y-2">
        {MODULOS.map(mod => {
          const isActive = activos.includes(mod.id);
          return (
            <div
              key={mod.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'bg-slate-50 border-slate-900/10'
                  : 'bg-white border-slate-200/60 opacity-70 hover:opacity-90'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg flex-shrink-0">{mod.icono}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{mod.nombre}</div>
                  <div className="text-[10px] text-slate-400 truncate">{mod.descripcion}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {!isActive && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {mod.precio}
                  </span>
                )}
                <button
                  onClick={() => toggle(mod.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    isActive ? 'bg-slate-900' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                      isActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
