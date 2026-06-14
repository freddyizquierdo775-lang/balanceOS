import { useState, useEffect, useCallback, useRef } from 'react';
import { crm, clientes } from './api';

const TIPOS = ['general', 'imss', 'fiscal', 'nomina', 'juridico'];
const PRIORIDADES = ['alta', 'media', 'baja'];
const ESTADOS = ['pendiente', 'en_proceso', 'completado', 'cancelado'];

const estadoBadge = {
  pendiente: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  en_proceso: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  completado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  cancelado: 'bg-[#52525B] text-[#A1A1AA] border-[#52525B]/30',
};

const prioridadBadge = {
  alta: 'bg-red-500/10 text-red-400',
  media: 'bg-amber-500/10 text-amber-400',
  baja: 'bg-[#52525B] text-[#A1A1AA]',
};

const tipoColor = {
  general: '#A1A1AA',
  imss: '#10B981',
  fiscal: '#F59E0B',
  nomina: '#EF4444',
  juridico: '#3B82F6',
};

export default function CRM({ usuario }) {
  const [tab, setTab] = useState('timeline');
  const [clientesLista, setClientesLista] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);

  // ─── Data states ──────────────────────────────────
  const [timeline, setTimeline] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState({ timeline: false, seg: false, notas: false });

  // ─── Forms ────────────────────────────────────────
  const [showSeguimientoForm, setShowSeguimientoForm] = useState(false);
  const [showNotaForm, setShowNotaForm] = useState(false);
  const [segForm, setSegForm] = useState({ titulo: '', descripcion: '', tipo: 'general', prioridad: 'media', fecha_limite: '' });
  const [notaForm, setNotaForm] = useState({ titulo: '', contenido: '' });
  const [saving, setSaving] = useState(false);

  // ─── Load clients ──────────────────────────────────
  useEffect(() => {
    clientes.listar().then(setClientesLista).catch(() => {});
  }, []);

  // ─── Load timeline ─────────────────────────────────
  const loadTimeline = useCallback(async () => {
    setLoading(p => ({ ...p, timeline: true }));
    try {
      const data = await crm.timeline(selectedCliente?.id || '');
      setTimeline(data || []);
    } catch { setTimeline([]); }
    finally { setLoading(p => ({ ...p, timeline: false })); }
  }, [selectedCliente]);

  // ─── Load seguimientos ─────────────────────────────
  const loadSeguimientos = useCallback(async () => {
    setLoading(p => ({ ...p, seg: true }));
    try {
      const params = new URLSearchParams();
      if (selectedCliente) params.append('cliente_id', selectedCliente.id);
      const data = await crm.listarSeguimientos(`?${params.toString()}`);
      setSeguimientos(data || []);
    } catch { setSeguimientos([]); }
    finally { setLoading(p => ({ ...p, seg: false })); }
  }, [selectedCliente]);

  // ─── Load notas ────────────────────────────────────
  const loadNotas = useCallback(async () => {
    setLoading(p => ({ ...p, notas: true }));
    try {
      const data = await crm.listarNotas(selectedCliente?.id || '');
      setNotas(data || []);
    } catch { setNotas([]); }
    finally { setLoading(p => ({ ...p, notas: false })); }
  }, [selectedCliente]);

  // ─── Reload on client change ──────────────────────
  useEffect(() => { loadTimeline(); loadSeguimientos(); loadNotas(); }, [loadTimeline, loadSeguimientos, loadNotas]);

  // ─── Create seguimiento ────────────────────────────
  const handleCreateSeguimiento = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await crm.crearSeguimiento({
        ...segForm,
        cliente_id: selectedCliente?.id || null,
        fecha_limite: segForm.fecha_limite || null,
      });
      setSegForm({ titulo: '', descripcion: '', tipo: 'general', prioridad: 'media', fecha_limite: '' });
      setShowSeguimientoForm(false);
      await loadSeguimientos();
      await loadTimeline();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  // ─── Update seguimiento status ─────────────────────
  const handleUpdateSeguimiento = async (id, estado) => {
    try {
      await crm.actualizarSeguimiento(id, { estado });
      await loadSeguimientos();
      await loadTimeline();
    } catch (err) { alert(err.message); }
  };

  // ─── Create nota ───────────────────────────────────
  const handleCreateNota = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await crm.crearNota({
        ...notaForm,
        cliente_id: selectedCliente?.id || null,
        modulo_origen: 'crm',
      });
      setNotaForm({ titulo: '', contenido: '' });
      setShowNotaForm(false);
      await loadNotas();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  // ─── Helpers ───────────────────────────────────────
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDateShort = (s) => s ? new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—';

  const tabs = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'seguimientos', label: 'Seguimientos' },
    { key: 'notas', label: 'Notas' },
  ];

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-6 md:px-10 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tighter text-white">CRM</h1>
            <p className="text-sm text-[#A1A1AA] mt-1">
              Seguimientos, notas y línea de tiempo {selectedCliente ? `· ${selectedCliente.razon_social}` : '· Todos los clientes'}
            </p>
          </div>
          {/* Client selector */}
          <select
            value={selectedCliente?.id || ''}
            onChange={(e) => {
              const c = clientesLista.find(x => x.id === parseInt(e.target.value));
              setSelectedCliente(c || null);
            }}
            className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#10B981] min-w-[220px]"
          >
            <option value="">Todos los clientes</option>
            {clientesLista.map(c => (
              <option key={c.id} value={c.id}>{c.razon_social}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#262626]">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-[#10B981] text-white'
                  : 'border-transparent text-[#A1A1AA] hover:text-[#D4D4D8]'
              }`}
            >
              {t.label}
              {t.key === 'seguimientos' && seguimientos.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-[#262626] px-1.5 py-0.5 rounded-full">{seguimientos.length}</span>
              )}
              {t.key === 'notas' && notas.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-[#262626] px-1.5 py-0.5 rounded-full">{notas.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ─── TIMELINE ─────────────────────────── */}
        {tab === 'timeline' && (
          <div className="space-y-4">
            {loading.timeline ? (
              <p className="text-sm text-[#A1A1AA]">Cargando...</p>
            ) : timeline.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#A1A1AA] text-sm">No hay eventos registrados</p>
                <p className="text-[#71717A] text-xs mt-1">Los eventos aparecerán cuando uses otros módulos</p>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-[#262626] space-y-5">
                {timeline.map((ev) => (
                  <div key={ev.id} className="relative">
                    {/* Dot */}
                    <div
                      className="absolute -left-[25px] top-1.5 w-3 h-3 rounded-full border-2 border-[#141414]"
                      style={{ backgroundColor: tipoColor[ev.entidad] || '#A1A1AA' }}
                    />
                    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A] text-[#A1A1AA]">
                              {ev.entidad}
                            </span>
                            <span className="text-[10px] text-[#71717A]">{fmtDate(ev.created_at)}</span>
                          </div>
                          <p className="text-sm text-white">{ev.descripcion || `${ev.accion} #${ev.entidad_id}`}</p>
                          {ev.metadata_json && (
                            <pre className="mt-2 text-[10px] text-[#71717A] bg-[#0A0A0A] rounded-lg p-2 overflow-x-auto">
                              {JSON.stringify(ev.metadata_json, null, 2)}
                            </pre>
                          )}
                        </div>
                        {ev.estado_nuevo && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${estadoBadge[ev.estado_nuevo] || 'bg-[#1A1A1A] text-[#A1A1AA]'}`}>
                            {ev.estado_nuevo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── SEGUIMIENTOS ──────────────────────── */}
        {tab === 'seguimientos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider">
                {selectedCliente ? `Seguimientos de ${selectedCliente.razon_social}` : 'Todos los seguimientos'}
              </h3>
              <button
                onClick={() => setShowSeguimientoForm(!showSeguimientoForm)}
                className="px-3 py-1.5 rounded-lg bg-[#10B981] text-black text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                + Nuevo
              </button>
            </div>

            {showSeguimientoForm && (
              <form onSubmit={handleCreateSeguimiento} className="bg-[#141414] border border-[#262626] rounded-xl p-4 mb-4 space-y-3">
                <input
                  type="text" placeholder="Título *" required
                  value={segForm.titulo} onChange={e => setSegForm(p => ({ ...p, titulo: e.target.value }))}
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10B981]"
                />
                <textarea
                  placeholder="Descripción" rows={2}
                  value={segForm.descripcion} onChange={e => setSegForm(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10B981] resize-none"
                />
                <div className="flex gap-3">
                  <select value={segForm.tipo} onChange={e => setSegForm(p => ({ ...p, tipo: e.target.value }))}
                    className="bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none">
                    {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                  <select value={segForm.prioridad} onChange={e => setSegForm(p => ({ ...p, prioridad: e.target.value }))}
                    className="bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none">
                    {PRIORIDADES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                  <input
                    type="date" value={segForm.fecha_limite}
                    onChange={e => setSegForm(p => ({ ...p, fecha_limite: e.target.value }))}
                    className="bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 rounded-lg bg-[#10B981] text-black text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button type="button" onClick={() => setShowSeguimientoForm(false)}
                    className="px-4 py-2 rounded-lg bg-[#262626] text-[#A1A1AA] text-xs hover:text-white">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {loading.seg ? (
              <p className="text-sm text-[#A1A1AA]">Cargando...</p>
            ) : seguimientos.length === 0 ? (
              <p className="text-sm text-[#71717A] text-center py-8">No hay seguimientos</p>
            ) : (
              <div className="space-y-3">
                {seguimientos.map(s => (
                  <div key={s.id} className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-white">{s.titulo}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${estadoBadge[s.estado] || ''}`}>
                          {s.estado?.replace('_', ' ') || 'pendiente'}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${prioridadBadge[s.prioridad] || ''}`}>
                          {s.prioridad}
                        </span>
                        <span className="text-[10px] text-[#71717A] bg-[#1A1A1A] px-2 py-0.5 rounded-full">{s.tipo}</span>
                      </div>
                      {s.descripcion && <p className="text-xs text-[#A1A1AA] mt-1">{s.descripcion}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-[#71717A]">
                        {s.cliente_id && clientesLista.find(c => c.id === s.cliente_id) && (
                          <span>{clientesLista.find(c => c.id === s.cliente_id).razon_social}</span>
                        )}
                        {s.fecha_limite && <span>📅 {fmtDateShort(s.fecha_limite)}</span>}
                        <span>{fmtDate(s.created_at)}</span>
                      </div>
                    </div>
                    {/* Quick status change */}
                    {s.estado !== 'completado' && (
                      <button
                        onClick={() => handleUpdateSeguimiento(s.id, 'completado')}
                        className="shrink-0 w-5 h-5 rounded border border-[#333333] flex items-center justify-center text-[#71717A] hover:border-[#10B981] hover:text-[#10B981] transition-colors"
                        title="Marcar completado"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── NOTAS ─────────────────────────────── */}
        {tab === 'notas' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider">
                {selectedCliente ? `Notas de ${selectedCliente.razon_social}` : 'Todas las notas'}
              </h3>
              <button
                onClick={() => setShowNotaForm(!showNotaForm)}
                className="px-3 py-1.5 rounded-lg bg-[#10B981] text-black text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                + Nueva
              </button>
            </div>

            {showNotaForm && (
              <form onSubmit={handleCreateNota} className="bg-[#141414] border border-[#262626] rounded-xl p-4 mb-4 space-y-3">
                <input
                  type="text" placeholder="Título *" required
                  value={notaForm.titulo} onChange={e => setNotaForm(p => ({ ...p, titulo: e.target.value }))}
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10B981]"
                />
                <textarea
                  placeholder="Contenido de la nota" rows={3}
                  value={notaForm.contenido} onChange={e => setNotaForm(p => ({ ...p, contenido: e.target.value }))}
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10B981] resize-none"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 rounded-lg bg-[#10B981] text-black text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar nota'}
                  </button>
                  <button type="button" onClick={() => setShowNotaForm(false)}
                    className="px-4 py-2 rounded-lg bg-[#262626] text-[#A1A1AA] text-xs hover:text-white">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {loading.notas ? (
              <p className="text-sm text-[#A1A1AA]">Cargando...</p>
            ) : notas.length === 0 ? (
              <p className="text-sm text-[#71717A] text-center py-8">No hay notas</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {notas.map(n => (
                  <div key={n.id} className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-white mb-1">{n.titulo}</h4>
                    {n.contenido && <p className="text-xs text-[#A1A1AA] line-clamp-3 mb-3">{n.contenido}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-[#71717A]">
                      {n.cliente_id && clientesLista.find(c => c.id === n.cliente_id) && (
                        <span className="bg-[#1A1A1A] px-2 py-0.5 rounded-full">{clientesLista.find(c => c.id === n.cliente_id).razon_social}</span>
                      )}
                      <span>{fmtDate(n.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
