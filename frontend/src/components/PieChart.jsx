const DATA = [
  { label: 'Nómina', value: 40, color: '#1e293b' },
  { label: 'Renta', value: 20, color: '#475569' },
  { label: 'Servicios', value: 15, color: '#94a3b8' },
  { label: 'Insumos', value: 15, color: '#cbd5e1' },
  { label: 'Otros', value: 10, color: '#e2e8f0' },
];

export default function PieChart({ className = '' }) {
  // Build conic-gradient from data
  const total = DATA.reduce((acc, d) => acc + d.value, 0);
  let cumulative = 0;
  const segments = DATA.map(d => {
    const start = (cumulative / total) * 360;
    cumulative += d.value;
    const end = (cumulative / total) * 360;
    return `${d.color} ${start}deg ${end}deg`;
  });

  const conicGradient = `conic-gradient(${segments.join(', ')})`;

  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] ${className}`}>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Distribución de Gastos</h3>
      <p className="text-[11px] text-slate-400 mb-6">Por categoría · mes actual</p>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative flex-shrink-0">
          <div
            className="w-32 h-32 rounded-full"
            style={{ background: conicGradient }}
          />
          {/* Center hole */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold text-slate-900 leading-none">$98K</span>
              <span className="text-[9px] text-slate-400">total</span>
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="space-y-2 flex-1 min-w-0">
          {DATA.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-xs text-slate-600 truncate">{d.label}</span>
              </div>
              <span className="text-xs font-semibold text-slate-900 flex-shrink-0">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
