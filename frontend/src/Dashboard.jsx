import { useState, useEffect } from 'react';
import KpiCard from './components/KpiCard';
import { dashboard as dashboardApi, stripe as stripeApi, imss } from './api';

// ─── KPI Card with icon (extends KpiCard style) ──────────────────────
function KpiCardIcon({ titulo, valor, icono, loading, className = '' }) {
  return (
    <div
      className={`bg-[#141414] rounded-2xl p-5 border border-[#262626] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] transition-all duration-200 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.4)] ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">
          {titulo}
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#A1A1AA]">
          {icono}
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-white/[0.04] rounded-md animate-pulse" />
      ) : (
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
          {valor}
        </div>
      )}
    </div>
  );
}

// ─── SVG icons ───────────────────────────────────────────────────────
const ICONS = {
  clientes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  empleados: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  ),
  eventos: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  timbres: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="9 11 11 13 15 9" />
    </svg>
  ),
};

// ─── Activity color mapping ──────────────────────────────────────────
const ENTIDAD_COLORS = {
  cliente: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  nomina: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  factura: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  cfdi: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  imss: 'bg-red-500/10 border-red-500/30 text-red-400',
  repse: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
  pld: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  finiquito: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
  contabilidad: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
  default: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
};

function getColorClass(entidad) {
  return ENTIDAD_COLORS[entidad] || ENTIDAD_COLORS.default;
}

// ─── Relative time helper ────────────────────────────────────────────
function tiempoRelativo(isoString) {
  if (!isoString) return '';
  const ahora = new Date();
  const fecha = new Date(isoString);
  const diffMs = ahora - fecha;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHrs < 24) return `hace ${diffHrs} h`;
  if (diffDias < 7) return `hace ${diffDias} d`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// ─── Regimen label mapping ───────────────────────────────────────────
const REGIMEN_LABELS = {
  '601': 'PF Act. Empresarial',
  '602': 'PF Serv. Profesionales',
  '603': 'PF Arrendamiento',
  '605': 'PF Demás Ingresos',
  '607': 'PM Régimen General',
  '608': 'PM Sin Fines de Lucro',
};

function regimenLabel(code) {
  return REGIMEN_LABELS[code] || code;
}

// ─── Main Dashboard component ────────────────────────────────────────
export default function Dashboard({ usuario }) {
  const [kpis, setKpis] = useState(null);
  const [actividad, setActividad] = useState([]);
  const [graficos, setGraficos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animar, setAnimar] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [imssAlerts, setImssAlerts] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [kpisData, actividadData, graficosData, imssData] = await Promise.all([
          dashboardApi.kpis(),
          dashboardApi.actividad(10),
          dashboardApi.graficos(),
          imss.resumen().catch(() => null),
        ]);
        setKpis(kpisData);
        setActividad(actividadData);
        setGraficos(graficosData);
        setImssAlerts(imssData);

        // Fetch subscription (independiente, no bloquea)
        try {
          const subData = await stripeApi.subscription();
          setSubscription(subData);
        } catch (subErr) {
          console.error('Subscription fetch error:', subErr);
        } finally {
          setSubLoading(false);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setLoading(false);
        // Trigger fadeIn animation after data loads
        setTimeout(() => setAnimar(true), 50);
      }
    }
    fetchData();
  }, []);

  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-6 md:px-10 py-8">
        {/* Header */}
        <div
          className={`mb-8 transition-all duration-500 ${
            animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h1 className="text-2xl font-extrabold tracking-tighter text-white">
            Dashboard
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1 capitalize">
            {hoy}
            {usuario &&
              ` · ${
                usuario.rol === 'admin' ? 'Todos los asesores' : 'Mis clientes'
              }`}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {/* KPI Cards — 2x2 grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div
            className={`transition-all duration-500 delay-[0ms] ${
              animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <KpiCardIcon
              titulo="Clientes activos"
              valor={kpis ? kpis.clientes_activos : '—'}
              icono={ICONS.clientes}
              loading={loading}
            />
          </div>
          <div
            className={`transition-all duration-500 delay-[100ms] ${
              animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <KpiCardIcon
              titulo="Empleados"
              valor={kpis ? kpis.empleados_total : '—'}
              icono={ICONS.empleados}
              loading={loading}
            />
          </div>
          <div
            className={`transition-all duration-500 delay-[200ms] ${
              animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <KpiCardIcon
              titulo="Eventos hoy"
              valor={kpis ? kpis.eventos_hoy : '—'}
              icono={ICONS.eventos}
              loading={loading}
            />
          </div>
          <div
            className={`transition-all duration-500 delay-[300ms] ${
              animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <KpiCardIcon
              titulo="Timbres del mes"
              valor={kpis ? kpis.timbres_mes : '—'}
              icono={ICONS.timbres}
              loading={loading}
            />
          </div>
        </div>

        {/* ─── Suscripción ─────────────────────────── */}
        {!subLoading && (
          <div
            className={`mb-6 transition-all duration-500 delay-[350ms] ${
              animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {subscription && subscription.active ? (
              <div className="bg-[#141414] rounded-2xl p-5 border border-[#262626] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Plan {subscription.plan?.nombre || 'Activo'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          subscription.status === 'active' ? 'bg-[#10B981]/20 text-[#10B981]' :
                          subscription.status === 'trialing' ? 'bg-blue-500/20 text-blue-400' :
                          subscription.status === 'past_due' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-[#262626] text-[#A1A1AA]'
                        }`}>
                          {subscription.status === 'active' ? 'Activo' :
                           subscription.status === 'trialing' ? 'Prueba' :
                           subscription.status === 'past_due' ? 'Pago Pendiente' :
                           subscription.status}
                        </span>
                        {subscription.current_period_end && (
                          <span className="text-[11px] text-[#71717A]">
                            Renueva: {new Date(subscription.current_period_end).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const data = await stripeApi.portal();
                          if (data.url) window.location.href = data.url;
                        } catch (err) {
                          console.error('Portal error:', err);
                        }
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-[#333333] rounded-xl transition-all duration-200"
                    >
                      Gestionar Suscripción
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#141414] rounded-2xl p-5 border border-[#10B981]/20 bg-gradient-to-r from-[#10B981]/5 to-transparent">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Sin plan activo</p>
                      <p className="text-xs text-[#A1A1AA] mt-0.5">
                        Activa un plan para desbloquear todas las funcionalidades.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = '/pricing'}
                    className="px-4 py-2 text-xs font-bold text-[#0A0A0A] bg-[#10B981] hover:bg-[#059669] rounded-xl transition-all duration-200 active:scale-[0.98]"
                  >
                    Activa tu Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity + Distribution row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Actividad Reciente */}
          <div
            className={`bg-[#141414] rounded-2xl p-6 border border-[#262626] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] transition-all duration-500 delay-[400ms] ${
              animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <h3 className="text-sm font-semibold text-white mb-4">
              Actividad Reciente
            </h3>

            {actividad.length === 0 && !loading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center text-[#A1A1AA]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p className="text-sm text-[#A1A1AA]">Sin actividad reciente</p>
                <p className="text-xs text-[#71717A] mt-1">
                  Los eventos aparecerán aquí conforme uses el sistema
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#333333]" />

                <div className="space-y-4">
                  {actividad.map((ev, i) => (
                    <div key={ev.id || i} className="flex gap-3 relative">
                      {/* Dot */}
                      <div
                        className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 font-bold ${getColorClass(ev.entidad)}`}
                      >
                        {ev.entidad?.charAt(0).toUpperCase() || '?'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="text-[13px] font-medium text-white leading-tight">
                          {ev.descripcion || `${ev.accion} ${ev.entidad}`}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[#71717A]">
                            {ev.entidad} · {ev.accion}
                          </span>
                          <span className="text-[10px] text-[#52525B]">
                            {tiempoRelativo(ev.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Distribución de clientes por régimen */}
          <div
            className={`bg-[#141414] rounded-2xl p-6 border border-[#262626] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] transition-all duration-500 delay-[500ms] ${
              animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <h3 className="text-sm font-semibold text-white mb-4">
              Clientes por Régimen
            </h3>

            {!graficos || graficos.regimenes?.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center text-[#A1A1AA]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <p className="text-sm text-[#A1A1AA]">Sin datos de regímenes</p>
                <p className="text-xs text-[#71717A] mt-1">
                  Agrega clientes para ver la distribución
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {graficos.regimenes.map((item, i) => {
                  const total = graficos.regimenes.reduce(
                    (acc, r) => acc + r.count,
                    0
                  );
                  const pct =
                    total > 0 ? Math.round((item.count / total) * 100) : 0;
                  const barColors = [
                    'bg-emerald-400',
                    'bg-blue-400',
                    'bg-purple-400',
                    'bg-amber-400',
                    'bg-pink-400',
                    'bg-teal-400',
                  ];
                  const barColor = barColors[i % barColors.length];

                  return (
                    <div key={item.regimen}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#D4D4D8]">
                          {regimenLabel(item.regimen)}
                        </span>
                        <span className="text-xs font-semibold text-white tabular-nums">
                          {item.count}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: animar ? `${pct}%` : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* IVA por Pagar card (bottom-row KPIs) */}
        {kpis && (
          <div
            className={`mt-4 transition-all duration-500 delay-[600ms] ${
              animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#262626]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1">
                    IVA por pagar
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight text-white">
                    ${kpis.iva_por_pagar?.toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-[#71717A] mt-3">
                Pendiente de integración con motor de impuestos
              </p>
            </div>
          </div>
        )}

        {/* Alerts IMSS */}
        {imssAlerts && (imssAlerts.total_empleados_sin_alta > 0 || imssAlerts.total_riesgos_vencidos > 0) && (
          <div className="mt-4 space-y-2">
            {imssAlerts.total_empleados_sin_alta > 0 && (
              <a href="#/imss/altas"
                className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 hover:bg-red-500/15 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 text-lg">⬆️</div>
                <div>
                  <p className="text-sm font-semibold text-white">{imssAlerts.total_empleados_sin_alta} empleados sin alta IMSS</p>
                  <p className="text-xs text-[#A1A1AA]">Pendientes de registrar ante el IMSS</p>
                </div>
              </a>
            )}
            {imssAlerts.total_riesgos_vencidos > 0 && (
              <a href="#/imss/seguimiento"
                className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 hover:bg-amber-500/15 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 text-lg">⚠️</div>
                <div>
                  <p className="text-sm font-semibold text-white">{imssAlerts.total_riesgos_vencidos} riesgos de trabajo sin calificar (+30 días)</p>
                  <p className="text-xs text-[#A1A1AA]">Requieren atención urgente</p>
                </div>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
