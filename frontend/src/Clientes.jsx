import { useState, useEffect, useCallback, useRef } from 'react';
import { clientes, API_BASE } from './api';
import DocumentosModal from './DocumentosModal';

const ESTATUS = {
  activo: 'bg-emerald-500/20 text-emerald-400',
  inactivo: 'bg-[#262626] text-[#A1A1AA]',
  prospecto: 'bg-amber-500/20 text-amber-400',
  en_proceso: 'bg-blue-500/20 text-blue-400',
};

const ESTATUS_LABEL = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  prospecto: 'Prospecto',
  en_proceso: 'En proceso',
};

const REGIMENES = [
  { value: '601', label: 'PF Actividad Empresarial' },
  { value: '602', label: 'PF Servicios Profesionales' },
  { value: '603', label: 'PF Arrendamiento' },
  { value: '605', label: 'PF Demás Ingresos' },
  { value: '607', label: 'PM Régimen General' },
  { value: '608', label: 'PM Sin Fines de Lucro' },
];

const FORM_DEFAULTS = {
  rfc: '', razon_social: '', regimen_fiscal: '607', tipo_persona: 'moral',
  email: '', telefono: '', direccion: '', notas: '',
};

export default function Clientes({ usuario }) {
  const [lista, setLista] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ ...FORM_DEFAULTS });
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editCliente, setEditCliente] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [docModalCliente, setDocModalCliente] = useState(null);
  const searchTimer = useRef(null);

  // Debounce search: espera 300ms antes de actualizar debouncedSearch
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : '';
      const data = await clientes.listar(params);
      setLista(data);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const validateForm = (data) => {
    const errors = {};
    if (!data.rfc || !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(data.rfc.trim())) {
      errors.rfc = 'RFC inválido (12-13 caracteres)';
    }
    if (!data.razon_social || data.razon_social.trim().length < 3) {
      errors.razon_social = 'Razón social (mín. 3 caracteres)';
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Email inválido';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setForm({ ...FORM_DEFAULTS });
    setFormErrors({});
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;
    setSaving(true);
    try {
      await clientes.crear(form);
      resetForm();
      load();
    } catch (err) {
      setFormErrors({ general: err.message });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este cliente permanentemente?')) return;
    setDeleting(id);
    try {
      await clientes.eliminar(id);
      setLista(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const abrirEdicion = (cliente) => {
    setEditCliente(cliente);
    setFormErrors({});
  };

  const cerrarEdicion = () => {
    setEditCliente(null);
    setFormErrors({});
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (!validateForm(editCliente)) return;
    setEditSaving(true);
    try {
      const payload = {};
      const campos = ['rfc', 'razon_social', 'regimen_fiscal', 'tipo_persona',
        'email', 'telefono', 'direccion', 'estatus', 'notas',
        'tiene_repse', 'tiene_pld'];
      campos.forEach(c => {
        if (editCliente[c] !== undefined) payload[c] = editCliente[c];
      });
      await clientes.actualizar(editCliente.id, payload);
      setEditCliente(null);
      load();
    } catch (err) {
      setFormErrors({ general: err.message });
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Renderizado ──────────────────────────────────

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-white">Clientes</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">{lista.length} registros</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-slate-800 transition-all duration-200">
          {showForm ? 'Cancelar' : 'Nuevo cliente +'}
        </button>
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('token');
              const res = await fetch(`${API_BASE}/clientes/exportar/csv`, {
                headers: { 'Authorization': `Bearer ***` }
              });
              if (!res.ok) throw new Error('Error al exportar');
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'clientes.csv';
              a.click(); URL.revokeObjectURL(url);
            } catch (e) { alert(e.message); }
          }}
          className="text-sm text-[#A1A1AA] font-medium px-4 py-3 rounded-xl hover:bg-[#262626] hover:text-[#E5E5E5] transition-all duration-200 border border-[#333333]"
        >
          ⬇ CSV
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text" placeholder="Buscar por RFC, razón social, email o teléfono..."
          value={search}
          onChange={handleSearchChange}
          className="w-full bg-[#141414] border border-[#333333] rounded-xl p-3 text-sm outline-none focus:border-[#A1A1AA] focus:ring-2 focus:ring-white/10 transition-all duration-200 placeholder:text-[#A1A1AA]"
        />
      </div>

      {/* Form error */}
      {formErrors.general && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 mb-4">{formErrors.general}</div>
      )}

      {/* New client form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#141414] rounded-2xl p-6 mb-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
          <h2 className="text-base font-semibold text-white mb-4">Nuevo cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input placeholder="RFC *" value={form.rfc} onChange={e => setForm({...form, rfc: e.target.value.toUpperCase()})} required
                className={`w-full bg-[#1A1A1A] border rounded-xl p-3 text-sm outline-none transition-all duration-200 focus:ring-2 placeholder:text-[#A1A1AA] ${
                  formErrors.rfc ? 'border-red-500/30 focus:border-red-400 focus:ring-red-500/20' : 'border-[#262626] focus:border-emerald-500 focus:ring-emerald-500/15'
                }`}/>
              {formErrors.rfc && <p className="text-xs text-red-400 mt-1">{formErrors.rfc}</p>}
            </div>
            <div>
              <input placeholder="Razón social *" value={form.razon_social} onChange={e => setForm({...form, razon_social: e.target.value})} required
                className={`w-full bg-[#1A1A1A] border rounded-xl p-3 text-sm outline-none transition-all duration-200 focus:ring-2 placeholder:text-[#A1A1AA] ${
                  formErrors.razon_social ? 'border-red-500/30 focus:border-red-400 focus:ring-red-500/20' : 'border-[#262626] focus:border-emerald-500 focus:ring-emerald-500/15'
                }`}/>
              {formErrors.razon_social && <p className="text-xs text-red-400 mt-1">{formErrors.razon_social}</p>}
            </div>
            <select value={form.regimen_fiscal} onChange={e => setForm({...form, regimen_fiscal: e.target.value})}
              className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
              {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={form.tipo_persona} onChange={e => setForm({...form, tipo_persona: e.target.value})}
              className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
              <option value="fisica">Persona Física</option>
              <option value="moral">Persona Moral</option>
            </select>
            <div>
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className={`w-full bg-[#1A1A1A] border rounded-xl p-3 text-sm outline-none transition-all duration-200 focus:ring-2 placeholder:text-[#A1A1AA] ${
                  formErrors.email ? 'border-red-500/30 focus:border-red-400 focus:ring-red-500/20' : 'border-[#262626] focus:border-emerald-500 focus:ring-emerald-500/15'
                }`}/>
              {formErrors.email && <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>}
            </div>
            <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
              className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#A1A1AA]"/>
            <input placeholder="Dirección" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})}
              className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#A1A1AA] md:col-span-2"/>
            <textarea placeholder="Notas" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} rows={2}
              className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#A1A1AA] md:col-span-2"/>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={resetForm} className="text-sm text-[#A1A1AA] px-4 py-3 hover:text-[#E5E5E5]">Cancelar</button>
          </div>
        </form>
      )}

      {/* Edit modal */}
      {editCliente && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={cerrarEdicion}>
          <div className="bg-[#141414] rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-[#262626] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Editar cliente</h2>
            <form onSubmit={guardarEdicion} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">RFC</label>
                  <input value={editCliente.rfc} onChange={e => setEditCliente({...editCliente, rfc: e.target.value.toUpperCase()})}
                    className={`w-full bg-[#1A1A1A] border rounded-xl p-3 text-sm outline-none focus:ring-2 ${formErrors.rfc ? 'border-red-500/30' : 'border-[#262626] focus:border-emerald-500 focus:ring-emerald-500/15'}`}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Razón social</label>
                  <input value={editCliente.razon_social} onChange={e => setEditCliente({...editCliente, razon_social: e.target.value})}
                    className={`w-full bg-[#1A1A1A] border rounded-xl p-3 text-sm outline-none focus:ring-2 ${formErrors.razon_social ? 'border-red-500/30' : 'border-[#262626] focus:border-emerald-500 focus:ring-emerald-500/15'}`}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Régimen fiscal</label>
                  <select value={editCliente.regimen_fiscal} onChange={e => setEditCliente({...editCliente, regimen_fiscal: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
                    {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Tipo persona</label>
                  <select value={editCliente.tipo_persona} onChange={e => setEditCliente({...editCliente, tipo_persona: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
                    <option value="fisica">Persona Física</option>
                    <option value="moral">Persona Moral</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Email</label>
                  <input type="email" value={editCliente.email || ''} onChange={e => setEditCliente({...editCliente, email: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Teléfono</label>
                  <input value={editCliente.telefono || ''} onChange={e => setEditCliente({...editCliente, telefono: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Estatus</label>
                  <select value={editCliente.estatus} onChange={e => setEditCliente({...editCliente, estatus: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
                    {Object.entries(ESTATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#D4D4D8]">
                    <input type="checkbox" checked={editCliente.tiene_repse === 1}
                      onChange={e => setEditCliente({...editCliente, tiene_repse: e.target.checked ? 1 : 0})}
                      className="rounded border-[#71717A] text-white focus:ring-white/20"/>
                    REPSE
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#D4D4D8]">
                    <input type="checkbox" checked={editCliente.tiene_pld === 1}
                      onChange={e => setEditCliente({...editCliente, tiene_pld: e.target.checked ? 1 : 0})}
                      className="rounded border-[#71717A] text-white focus:ring-white/20"/>
                    PLD
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Dirección</label>
                  <input value={editCliente.direccion || ''} onChange={e => setEditCliente({...editCliente, direccion: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"/>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Notas</label>
                  <textarea value={editCliente.notas || ''} onChange={e => setEditCliente({...editCliente, notas: e.target.value})} rows={3}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"/>
                </div>
              </div>
              {formErrors.general && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{formErrors.general}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={editSaving}
                  className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
                  {editSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button type="button" onClick={cerrarEdicion}
                  className="text-sm text-[#A1A1AA] px-4 py-3 hover:text-[#E5E5E5]">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client list */}
      {loading ? (
        <div className="text-center py-12 text-[#A1A1AA] text-sm">Cargando...</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 text-[#A1A1AA] text-sm">
          {search ? 'Sin resultados para esta búsqueda' : 'No hay clientes registrados'}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(c => (
            <div key={c.id} className="group bg-[#141414] rounded-2xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] flex items-center justify-between hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] transition-all duration-200">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="font-semibold text-white">{c.razon_social}</span>
                  <span className="text-xs text-[#A1A1AA] font-mono">{c.rfc}</span>
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${ESTATUS[c.estatus]}`}>
                    {ESTATUS_LABEL[c.estatus] || c.estatus}
                  </span>
                  {c.tiene_repse ? <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">REPSE</span> : null}
                  {c.tiene_pld ? <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">PLD</span> : null}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#A1A1AA]">
                  {c.email && <span className="truncate">{c.email}</span>}
                  {c.telefono && <span>{c.telefono}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button onClick={() => setDocModalCliente(c)}
                  className="text-[#71717A] hover:text-emerald-400 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-[#262626]"
                  title="Documentos">
                  📄
                </button>
                <button onClick={() => abrirEdicion(c)}
                  className="text-[#71717A] hover:text-[#D4D4D8] transition-colors text-sm px-2 py-1 rounded-lg hover:bg-[#262626]">
                  ✎
                </button>
                <button onClick={() => eliminar(c.id)} disabled={deleting === c.id}
                  className="text-[#71717A] hover:text-red-400 disabled:text-[#71717A] transition-colors text-sm px-2 py-1 rounded-lg hover:bg-red-500/10">
                  {deleting === c.id ? '...' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documentos modal */}
      {docModalCliente && (
        <DocumentosModal cliente={docModalCliente} onClose={() => setDocModalCliente(null)} />
      )}
      </div>
    </div>
  );
}
