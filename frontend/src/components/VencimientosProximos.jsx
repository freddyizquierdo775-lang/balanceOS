const VENCIMIENTOS = [
  { id: 1, tipo: 'FIEL', icono: '🔑', cliente: 'Constructora MR SA', dias: 3, criticidad: 'critico' },
  { id: 2, tipo: 'REPSE', icono: '📋', cliente: 'Servicios Logísticos MX', dias: 5, criticidad: 'critico' },
  { id: 3, tipo: 'Declaración', icono: '📝', cliente: 'Grupo Alimentos del Sur', dias: 12, criticidad: 'alerta' },
  { id: 4, tipo: 'PLD', icono: '🛡️', cliente: 'Corporativo Norte SA', dias: 18, criticidad: 'alerta' },
  { id: 5, tipo: 'IMSS', icono: '🏥', cliente: 'Manufactura Industrial', dias: 35, criticidad: 'aviso' },
];

const CRITICIDAD_COLORS = {
  critico: 'bg-red-50 border-red-200 text-red-700',
  alerta: 'bg-amber-50 border-amber-200 text-amber-700',
  aviso: 'bg-slate-50 border-slate-200 text-slate-500',
};

const DIAS_LABEL = {
  critico: 'text-red-600',
  alerta: 'text-amber-600',
  aviso: 'text-slate-400',
};

export default function VencimientosProximos({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Vencimientos Próximos</h3>
        <button className="text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
          Ver todos →
        </button>
      </div>

      <div className="space-y-2">
        {VENCIMIENTOS.map(v => (
          <div
            key={v.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${CRITICIDAD_COLORS[v.criticidad]}`}
          >
            <span className="text-base flex-shrink-0">{v.icono}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{v.tipo} · {v.cliente}</div>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className={`text-xs font-bold ${DIAS_LABEL[v.criticidad]}`}>
                {v.dias}d
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
