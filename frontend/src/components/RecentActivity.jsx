const ACTIVIDADES = [
  { id: 1, tipo: 'factura', icono: '📄', titulo: 'Factura #452 emitida', subtitulo: 'Cliente: Constructora MR SA', tiempo: 'hace 2 horas', color: 'bg-blue-500/10 border-blue-500/30' },
  { id: 2, tipo: 'cliente', icono: '👤', titulo: 'Cliente ABC agregado', subtitulo: 'RFC: ABC123456XXX', tiempo: 'hace 5 horas', color: 'bg-emerald-500/10 border-emerald-500/30' },
  { id: 3, tipo: 'nomina', icono: '💰', titulo: 'Nómina quincenal calculada', subtitulo: '12 empleados · $156,400', tiempo: 'hace 8 horas', color: 'bg-amber-500/10 border-amber-500/30' },
  { id: 4, tipo: 'pago', icono: '💳', titulo: 'Pago recibido CFDI #451', subtitulo: '$38,500 · BBVA', tiempo: 'ayer', color: 'bg-sky-500/10 border-sky-500/30' },
  { id: 5, tipo: 'alerta', icono: '⚠️', titulo: 'Alerta EFOS detectada', subtitulo: 'Proveedor en lista 69-B', tiempo: 'ayer', color: 'bg-red-500/10 border-red-500/30' },
];

export default function RecentActivity({ className = '' }) {
  return (
    <div className={`bg-[#141414] rounded-2xl p-6 border border-[#262626] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] ${className}`}>
      <h3 className="text-sm font-semibold text-white mb-4">Actividad Reciente</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#333333]" />

        <div className="space-y-4">
          {ACTIVIDADES.map((act, i) => (
            <div key={act.id} className="flex gap-3 relative">
              {/* Dot */}
              <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${act.color}`}>
                {act.icono}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="text-sm font-medium text-white">{act.titulo}</div>
                <div className="text-xs text-[#A1A1AA]">{act.subtitulo}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-0.5">{act.tiempo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
