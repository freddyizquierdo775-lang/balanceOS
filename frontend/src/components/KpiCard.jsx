export default function KpiCard({ titulo, valor, cambio, positivo, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] ${className}`}>
      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">{titulo}</div>
      <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-1.5">{valor}</div>
      <div className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
        positivo
          ? 'text-emerald-600 bg-emerald-50'
          : 'text-red-500 bg-red-50'
      }`}>
        <span>{positivo ? '▲' : '▼'}</span>
        <span>{cambio}</span>
        <span className="text-[10px] text-slate-400 font-normal ml-0.5">vs mes anterior</span>
      </div>
    </div>
  );
}
