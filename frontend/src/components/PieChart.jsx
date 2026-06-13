const DATA = [
  { label: 'Nómina', value: 40, color: '#34d399' },
  { label: 'Renta', value: 20, color: '#2dd4bf' },
  { label: 'Servicios', value: 15, color: '#a78bfa' },
  { label: 'Insumos', value: 15, color: '#f472b6' },
  { label: 'Otros', value: 10, color: '#fbbf24' },
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
    <div className={`bg-[#141414] rounded-2xl p-6 border border-[#262626] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] ${className}`}>
      <h3 className="text-sm font-semibold text-white mb-1">Distribución de Gastos</h3>
      <p className="text-[11px] text-[#A1A1AA] mb-6">Por categoría · mes actual</p>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative flex-shrink-0">
          <div
            className="w-32 h-32 rounded-full"
            style={{ background: conicGradient }}
          />
          {/* Center hole */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-[#141414] flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold text-white leading-none">$98K</span>
              <span className="text-[9px] text-[#A1A1AA]">total</span>
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
                <span className="text-xs text-[#D4D4D8] truncate">{d.label}</span>
              </div>
              <span className="text-xs font-semibold text-white flex-shrink-0">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
