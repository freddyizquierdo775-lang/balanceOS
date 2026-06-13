import { useState, useEffect } from 'react';
import { contabilidad } from './api';

const TIPOS_CUENTA = [
  'Activo', 'Pasivo', 'Capital', 'Ingresos', 'Gastos', 'Costos',
];

const NATURALEZAS = ['Deudora', 'Acreedora'];

const CATALOGO_EMPTY = {
  codigo: '', nombre: '', tipo: 'Activo', naturaleza: 'Deudora', padre_id: null,
};

export default function Contabilidad({ usuario }) {
  // Tabs
  const [tab, setTab] = useState('catalogo');
  const tabs = [
    { key: 'catalogo', label: 'Catálogo de Cuentas' },
    { key: 'polizas', label: 'Pólizas' },
    { key: 'balanza', label: 'Balanza' },
  ];

  // ─── Catálogo ──────────────────────────────────
  const [cuentas, setCuentas] = useState([]);
  const [loadingCuentas, setLoadingCuentas] = useState(true);
  const [showCuentaForm, setShowCuentaForm] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({ ...CATALOGO_EMPTY });
  const [cuentaErrors, setCuentaErrors] = useState({});
  const [editCuenta, setEditCuenta] = useState(null);
  const [editCuentaSaving, setEditCuentaSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [cuentaSaving, setCuentaSaving] = useState(false);

  const loadCuentas = async () => {
    setLoadingCuentas(true);
    try {
      const data = await contabilidad.listarCuentas();
      setCuentas(data);
    } catch (err) {
      console.error('Error al cargar cuentas:', err);
    } finally {
      setLoadingCuentas(false);
    }
  };

  useEffect(() => { loadCuentas(); }, []);

  const buildTree = (items, parentId = null) => {
    return items
      .filter(c => c.padre_id === parentId)
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''))
      .map(c => ({ ...c, children: buildTree(items, c.id) }));
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const validateCuenta = (data) => {
    const errs = {};
    if (!data.codigo || !data.codigo.trim()) errs.codigo = 'Código requerido';
    if (!data.nombre || data.nombre.trim().length < 2) errs.nombre = 'Nombre (mín. 2 caracteres)';
    setCuentaErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetCuentaForm = () => {
    setCuentaForm({ ...CATALOGO_EMPTY });
    setCuentaErrors({});
    setShowCuentaForm(false);
  };

  const handleCuentaSubmit = async (e) => {
    e.preventDefault();
    if (!validateCuenta(cuentaForm)) return;
    setCuentaSaving(true);
    try {
      await contabilidad.crearCuenta(cuentaForm);
      resetCuentaForm();
      loadCuentas();
    } catch (err) {
      setCuentaErrors({ general: err.message });
    } finally {
      setCuentaSaving(false);
    }
  };

  const guardarEditCuenta = async (e) => {
    e.preventDefault();
    if (!validateCuenta(editCuenta)) return;
    setEditCuentaSaving(true);
    try {
      const payload = {
        codigo: editCuenta.codigo,
        nombre: editCuenta.nombre,
        tipo: editCuenta.tipo,
        naturaleza: editCuenta.naturaleza,
        activa: editCuenta.activa,
        padre_id: editCuenta.padre_id,
      };
      await contabilidad.actualizarCuenta(editCuenta.id, payload);
      setEditCuenta(null);
      loadCuentas();
    } catch (err) {
      setCuentaErrors({ general: err.message });
    } finally {
      setEditCuentaSaving(false);
    }
  };

  const desactivarCuenta = async (id) => {
    if (!window.confirm('¿Desactivar esta cuenta?')) return;
    try {
      await contabilidad.eliminarCuenta(id);
      loadCuentas();
    } catch (err) {
      alert(err.message);
    }
  };

  const renderCuentaRow = (cuenta, depth = 0) => {
    const hasChildren = cuenta.children && cuenta.children.length > 0;
    const isExpanded = expandedIds.has(cuenta.id);

    return (
      <div key={cuenta.id}>
        <div
          className="flex items-center gap-2 py-2.5 px-2 hover:bg-slate-50 rounded-xl transition-colors group"
          style={{ paddingLeft: `${16 + depth * 24}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(cuenta.id)}
              className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-xs">
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-5 h-5 flex items-center justify-center text-slate-300 text-xs">●</span>
          )}
          <span className="font-mono text-xs text-slate-500 w-24 shrink-0">{cuenta.codigo}</span>
          <span className="text-sm font-medium text-slate-900 flex-1">{cuenta.nombre}</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full w-20 text-center">{cuenta.tipo}</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-20 text-center ${
            cuenta.naturaleza === 'Deudora' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
          }`}>{cuenta.naturaleza}</span>
          {cuenta.activa === 0 && (
            <span className="text-[10px] text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">Inactiva</span>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
            <button onClick={() => { setEditCuenta(cuenta); setCuentaErrors({}); }}
              className="text-slate-300 hover:text-slate-600 text-xs px-2 py-1 rounded-lg hover:bg-slate-100" title="Editar">✎</button>
            {cuenta.activa !== 0 && (
              <button onClick={() => desactivarCuenta(cuenta.id)}
                className="text-slate-300 hover:text-red-500 text-xs px-2 py-1 rounded-lg hover:bg-red-50" title="Desactivar">✕</button>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {cuenta.children.map(child => renderCuentaRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ─── Pólizas ──────────────────────────────────
  const now = new Date();
  const [polizaMes, setPolizaMes] = useState(now.getMonth() + 1);
  const [polizaAnio, setPolizaAnio] = useState(now.getFullYear());
  const [polizas, setPolizas] = useState([]);
  const [loadingPolizas, setLoadingPolizas] = useState(true);
  const [showPolizaForm, setShowPolizaForm] = useState(false);
  const [polizaSaving, setPolizaSaving] = useState(false);
  const [polizaForm, setPolizaForm] = useState({
    tipo: 'diario', fecha: now.toISOString().slice(0, 10), concepto: '', detalles: [],
  });
  const [polizaErrors, setPolizaErrors] = useState({});
  const [polizaDetalleInput, setPolizaDetalleInput] = useState({
    cuenta_id: '', cargo: '', abono: '', referencia: '',
  });

  const loadPolizas = async () => {
    setLoadingPolizas(true);
    try {
      const data = await contabilidad.listarPolizas(`?periodo_mes=${polizaMes}&periodo_anio=${polizaAnio}`);
      setPolizas(data);
    } catch (err) {
      console.error('Error al cargar pólizas:', err);
    } finally {
      setLoadingPolizas(false);
    }
  };

  useEffect(() => { loadPolizas(); }, [polizaMes, polizaAnio]);

  const addDetalle = () => {
    const d = polizaDetalleInput;
    if (!d.cuenta_id || !d.cargo || !d.abono) return;
    if (parseFloat(d.cargo) <= 0 && parseFloat(d.abono) <= 0) return;
    setPolizaForm(prev => ({
      ...prev,
      detalles: [...prev.detalles, { ...d, cargo: parseFloat(d.cargo), abono: parseFloat(d.abono) }],
    }));
    setPolizaDetalleInput({ cuenta_id: '', cargo: '', abono: '', referencia: '' });
  };

  const removeDetalle = (idx) => {
    setPolizaForm(prev => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== idx),
    }));
  };

  const totalCargos = polizaForm.detalles.reduce((s, d) => s + (d.cargo || 0), 0);
  const totalAbonos = polizaForm.detalles.reduce((s, d) => s + (d.abono || 0), 0);
  const balanceOk = Math.abs(totalCargos - totalAbonos) < 0.01;

  const validatePoliza = () => {
    const errs = {};
    if (!polizaForm.fecha) errs.fecha = 'Fecha requerida';
    if (!polizaForm.concepto || polizaForm.concepto.trim().length < 3) errs.concepto = 'Concepto (mín. 3 caracteres)';
    if (polizaForm.detalles.length === 0) errs.detalles = 'Agrega al menos un detalle';
    if (!balanceOk) errs.balance = 'Cargos y abonos no cuadran';
    setPolizaErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePolizaSubmit = async (e) => {
    e.preventDefault();
    if (!validatePoliza()) return;
    setPolizaSaving(true);
    try {
      await contabilidad.crearPoliza({
        tipo: polizaForm.tipo,
        fecha: polizaForm.fecha,
        concepto: polizaForm.concepto,
        periodo_mes: polizaMes,
        periodo_anio: polizaAnio,
        detalles: polizaForm.detalles,
      });
      setShowPolizaForm(false);
      setPolizaForm({ tipo: 'diario', fecha: now.toISOString().slice(0, 10), concepto: '', detalles: [] });
      setPolizaDetalleInput({ cuenta_id: '', cargo: '', abono: '', referencia: '' });
      setPolizaErrors({});
      loadPolizas();
    } catch (err) {
      setPolizaErrors({ general: err.message });
    } finally {
      setPolizaSaving(false);
    }
  };

  const eliminarPoliza = async (id) => {
    if (!window.confirm('¿Eliminar esta póliza?')) return;
    try {
      await contabilidad.eliminarPoliza(id);
      loadPolizas();
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── Balanza ──────────────────────────────────
  const [balanzaMes, setBalanzaMes] = useState(now.getMonth() + 1);
  const [balanzaAnio, setBalanzaAnio] = useState(now.getFullYear());
  const [balanza, setBalanza] = useState([]);
  const [loadingBalanza, setLoadingBalanza] = useState(false);

  const loadBalanza = async () => {
    setLoadingBalanza(true);
    try {
      const data = await contabilidad.balanza(balanzaMes, balanzaAnio);
      setBalanza(data);
    } catch (err) {
      console.error('Error al cargar balanza:', err);
    } finally {
      setLoadingBalanza(false);
    }
  };

  useEffect(() => { loadBalanza(); }, [balanzaMes, balanzaAnio]);

  const fmt = (n) => {
    if (n === null || n === undefined) return '$0.00';
    return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const meses = [
    { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
    { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
    { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
    { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
  ];
  const anios = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);

  const Logo = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-slate-300 shrink-0">
      <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
      <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
      <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
    </svg>
  );

  // ─── Render ──────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">Contabilidad</h1>
            <p className="text-sm text-slate-500 mt-1">Módulo de Contabilidad Electrónica</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-900/5 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              tab === t.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── CATÁLOGO ──────────────────────────── */}
      {tab === 'catalogo' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{cuentas.length} cuentas</p>
            <button onClick={() => { resetCuentaForm(); setShowCuentaForm(!showCuentaForm); }}
              className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-slate-800 transition-all duration-200">
              {showCuentaForm ? 'Cancelar' : '+ Nueva Cuenta'}
            </button>
          </div>

          {cuentaErrors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{cuentaErrors.general}</div>
          )}

          {/* New account form */}
          {showCuentaForm && (
            <form onSubmit={handleCuentaSubmit} className="bg-white rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Nueva Cuenta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input placeholder="Código *" value={cuentaForm.codigo} onChange={e => setCuentaForm({...cuentaForm, codigo: e.target.value})} required
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none transition-all duration-200 focus:ring-2 placeholder:text-slate-400 ${
                      cuentaErrors.codigo ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'
                    }`}/>
                  {cuentaErrors.codigo && <p className="text-xs text-red-500 mt-1">{cuentaErrors.codigo}</p>}
                </div>
                <div>
                  <input placeholder="Nombre *" value={cuentaForm.nombre} onChange={e => setCuentaForm({...cuentaForm, nombre: e.target.value})} required
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none transition-all duration-200 focus:ring-2 placeholder:text-slate-400 ${
                      cuentaErrors.nombre ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'
                    }`}/>
                  {cuentaErrors.nombre && <p className="text-xs text-red-500 mt-1">{cuentaErrors.nombre}</p>}
                </div>
                <select value={cuentaForm.tipo} onChange={e => setCuentaForm({...cuentaForm, tipo: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  {TIPOS_CUENTA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={cuentaForm.naturaleza} onChange={e => setCuentaForm({...cuentaForm, naturaleza: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  {NATURALEZAS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select value={cuentaForm.padre_id || ''} onChange={e => setCuentaForm({...cuentaForm, padre_id: e.target.value ? parseInt(e.target.value) : null})}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  <option value="">Sin padre (raíz)</option>
                  {cuentas.filter(c => c.activa !== 0).map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex gap-3">
                <button type="submit" disabled={cuentaSaving}
                  className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
                  {cuentaSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={resetCuentaForm} className="text-sm text-slate-500 px-4 py-3 hover:text-slate-700">Cancelar</button>
              </div>
            </form>
          )}

          {/* Accounts tree */}
          {loadingCuentas ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No hay cuentas registradas</div>
          ) : (
            <div className="bg-white rounded-2xl shadow-[0_6px_16px_rgba(0,0,0,0.03)] border border-slate-900/5 p-2">
              {buildTree(cuentas.filter(c => c.padre_id === null).length > 0 ? cuentas : cuentas).map(c => renderCuentaRow(c, 0))}
            </div>
          )}

          {/* Edit account modal */}
          {editCuenta && (
            <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditCuenta(null)}>
              <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-900/5" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Editar cuenta</h2>
                <form onSubmit={guardarEditCuenta} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Código</label>
                      <input value={editCuenta.codigo} onChange={e => setEditCuenta({...editCuenta, codigo: e.target.value})}
                        className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none focus:ring-2 ${cuentaErrors.codigo ? 'border-red-300' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'}`}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Nombre</label>
                      <input value={editCuenta.nombre} onChange={e => setEditCuenta({...editCuenta, nombre: e.target.value})}
                        className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none focus:ring-2 ${cuentaErrors.nombre ? 'border-red-300' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'}`}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Tipo</label>
                      <select value={editCuenta.tipo} onChange={e => setEditCuenta({...editCuenta, tipo: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                        {TIPOS_CUENTA.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Naturaleza</label>
                      <select value={editCuenta.naturaleza} onChange={e => setEditCuenta({...editCuenta, naturaleza: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                        {NATURALEZAS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Cuenta padre</label>
                      <select value={editCuenta.padre_id || ''} onChange={e => setEditCuenta({...editCuenta, padre_id: e.target.value ? parseInt(e.target.value) : null})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                        <option value="">Sin padre (raíz)</option>
                        {cuentas.filter(c => c.id !== editCuenta.id && c.activa !== 0).map(c => (
                          <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={editCuenta.activa !== 0}
                          onChange={e => setEditCuenta({...editCuenta, activa: e.target.checked ? 1 : 0})}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"/>
                        Cuenta activa
                      </label>
                    </div>
                  </div>
                  {cuentaErrors.general && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{cuentaErrors.general}</div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={editCuentaSaving}
                      className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
                      {editCuentaSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button type="button" onClick={() => setEditCuenta(null)}
                      className="text-sm text-slate-500 px-4 py-3 hover:text-slate-700">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── PÓLIZAS ────────────────────────────── */}
      {tab === 'polizas' && (
        <div>
          {/* Filter */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select value={polizaMes} onChange={e => setPolizaMes(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-slate-400">
              {meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={polizaAnio} onChange={e => setPolizaAnio(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-slate-400">
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => { setShowPolizaForm(!showPolizaForm); setPolizaErrors({}); }}
              className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-slate-800 transition-all duration-200 ml-auto">
              {showPolizaForm ? 'Cancelar' : '+ Nueva Póliza'}
            </button>
          </div>

          {polizaErrors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{polizaErrors.general}</div>
          )}

          {/* New poliza form */}
          {showPolizaForm && (
            <form onSubmit={handlePolizaSubmit} className="bg-white rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Nueva Póliza</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <select value={polizaForm.tipo} onChange={e => setPolizaForm({...polizaForm, tipo: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  <option value="diario">Diario</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                  <option value="traspaso">Traspaso</option>
                </select>
                <div>
                  <input type="date" value={polizaForm.fecha} onChange={e => setPolizaForm({...polizaForm, fecha: e.target.value})} required
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none focus:ring-2 ${
                      polizaErrors.fecha ? 'border-red-300' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'
                    }`}/>
                </div>
              </div>
              <div className="mb-4">
                <textarea placeholder="Concepto *" value={polizaForm.concepto} onChange={e => setPolizaForm({...polizaForm, concepto: e.target.value})} rows={2} required
                  className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none focus:ring-2 placeholder:text-slate-400 ${
                    polizaErrors.concepto ? 'border-red-300' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'
                  }`}/>
                {polizaErrors.concepto && <p className="text-xs text-red-500 mt-1">{polizaErrors.concepto}</p>}
              </div>

              {/* Detalles table */}
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Detalles</h3>
              {polizaForm.detalles.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 pr-2 text-slate-400 font-medium">Cuenta</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Cargo</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Abono</th>
                        <th className="text-left py-2 px-2 text-slate-400 font-medium">Referencia</th>
                        <th className="py-2 pl-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {polizaForm.detalles.map((d, i) => {
                        const cuenta = cuentas.find(c => c.id === parseInt(d.cuenta_id));
                        return (
                          <tr key={i} className="border-b border-slate-50">
                            <td className="py-2 pr-2 text-slate-900 font-medium">{cuenta ? `${cuenta.codigo} - ${cuenta.nombre}` : d.cuenta_id}</td>
                            <td className="text-right py-2 px-2 text-slate-600">{d.cargo > 0 ? fmt(d.cargo) : '-'}</td>
                            <td className="text-right py-2 px-2 text-slate-600">{d.abono > 0 ? fmt(d.abono) : '-'}</td>
                            <td className="py-2 px-2 text-slate-400">{d.referencia || '-'}</td>
                            <td className="py-2 pl-2">
                              <button type="button" onClick={() => removeDetalle(i)}
                                className="text-slate-300 hover:text-red-500 text-xs">✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td className="py-2 pr-2 text-slate-900 font-bold">Totales</td>
                        <td className="text-right py-2 px-2 text-slate-900 font-bold">{fmt(totalCargos)}</td>
                        <td className="text-right py-2 px-2 text-slate-900 font-bold">{fmt(totalAbonos)}</td>
                        <td></td><td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {polizaErrors.detalles && <p className="text-xs text-red-500 mb-2">{polizaErrors.detalles}</p>}
              {polizaErrors.balance && <p className="text-xs text-red-500 mb-2">⚠ {polizaErrors.balance} (Cargos: {fmt(totalCargos)} / Abonos: {fmt(totalAbonos)})</p>}
              {!polizaErrors.balance && polizaForm.detalles.length > 0 && !balanceOk && (
                <p className="text-xs text-amber-600 mb-2">⚠ Cargos y abonos no cuadran</p>
              )}

              {/* Add detalle row */}
              <div className="flex items-end gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex-1">
                  <select value={polizaDetalleInput.cuenta_id} onChange={e => setPolizaDetalleInput({...polizaDetalleInput, cuenta_id: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400">
                    <option value="">Seleccionar cuenta...</option>
                    {cuentas.filter(c => c.activa !== 0).map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input type="number" step="0.01" min="0" placeholder="Cargo" value={polizaDetalleInput.cargo} onChange={e => setPolizaDetalleInput({...polizaDetalleInput, cargo: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <div className="w-24">
                  <input type="number" step="0.01" min="0" placeholder="Abono" value={polizaDetalleInput.abono} onChange={e => setPolizaDetalleInput({...polizaDetalleInput, abono: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <div className="w-32">
                  <input placeholder="Referencia" value={polizaDetalleInput.referencia} onChange={e => setPolizaDetalleInput({...polizaDetalleInput, referencia: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <button type="button" onClick={addDetalle}
                  className="bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg px-3 py-2 hover:bg-slate-300 transition-colors shrink-0">+</button>
              </div>

              <div className="mt-4 flex gap-3">
                <button type="submit" disabled={polizaSaving}
                  className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
                  {polizaSaving ? 'Guardando...' : 'Guardar póliza'}
                </button>
              </div>
            </form>
          )}

          {/* Polizas list */}
          {loadingPolizas ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
          ) : polizas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No hay pólizas para este período</div>
          ) : (
            <div className="space-y-3">
              {polizas.map(p => (
                <div key={p.id} className="bg-white rounded-2xl p-5 shadow-[0_6px_16px_rgba(0,0,0,0.03)] border border-slate-900/5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold text-white bg-slate-500 px-2 py-0.5 rounded-full uppercase">{p.tipo}</span>
                      <span className="text-sm font-semibold text-slate-900">Póliza #{p.id}</span>
                      <span className="text-xs text-slate-400">{p.fecha}</span>
                    </div>
                    <button onClick={() => eliminarPoliza(p.id)}
                      className="text-slate-300 hover:text-red-500 text-xs px-2 py-1 rounded-lg hover:bg-red-50">✕</button>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{p.concepto}</p>
                  {p.detalles && p.detalles.length > 0 && (
                    <div className="text-xs text-slate-400">
                      {p.detalles.length} detalle(s) · Total cargos: {fmt(p.detalles.reduce((s, d) => s + parseFloat(d.cargo || 0), 0))} · Total abonos: {fmt(p.detalles.reduce((s, d) => s + parseFloat(d.abono || 0), 0))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── BALANZA ────────────────────────────── */}
      {tab === 'balanza' && (
        <div>
          {/* Filter */}
          <div className="flex items-center gap-3 mb-4">
            <select value={balanzaMes} onChange={e => setBalanzaMes(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-slate-400">
              {meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={balanzaAnio} onChange={e => setBalanzaAnio(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-slate-400">
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {loadingBalanza ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
          ) : balanza.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No hay datos de balanza para este período</div>
          ) : (
            <div className="bg-white rounded-2xl shadow-[0_6px_16px_rgba(0,0,0,0.03)] border border-slate-900/5 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-4 text-slate-500 font-semibold">Código</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-semibold">Nombre</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-semibold">Saldo Inicial</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-semibold">Cargos</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-semibold">Abonos</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-semibold">Saldo Final</th>
                  </tr>
                </thead>
                <tbody>
                  {balanza.map((r, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600">{r.codigo}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{r.nombre}</td>
                      <td className="text-right py-3 px-4 text-slate-700 font-mono">{fmt(r.saldo_inicial)}</td>
                      <td className="text-right py-3 px-4 text-slate-700 font-mono">{fmt(r.cargos)}</td>
                      <td className="text-right py-3 px-4 text-slate-700 font-mono">{fmt(r.abonos)}</td>
                      <td className="text-right py-3 px-4 text-slate-900 font-semibold font-mono">{fmt(r.saldo_final)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                    <td colSpan={2} className="py-3 px-4 text-slate-900 font-bold">Totales</td>
                    <td className="text-right py-3 px-4 text-slate-900 font-bold font-mono">{fmt(balanza.reduce((s, r) => s + parseFloat(r.saldo_inicial || 0), 0))}</td>
                    <td className="text-right py-3 px-4 text-slate-900 font-bold font-mono">{fmt(balanza.reduce((s, r) => s + parseFloat(r.cargos || 0), 0))}</td>
                    <td className="text-right py-3 px-4 text-slate-900 font-bold font-mono">{fmt(balanza.reduce((s, r) => s + parseFloat(r.abonos || 0), 0))}</td>
                    <td className="text-right py-3 px-4 text-slate-900 font-bold font-mono">{fmt(balanza.reduce((s, r) => s + parseFloat(r.saldo_final || 0), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
