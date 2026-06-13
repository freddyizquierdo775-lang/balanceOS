export default function KpiCard({ titulo, valor, cambio, positivo, className = '' }) {
  return (
    <div className={`bg-[#141414] rounded-2xl p-5 border border-[#262626] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] transition-all duration-200 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] ${className}`}>
      <div className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-2">{titulo}</div>
      <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1.5">{valor}</div>
      <div className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
        positivo
          ? 'text-emerald-400 bg-emerald-500/10'
          : 'text-red-400 bg-red-500/10'
      }`}>
        <span>{positivo ? '▲' : '▼'}</span>
        <span>{cambio}</span>
        <span className="text-[10px] text-[#A1A1AA] font-normal ml-0.5">vs mes anterior</span>
      </div>
    </div>
  );
}
