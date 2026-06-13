import { useState, useEffect } from 'react';
import { clientes } from './api';

const ESTATUS_COLORS = {
  activo: 'bg-emerald-500',
  inactivo: 'bg-slate-400',
  prospecto: 'bg-amber-500',
  en_proceso: 'bg-blue-500',
};

const ESTATUS_LABEL = {
  activo: 'Activos',
  inactivo: 'Inactivos',
  prospecto: 'Prospectos',
  en_proceso: 'En proceso',
};

const CRITICIDAD = {
  critico: { bg: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500', label: 'Crítico' },
  alerta: { bg: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500', label: 'Próximo' },
  aviso: { bg: 'bg-sky-50 border-sky-200 text-sky-700', dot: 'bg-sky-500', label: 'Aviso' },
};

const TIPO_ICON = {
  fiel: '🔑',
  repse: '📋',
  pld: '🛡️',
};

export default function Dashboard({ usuario }) {
  const [stats, setStats] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diasFiltro, setDiasFiltro] = useState(90);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      clientes.stats(),
      clientes.vencimientos(diasFiltro),
    ])
      .then(([s, a]) => {
        setStats(s);
        setAlertas(a);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [diasFiltro]);

  const totalAlertas = alertas.reduce((acc, c) => acc + c.alertas.length, 0);
  const criticos = alertas.filter(c => c.alertas.some(a => a.criticidad === 'critico')).length;

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900 mb-6">Dashboard</h1>
        <div className="text-center py-12 text-slate-400 text-sm">Cargando estadísticas...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900 mb-6">Dashboard</h1>
        <div className="text-center py-12 text-slate-400 text-sm">Error al cargar estadísticas</div>
      </div>
    );
  }

  const estatusKeys = Object.keys(ESTATUS_LABEL);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Resumen de clientes — {usuario.rol === 'admin' ? 'todos los asesores' : 'mis clientes'}
        </p>
      </div>

      {/* Total card */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_6px_16px_rgba(0,0,0,0.03)] border border-slate-900/5 mb-6">
        <div className="text-center">
          <div className="text-5xl font-extrabold tracking-tight text-slate-900">{stats.total}</div>
          <div className="text-sm text-slate-400 mt-1">Total de clientes</div>
        </div>
      </div>

      {/* Per-status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {estatusKeys.map(key => (
          <div key={key} className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-slate-900/5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${ESTATUS_COLORS[key]}`}></div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{ESTATUS_LABEL[key]}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats[key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Bar chart (simple visual) */}
      {stats.total > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-[0_6px_16px_rgba(0,0,0,0.03)] border border-slate-900/5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Distribución por estatus</h3>
          <div className="flex h-6 rounded-full overflow-hidden bg-slate-100">
            {estatusKeys.map(key => {
              const count = stats[key] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div key={key}
                  className={`${ESTATUS_COLORS[key]} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                  title={`${ESTATUS_LABEL[key]}: ${count} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {estatusKeys.map(key => {
              const count = stats[key] || 0;
              if (count === 0) return null;
              const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className={`w-2 h-2 rounded-full ${ESTATUS_COLORS[key]}`}></div>
                  <span>{ESTATUS_LABEL[key]}: {count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Alertas de vencimientos ─── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-900">Alertas de vencimiento</h2>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {totalAlertas} {totalAlertas === 1 ? 'alerta' : 'alertas'}
            </span>
            {criticos > 0 && (
              <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                {criticos} {criticos === 1 ? 'crítico' : 'críticos'}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {[30, 60, 90].map(d => (
              <button key={d} onClick={() => setDiasFiltro(d)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  diasFiltro === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {d} días
              </button>
            ))}
          </div>
        </div>

        {alertas.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-slate-500">Sin alertas pendientes en los próximos {diasFiltro} días</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alertas.map(item => (
              <div key={item.cliente_id} className="bg-white rounded-2xl p-4 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm text-slate-900">{item.razon_social}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.rfc}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.alertas.map((a, i) => {
                    const c = CRITICIDAD[a.criticidad];
                    return (
                      <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${c.bg}`}>
                        <span>{TIPO_ICON[a.tipo]}</span>
                        <span>{a.label}</span>
                        <span className="opacity-60">·</span>
                        <span>{a.dias_restantes <= 0 ? 'Vencido' : `${a.dias_restantes} días`}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
