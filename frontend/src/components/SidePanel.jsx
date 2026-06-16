import React, { useState, useEffect } from 'react';
import {
  clientes, contabilidad, facturacion, nomina, imss,
  repse, pld, finiquitos, cfdi, impuestos, empleados,
  tesoreria, estadosFinancieros, alertasEfos, crm,
} from '../api';

// ─── Custom hook: fetch sidepanel data per module ────────────────────
function useSidePanelData(page) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        let result;
        switch (page) {
          case 'clientes': {
            const res = await clientes.listar();
            result = Array.isArray(res) ? res.slice(0, 8) : [];
            break;
          }
          case 'contabilidad': {
            const res = await contabilidad.listarCuentas();
            result = Array.isArray(res) ? res.slice(0, 8) : [];
            break;
          }
          case 'facturacion': {
            const res = await facturacion.listarFacturas('?limit=5');
            result = Array.isArray(res) ? res.slice(0, 5) : [];
            break;
          }
          case 'nomina': {
            const res = await nomina.listarPeriodos();
            result = Array.isArray(res) ? res.slice(0, 5) : [];
            break;
          }
          case 'imss': {
            const res = await imss.listarAltas('?estatus=pendiente&limit=8');
            result = Array.isArray(res) ? res.slice(0, 8) : [];
            break;
          }
          case 'repse': {
            const res = await repse.listarRegistros('?limit=5');
            result = Array.isArray(res) ? res.slice(0, 5) : [];
            break;
          }
          case 'pld': {
            // Fetch clients first, then their latest PLD summaries
            const cliList = await clientes.listar();
            const clients = Array.isArray(cliList) ? cliList.slice(0, 8) : [];
            const summaries = await Promise.all(
              clients.map(async (c) => {
                try {
                  return await pld.resumenCliente(c.id);
                } catch {
                  return null;
                }
              })
            );
            result = summaries
              .map((s, i) => s ? { ...s, _cliente_nombre: clients[i]?.razon_social || clients[i]?.rfc || `Cliente ${clients[i]?.id}` } : null)
              .filter(Boolean)
              .slice(0, 8);
            break;
          }
          case 'finiquitos': {
            const res = await finiquitos.listar('');
            result = Array.isArray(res) ? res.slice(0, 5) : [];
            break;
          }
          case 'cfdi': {
            const res = await cfdi.listarRecibos('');
            result = Array.isArray(res) ? res.slice(0, 5) : [];
            break;
          }
          case 'impuestos': {
            const res = await impuestos.listarDeclaraciones('?limit=8');
            result = Array.isArray(res) ? res.slice(0, 8) : [];
            break;
          }
          case 'empleados': {
            const res = await empleados.listar();
            result = Array.isArray(res) ? res.slice(0, 8) : [];
            break;
          }
          case 'tesoreria': {
            const res = await tesoreria.listarCuentas(null);
            result = Array.isArray(res) ? res.slice(0, 8) : [];
            break;
          }
          case 'estados-financieros': {
            // Requires mes/anio; fetch current month balance
            const now = new Date();
            const mes = now.getMonth() + 1;
            const anio = now.getFullYear();
            try {
              const res = await estadosFinancieros.balanceGeneral(mes, anio);
              result = res || null; // single object, not array
            } catch {
              result = null;
            }
            break;
          }
          case 'alertas-efos': {
            const res = await alertasEfos.listarAlertas();
            result = Array.isArray(res) ? res.slice(0, 8) : [];
            break;
          }
          case 'crm': {
            const res = await crm.listarSeguimientos('?limit=5');
            result = Array.isArray(res) ? res.slice(0, 5) : [];
            break;
          }
          case 'api-publica':
          case 'dashboard':
          default:
            result = null; // static content
        }
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Error al cargar datos');
          setLoading(false);
        }
      }
    }

    // Only fetch for pages that need API data
    if (['api-publica', 'dashboard'].includes(page)) {
      setData(null);
      setLoading(false);
      setError(null);
    } else {
      fetchData();
    }

    return () => { cancelled = true; };
  }, [page]);

  return { data, loading, error };
}

// ─── Global search hook ──────────────────────────────────────────────
function useSearch(query) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await crm.buscar(query);
        if (!cancelled) {
          setResults(res);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }, 400); // debounce
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, loading, error };
}

// ─── Status indicator dot colors ────────────────────────────────────
const statusDot = {
  activo: 'bg-emerald-500',
  pendiente: 'bg-amber-500',
  revision: 'bg-[#52525B]',
};

// ─── Type icons ─────────────────────────────────────────────────────
const typeIcons = {
  empresa: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
      <line x1="9" y1="6" x2="15" y2="6"/>
      <line x1="9" y1="10" x2="15" y2="10"/>
      <line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  ),
  persona: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

// ─── Skeleton loading component ─────────────────────────────────────
function Skeleton({ rows = 3 }) {
  return (
    <div className="flex flex-col gap-0.5 animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-4 h-4 rounded bg-[#262626] flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 rounded bg-[#262626] w-3/4" />
            <div className="h-2 rounded bg-[#1A1A1A] w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section title component ────────────────────────────────────────
function SectionTitle({ title, badge }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-[0.08em]">{title}</h3>
      {badge != null && (
        <span className="text-[10px] font-semibold text-[#A1A1AA] bg-[#262626] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Quick action icon component (for dashboard) ───────────────────
function QuickIcon({ icon }) {
  const icons = {
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/></>,
    dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    calc: <><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></>,
    'file-check': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></>,
  };
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[icon] || icons.users}
    </svg>
  );
}

// ─── Risk badge color ───────────────────────────────────────────────
function riskBadge(riesgo) {
  const colors = {
    'Bajo': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'Medio': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'Alto': 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return colors[riesgo] || 'bg-[#52525B] text-[#A1A1AA]';
}

// ─── Severity dot ───────────────────────────────────────────────────
function severityDot(severidad) {
  const colors = {
    alta: 'bg-red-500',
    media: 'bg-amber-500',
    baja: 'bg-emerald-500',
  };
  return colors[severidad] || 'bg-[#71717A]';
}

// ─── Helper: format currency ────────────────────────────────────────
function formatCurrency(amount) {
  if (amount == null) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return String(amount);
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Helper: format date ────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(d).substring(0, 10);
  }
}

// ─── Helper: truncate UUID ───────────────────────────────────────────
function truncateUuid(uuid) {
  if (!uuid) return '';
  return uuid.length > 20 ? uuid.substring(0, 20) + '...' : uuid;
}

// ─── No data placeholder ─────────────────────────────────────────────
function NoData() {
  return <p className="text-[11px] text-[#71717A] italic px-2">Sin datos disponibles</p>;
}

// ─── Error placeholder ───────────────────────────────────────────────
function ErrorMsg({ message }) {
  return (
    <div className="px-2 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
      <p className="text-[10px] text-red-400">{message || 'Error al cargar'}</p>
    </div>
  );
}

// ─── Contextual content per module ──────────────────────────────────
function ContextualContent({ page, searchQuery, setPage }) {
  const { data, loading, error } = useSidePanelData(page);
  const { results: searchResults, loading: searchLoading } = useSearch(searchQuery);

  // ── Global search results (overrides module content) ────────────
  if (searchQuery && searchQuery.trim().length >= 2) {
    return (
      <div>
        <SectionTitle title={`Resultados: "${searchQuery}"`} badge={searchResults && !searchLoading ? (searchResults.total || searchResults.length || 0) : null} />
        {searchLoading ? (
          <Skeleton rows={4} />
        ) : !searchResults ? (
          <NoData />
        ) : (
          <div className="flex flex-col gap-0.5">
            {(Array.isArray(searchResults) ? searchResults : searchResults.items || []).slice(0, 8).map((item, i) => (
              <div
                key={item.id || i}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
                onClick={() => {
                  if (item.tipo === 'cliente' || item.tipo === 'clientes') setPage?.('clientes');
                  else if (item.tipo === 'factura' || item.tipo === 'facturacion') setPage?.('facturacion');
                  else if (item.tipo === 'empleado' || item.tipo === 'empleados') setPage?.('empleados');
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#71717A] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{item.nombre || item.razon_social || item.label || item.descripcion || 'Sin nombre'}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">{item.tipo || item.rfc || item.entidad || ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────
  if (loading) {
    return (
      <div>
        <SectionTitle title="Cargando..." />
        <Skeleton rows={4} />
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────
  if (error) {
    return (
      <div>
        <SectionTitle title="Error" />
        <ErrorMsg message={error} />
      </div>
    );
  }

  // ── Clientes ──────────────────────────────────────
  if (page === 'clientes') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Clientes recientes" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((client, i) => (
              <button
                key={client.id}
                onClick={() => setPage?.('clientes')}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-all duration-150 cursor-pointer hover:bg-[#1A1A1A]"
              >
                <div className="text-[#A1A1AA] flex-shrink-0">
                  {typeIcons[client.tipo_persona === 'moral' ? 'empresa' : 'persona'] || typeIcons.empresa}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{client.razon_social || client.nombre}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">{client.rfc}</p>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[client.estatus] || 'bg-[#71717A]'}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Contabilidad ──────────────────────────────────
  if (page === 'contabilidad') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Catálogo rápido" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((cuenta) => (
              <div
                key={cuenta.id || cuenta.clave || cuenta.codigo}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <span className="text-[10px] font-mono font-semibold text-[#A1A1AA] bg-[#262626] px-1.5 py-0.5 rounded w-12 text-center flex-shrink-0">
                  {cuenta.clave || cuenta.codigo || cuenta.id}
                </span>
                <span className="text-[12px] font-medium text-white truncate">{cuenta.nombre || cuenta.descripcion}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Facturación ───────────────────────────────────
  if (page === 'facturacion') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Facturas recientes" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((fac) => (
              <div
                key={fac.id || fac.folio}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{fac.folio || `F-${fac.id}`}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5 truncate">{fac.razon_social || fac.cliente || 'Sin cliente'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-semibold text-white">{formatCurrency(fac.total || fac.monto)}</p>
                  <p className="text-[10px] text-[#A1A1AA]">{formatDate(fac.fecha || fac.fecha_emision)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Nómina ────────────────────────────────────────
  if (page === 'nomina') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Períodos activos" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((per) => (
              <div
                key={per.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${per.estado === 'activo' || per.estatus === 'activo' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{per.nombre || `Período ${per.id}`}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">{formatDate(per.fecha_inicio || per.inicio)} → {formatDate(per.fecha_fin || per.fin)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── IMSS ──────────────────────────────────────────
  if (page === 'imss') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Altas pendientes" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className="w-7 h-7 rounded-full bg-[#262626] flex items-center justify-center text-[10px] font-semibold text-[#D4D4D8] flex-shrink-0">
                  {(t.nombre_completo || t.nombre || 'T').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{t.nombre_completo || t.nombre}</p>
                  <p className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">NSS {t.nss}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── REPSE ─────────────────────────────────────────
  if (page === 'repse') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Registros REPSE" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{r.folio || `REP-${r.id}`}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5 truncate">{r.razon_social || r.empresa || 'Sin empresa'}</p>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.estatus === 'vigente' || r.estado === 'vigente' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {r.estatus === 'vigente' || r.estado === 'vigente' ? 'Vigente' : 'Por renovar'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── PLD ───────────────────────────────────────────
  if (page === 'pld') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Evaluaciones PLD" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((e, i) => (
              <div
                key={e.cliente_id || i}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <span className="text-[12px] font-medium text-white truncate">{e._cliente_nombre || `Cliente ${e.cliente_id}`}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${riskBadge(e.riesgo || e.nivel_riesgo)}`}>
                  {e.riesgo || e.nivel_riesgo || 'N/A'} {e.score != null ? `• ${e.score}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Finiquitos ────────────────────────────────────
  if (page === 'finiquitos') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Recientes" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((f) => (
              <div
                key={f.id}
                className="px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-white truncate">{f.nombre_empleado || f.empleado || `Trabajador ${f.empleado_id}`}</p>
                  <span className="text-[11px] font-semibold text-white flex-shrink-0 ml-2">{formatCurrency(f.total || f.monto)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[10px] text-[#A1A1AA] truncate">{f.motivo || 'Sin motivo'}</p>
                  <span className="text-[10px] text-[#A1A1AA] flex-shrink-0 ml-2">{formatDate(f.fecha_baja || f.fecha)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── CFDI ──────────────────────────────────────────
  if (page === 'cfdi') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="CFDI recientes" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((c) => (
              <div
                key={c.id}
                className="px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${c.tipo === 'Ingreso' || c.tipo === 'ingreso' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {c.tipo || 'Ingreso'}
                  </span>
                  <span className="text-[11px] font-semibold text-white">{formatCurrency(c.total || c.monto)}</span>
                </div>
                <p className="text-[9px] text-[#A1A1AA] font-mono mt-1 truncate">{truncateUuid(c.uuid || c.id)}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">{formatDate(c.fecha || c.fecha_timbrado)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Impuestos ─────────────────────────────────────
  if (page === 'impuestos') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Declaraciones" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{v.tipo || 'Declaración'}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">{v.periodo_mes}/{v.periodo_anio}</p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${v.estatus === 'pendiente' ? 'bg-amber-500/10 text-amber-400' : v.estatus === 'presentada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#52525B] text-[#A1A1AA]'}`}>
                  {v.estatus || 'pendiente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Empleados ─────────────────────────────────────
  if (page === 'empleados') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Empleados activos" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className="w-7 h-7 rounded-full bg-[#262626] flex items-center justify-center text-[10px] font-semibold text-[#D4D4D8] flex-shrink-0">
                  {(e.nombre_completo || e.nombre || 'E').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{e.nombre_completo || e.nombre}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">{e.puesto || ''}{e.area ? ` · ${e.area}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Tesorería ─────────────────────────────────────
  if (page === 'tesoreria') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Cuentas bancarias" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{c.banco || c.nombre}</p>
                  <p className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">{c.numero_cuenta || c.cuenta || `****${String(c.id).slice(-4)}`}{c.tipo ? ` · ${c.tipo}` : ''}</p>
                </div>
                <span className="text-[12px] font-semibold text-white flex-shrink-0 ml-2">{formatCurrency(c.saldo)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Estados Financieros ───────────────────────────
  if (page === 'estados-financieros') {
    const balance = data;
    if (!balance) {
      return (
        <div>
          <SectionTitle title="Balance General" />
          <NoData />
        </div>
      );
    }
    // Extract accounts from balance response
    const cuentas = balance.cuentas || balance.activo || [];
    const items = Array.isArray(cuentas) ? cuentas.slice(0, 6) : [];
    return (
      <div>
        <SectionTitle title="Balance General" badge={items.length > 0 ? items.length : null} />
        {items.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {items.map((c, i) => (
              <div
                key={c.clave || c.codigo || i}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-[12px] font-medium text-white truncate">{c.nombre || c.concepto || `Cuenta ${c.clave}`}</span>
                </div>
                <span className="text-[11px] font-semibold text-white flex-shrink-0 ml-2">{formatCurrency(c.saldo)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Alertas EFOS ──────────────────────────────────
  if (page === 'alertas-efos') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Alertas activas" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? <NoData /> : (
          <div className="flex flex-col gap-0.5">
            {list.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${severityDot(a.severidad)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white truncate">{a.descripcion || a.tipo || 'Alerta'}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                    {a.proveedores_afectados != null
                      ? `${a.proveedores_afectados} proveedor(es)`
                      : a.estatus || 'Pendiente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── API Pública ───────────────────────────────────
  if (page === 'api-publica') {
    const endpointsAPI = [
      { metodo: 'GET', ruta: '/api/v1/clientes', descripcion: 'Listar clientes' },
      { metodo: 'POST', ruta: '/api/v1/facturas', descripcion: 'Crear factura' },
      { metodo: 'GET', ruta: '/api/v1/contabilidad/polizas', descripcion: 'Listar pólizas' },
      { metodo: 'POST', ruta: '/api/v1/nomina/calcular', descripcion: 'Calcular nómina' },
      { metodo: 'GET', ruta: '/api/v1/cfdi/status', descripcion: 'Estado CFDI' },
    ];
    return (
      <div>
        <SectionTitle title="Endpoints" badge={endpointsAPI.length} />
        <div className="flex flex-col gap-0.5">
          {endpointsAPI.map((ep) => (
            <div
              key={ep.ruta}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${ep.metodo === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {ep.metodo}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-mono text-[#D4D4D8] truncate">{ep.ruta}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">{ep.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── CRM ───────────────────────────────────────────
  if (page === 'crm') {
    const list = Array.isArray(data) ? data : [];
    return (
      <div>
        <SectionTitle title="Seguimientos" badge={list.length > 0 ? list.length : null} />
        {list.length === 0 ? (
          <>
            <p className="text-[11px] text-[#A1A1AA]">Seguimientos, notas y timeline</p>
            <button onClick={() => setPage?.('crm')} className="mt-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#1A1A1A] text-[11px] text-[#D4D4D8] transition-colors">
              Ver timeline completo →
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-0.5">
            {list.map((s) => (
              <div
                key={s.id}
                className="px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
              >
                <p className="text-[12px] font-medium text-white truncate">{s.titulo || s.asunto || 'Seguimiento'}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">{formatDate(s.fecha || s.fecha_creacion)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Dashboard (default) ──────────────────────────
  const accesosRapidos = [
    { id: 'clientes', label: 'Clientes', icon: 'users' },
    { id: 'contabilidad', label: 'Contabilidad', icon: 'book' },
    { id: 'facturacion', label: 'Facturación', icon: 'receipt' },
    { id: 'nomina', label: 'Nómina', icon: 'dollar' },
    { id: 'impuestos', label: 'Impuestos', icon: 'calc' },
    { id: 'cfdi', label: 'CFDI', icon: 'file-check' },
  ];
  return (
    <div>
      <SectionTitle title="Accesos rápidos" badge={accesosRapidos.length} />
      <div className="flex flex-wrap gap-1.5">
        {accesosRapidos.map((acc) => (
          <button
            key={acc.id}
            onClick={() => setPage?.(acc.id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-[11px] font-medium text-[#D4D4D8] transition-all duration-150 cursor-pointer"
          >
            <span className="text-[#A1A1AA] flex-shrink-0">
              <QuickIcon icon={acc.icon} />
            </span>
            {acc.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-menu navigation maps ───────────────────────────────────────
const subMenuMap = {
  'clientes': ['Todos', 'Activos', 'Prospectos', 'Vencimientos'],
  'contabilidad': ['Catálogo', 'Pólizas', 'Balanza'],
  'facturacion': ['Facturas', 'Complementos', 'Canceladas'],
  'nomina': ['Períodos', 'Recibos', 'Cálculo'],
  'imss': ['Calculadora', 'Altas', 'Bajas', 'Trámites', 'Riesgos', 'Resumen'],
  'repse': ['Registros', 'Personal', 'Avisos'],
  'pld': ['Cuestionarios', 'Documentos', 'Verificaciones'],
  'finiquitos': ['Buscador', 'Cálculo', 'Historial'],
  'cfdi': ['Timbrado', 'Historial', 'CSD'],
  'impuestos': ['Calculadora', 'Declaraciones', 'DIOT', 'Estímulos'],
  'empleados': ['Activos', 'Historial', 'Altas/Bajas'],
  'tesoreria': ['Cuentas', 'Movimientos', 'Conciliación'],
  'estados-financieros': ['Balance', 'Resultados', 'Flujo Efectivo'],
  'alertas-efos': ['Panel', 'Verificar', 'Carga CSV'],
  'api-publica': ['Endpoints', 'Documentación'],
  'crm': ['Timeline', 'Seguimientos', 'Notas'],
  'dashboard': ['Resumen', 'KPIs', 'Actividad'],
};

// ─── Badges for sub-menu items (pending counts, etc.) ─────────────
const subMenuBadges = {
  'imss': { 'Altas': 3, 'Bajas': 1 },
};

// ─── Page display labels for sub-menu header ─────────────────────
const pageLabels = {
  'clientes': 'Clientes',
  'contabilidad': 'Contabilidad',
  'facturacion': 'Facturación',
  'nomina': 'Nómina',
  'imss': 'IMSS',
  'repse': 'REPSE',
  'pld': 'PLD',
  'finiquitos': 'Finiquitos',
  'cfdi': 'CFDI',
  'impuestos': 'Impuestos',
  'empleados': 'Empleados',
  'tesoreria': 'Tesorería',
  'estados-financieros': 'Estados Fin.',
  'alertas-efos': 'Alertas EFOS',
  'api-publica': 'API Pública',
  'crm': 'CRM',
  'dashboard': 'Dashboard',
};

// ─── Module chips (shared across all pages) ─────────────────────────
const allModules = [
  { id: 'clientes', label: 'Clientes', active: true },
  { id: 'contabilidad', label: 'Contabilidad', active: true },
  { id: 'facturacion', label: 'Facturación', active: true },
  { id: 'nomina', label: 'Nómina', active: true },
  { id: 'imss', label: 'IMSS', active: true },
  { id: 'impuestos', label: 'Impuestos', active: true },
  { id: 'repse', label: 'REPSE', active: false },
  { id: 'pld', label: 'PLD', active: false },
  { id: 'cfdi', label: 'CFDI', active: true },
  { id: 'tesoreria', label: 'Tesorería', active: true },
  { id: 'empleados', label: 'Empleados', active: false },
  { id: 'finiquitos', label: 'Finiquitos', active: false },
  { id: 'api-publica', label: 'API', active: false },
  { id: 'crm', label: 'CRM', active: true },
];

// ─── Sub-menu navigation component ──────────────────────────────────
function SubMenu({ page, subPage, setSubPage, collapsed }) {
  const items = subMenuMap[page];
  if (!items || items.length <= 1) return null;

  const badges = subMenuBadges[page] || {};

  // ── Collapsed: icon-only mode ──────────────────
  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 items-center w-full">
        {items.map((item) => {
          const isActive = subPage === item;
          return (
            <button
              key={item}
              onClick={() => setSubPage?.(item)}
              className={`
                w-7 h-7 rounded-md flex items-center justify-center
                transition-all duration-150
                ${isActive
                  ? 'bg-[#1A1A1A] text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'text-[#71717A] hover:text-[#D4D4D8] hover:bg-[#1A1A1A]'
                }
              `}
              title={item}
            >
              <span className="text-[9px] font-bold leading-none">{item.charAt(0)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Expanded: full text with green left bar ───
  return (
    <div>
      <h3 className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-[0.08em] mb-2 px-1">
        {pageLabels[page] || page}
      </h3>
      <div className="flex flex-col">
        {items.map((item) => {
          const isActive = subPage === item;
          const badge = badges[item];
          return (
            <button
              key={item}
              onClick={() => setSubPage?.(item)}
              className={`
                flex items-center gap-2 px-3 py-1.5
                text-left transition-all duration-150 cursor-pointer
                border-l-2
                ${isActive
                  ? 'border-emerald-400 bg-[#1A1A1A] text-white'
                  : 'border-transparent text-[#A1A1AA] hover:bg-[#1A1A1A] hover:text-[#D4D4D8]'
                }
              `}
            >
              <span className="text-[12px] font-medium flex-1">{item}</span>
              {badge != null && (
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {badge} pendiente{badge !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main SidePanel component ───────────────────────────────────────
export default function SidePanel({ usuario, page, setPage, subPage, setSubPage, sidebarCollapsed, onToggleSidebar }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localCollapsed, setLocalCollapsed] = useState(sidebarCollapsed ?? false);

  // Controlled prop takes precedence over local state
  const collapsed = sidebarCollapsed !== undefined ? sidebarCollapsed : localCollapsed;
  const handleToggle = () => {
    if (onToggleSidebar) {
      onToggleSidebar(!collapsed);
    } else {
      setLocalCollapsed(!collapsed);
    }
  };

  // Effective subPage: defaults to first item in the current module's sub-menu
  const defaultSubPage = subMenuMap[page]?.[0] || null;
  const effectiveSubPage = subPage || defaultSubPage;

  return (
    <aside className={`
      h-screen
      flex flex-col
      bg-[#141414]/80 backdrop-blur-xl
      border-r border-[#262626]
      overflow-hidden
      z-[50]
      transition-all duration-300 ease-in-out
      ${collapsed ? 'w-[40px] min-w-[40px]' : 'w-[260px] min-w-[260px]'}
    `}>
      {/* ─── Toggle button ─────────────────────── */}
      <div className="flex justify-end px-1.5 pt-3 pb-1">
        <button
          onClick={handleToggle}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[#71717A] hover:text-[#D4D4D8] hover:bg-[#262626] transition-all duration-150 flex-shrink-0"
          title={collapsed ? 'Expandir panel' : 'Colapsar panel'}
        >
          {collapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>

      {/* ─── Scrollable content ─────────────────── */}
      <div className={`flex-1 overflow-y-auto flex flex-col gap-5 transition-all duration-300 ${collapsed ? 'px-1 py-2 items-center' : 'px-3 py-4'}`}>

        {/* ─── Profile compact ─────────────────── */}
        {collapsed ? (
          <button
            onClick={handleToggle}
            className="flex justify-center w-full"
            title="Expandir panel"
          >
            <div className="w-8 h-8 rounded-full bg-[#333333] flex items-center justify-center text-xs font-semibold text-[#D4D4D8] flex-shrink-0">
              {usuario?.nombre?.charAt(0) || 'U'}
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-[#333333] flex items-center justify-center text-xs font-semibold text-[#D4D4D8] flex-shrink-0">
              {usuario?.nombre?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{usuario?.nombre || 'Usuario'}</p>
              <p className="text-[10px] text-[#A1A1AA] truncate">{usuario?.email || usuario?.rol || ''}</p>
            </div>
          </div>
        )}

        {/* ─── Global search — always visible ──── */}
        {collapsed ? (
          <button
            onClick={handleToggle}
            className="flex justify-center w-full text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors"
            title="Buscar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        ) : (
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA] pointer-events-none"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full bg-[#1A1A1A] border border-[#262626]
                rounded-lg py-1.5 pl-8 pr-3
                text-xs text-white placeholder:text-[#71717A]
                outline-none focus:border-[#404040] focus:bg-[#1A1A1A]
                transition-colors duration-150
              "
            />
          </div>
        )}

        {/* ─── Sub-menu navigation (always visible) ── */}
        <SubMenu
          page={page}
          subPage={effectiveSubPage}
          setSubPage={setSubPage}
          collapsed={collapsed}
        />

        {/* ─── Contextual content per module ───── */}
        {!collapsed && (
          <ContextualContent page={page} searchQuery={searchQuery} setPage={setPage} />
        )}

        {/* ─── All modules (shared, bottom) ────── */}
        {collapsed ? (
          <button
            onClick={handleToggle}
            className="flex justify-center w-full text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors"
            title="Módulos"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-[0.08em]">Módulos</h3>
              <button
                onClick={() => setPage?.('module-settings')}
                className="w-5 h-5 rounded-md flex items-center justify-center text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#262626] transition-all duration-150"
                title="Configurar módulos"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allModules
                .filter((m) => m.active)
                .map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => setPage?.(mod.id)}
                    className={`
                      inline-flex items-center gap-1
                      px-2.5 py-1 rounded-full text-[11px] font-medium
                      transition-all duration-150 cursor-pointer
                      ${page === mod.id
                        ? 'bg-[#0A0A0A] text-white ring-1 ring-[#404040]'
                        : 'bg-[#1A1A1A] text-[#D4D4D8] hover:bg-[#262626]'
                      }
                    `}
                  >
                    {mod.label}
                  </button>
                ))}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
