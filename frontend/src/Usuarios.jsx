import { useState, useEffect } from 'react';
import { auth } from './api';

const ROLES = ['admin', 'asesor', 'juridico'];
const ROL_LABEL = { admin: 'Admin', asesor: 'Asesor', juridico: 'Jurídico' };

export default function Usuarios({ usuario: currentUser }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await auth.usuarios();
      setLista(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const abrirEdicion = (u) => {
    setEditId(u.id);
    setEditForm({ nombre: u.nombre, rol: u.rol, activo: u.activo, telefono: u.telefono || '' });
    setFeedback(null);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      const orig = lista.find(u => u.id === editId);
      ['nombre', 'rol', 'activo', 'telefono'].forEach(c => {
        if (editForm[c] !== orig[c]) payload[c] = editForm[c];
      });
      if (Object.keys(payload).length === 0) {
        setFeedback({ type: 'info', msg: 'Sin cambios' });
        setEditId(null);
        return;
      }
      await auth.actualizarUsuario(editId, payload);
      setFeedback({ type: 'success', msg: 'Usuario actualizado' });
      setEditId(null);
      load();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">{lista.length} registros</p>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 text-sm rounded-xl p-3 border ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
          feedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
          'bg-sky-50 border-sky-200 text-sky-700'
        }`}>
          {feedback.msg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {lista.map(u => (
            <div key={u.id} className="bg-white rounded-2xl p-5 shadow-[0_6px_16px_rgba(0,0,0,0.03)] border border-slate-900/5">
              {editId === u.id ? (
                <form onSubmit={guardar} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Nombre</label>
                      <input value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Rol</label>
                      <select value={editForm.rol} onChange={e => setEditForm({...editForm, rol: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                        {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Teléfono</label>
                      <input value={editForm.telefono} onChange={e => setEditForm({...editForm, telefono: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={editForm.activo === 1}
                          onChange={e => setEditForm({...editForm, activo: e.target.checked ? 1 : 0})}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/20" />
                        Activo
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={saving}
                      className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button type="button" onClick={() => setEditId(null)}
                      className="text-sm text-slate-500 px-4 py-3 hover:text-slate-700">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-slate-900">{u.nombre}</span>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        u.rol === 'admin' ? 'bg-slate-900 text-white' :
                        u.rol === 'juridico' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {ROL_LABEL[u.rol] || u.rol}
                      </span>
                      {!u.activo && (
                        <span className="text-[10px] font-semibold bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Inactivo</span>
                      )}
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] text-slate-400">(tú)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{u.email}</span>
                      {u.telefono && <span>{u.telefono}</span>}
                      <span>Desde {formatDate(u.created_at)}</span>
                    </div>
                  </div>
                  {currentUser?.rol === 'admin' && (
                    <button onClick={() => abrirEdicion(u)}
                      className="text-slate-300 hover:text-slate-600 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-slate-100 shrink-0 ml-4">
                      ✎
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
