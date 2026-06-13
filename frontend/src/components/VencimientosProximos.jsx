const VENCIMIENTOS = [
  { id: 1, tipo: 'FIEL', icono: '🔑', cliente: 'Constructora MR SA', dias: 3, criticidad: 'critico' },
  { id: 2, tipo: 'REPSE', icono: '📋', cliente: 'Servicios Logísticos MX', dias: 5, criticidad: 'critico' },
  { id: 3, tipo: 'Declaración', icono: '📝', cliente: 'Grupo Alimentos del Sur', dias: 12, criticidad: 'alerta' },
  { id: 4, tipo: 'PLD', icono: '🛡️', cliente: 'Corporativo Norte SA', dias: 18, criticidad: 'alerta' },
  { id: 5, tipo: 'IMSS', icono: '🏥', cliente: 'Manufactura Industrial', dias: 35, criticidad: 'aviso' },
];

const CRITICIDAD_COLORS = {
  critico: 'bg-red-500/10 border-red-500/30 text-red-400',
  alerta: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  aviso: 'bg-[#1A1A1A] border-[#333333] text-[#A1A1AA]',
};

const DIAS_LABEL = {
  critico: 'text-red-400',
  alerta: 'text-amber-400',
  aviso: 'text-[#A1A1AA]',
};

export default function VencimientosProximos({ className = '' }) {
  return (
    <div className={`bg-[#141414] rounded-2xl p-6 border border-[#262626] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Vencimientos Próximos</h3>
        <button className="text-[10px] font-medium text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors">
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
