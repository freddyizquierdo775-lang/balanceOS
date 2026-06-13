import { useState, useEffect, useRef } from 'react';

const DATA = [
  { mes: 'Ene', ingresos: 120000, gastos: 82000 },
  { mes: 'Feb', ingresos: 135000, gastos: 88000 },
  { mes: 'Mar', ingresos: 148000, gastos: 95000 },
  { mes: 'Abr', ingresos: 142000, gastos: 91000 },
  { mes: 'May', ingresos: 156400, gastos: 98200 },
  { mes: 'Jun', ingresos: 168000, gastos: 102000 },
];

const MAX_VAL = 200000;

export default function BarChart({ className = '' }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`bg-white rounded-2xl p-6 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] ${className}`}>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Ingresos vs Gastos</h3>
      <p className="text-[11px] text-slate-400 mb-6">Últimos 6 meses</p>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-900" />
          <span className="text-[10px] text-slate-500 font-medium">Ingresos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-300" />
          <span className="text-[10px] text-slate-500 font-medium">Gastos</span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="flex items-end justify-between gap-1 h-48">
        {DATA.map((d, i) => {
          const ingH = (d.ingresos / MAX_VAL) * 100;
          const gasH = (d.gastos / MAX_VAL) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '160px', justifyContent: 'flex-end' }}>
                {/* Ingresos (back) */}
                <div
                  className="w-full max-w-[24px] rounded-t-sm bg-slate-900 transition-all duration-700 ease-out"
                  style={{
                    height: visible ? `${ingH}%` : '0%',
                    opacity: visible ? 1 : 0,
                  }}
                />
                {/* Gastos (front) */}
                <div
                  className="w-full max-w-[16px] rounded-t-sm bg-slate-300 transition-all duration-700 ease-out delay-150"
                  style={{
                    height: visible ? `${gasH}%` : '0%',
                    opacity: visible ? 1 : 0,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">{d.mes}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
