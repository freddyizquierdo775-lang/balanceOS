import { useState, useEffect, useCallback } from 'react';
import { repse, clientes } from './api';

const ESTATUS_COLOR = {
  activo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  vencido: 'bg-red-50 text-red-700 border-red-200',
  cancelado: 'bg-slate-50 text-slate-400 border-slate-200',
  tramite: 'bg-amber-50 text-amber-700 border-amber-200',
};

const fmt = (n) => {
  if (n === null || n === undefined) return '—';
  return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtFecha = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function REPSE({ usuario }) {
  const [registros, setRegistros] = useState([]);
  const [stats, setStats] = useState(null);
  const [clientesList, setClientesList] = useState([]);
  const [empleadosList, setEmpleadosList] = useState([]);
  const [selectedReg, setSelectedReg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAviso, setShowAviso] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    cliente_id: '', numero_registro: '', fecha_registro: '',
    fecha_vencimiento: '', actividad_economica: '',
  });
  const [avisoForm, setAvisoForm] = useState({
    registro_id: '', periodo: '', total_personal: '', administrativos: '', operativos: '',
  });
  const [personalForm, setPersonalForm] = useState({
    registro_id: '', empleado_id: '', tipo: 'operativo',
  });

  const cargarTodo = useCallback(async () => {
    try {
      const [r, s, c, e] = await Promise.all([
        repse.listarRegistros(), repse.stats(),
        clientes.listar(), (await fetch('/empleados/').catch(() => ({ json: () => [] }))),
      ]);
      setRegistros(r || []);
      setStats(s);
      setClientesList(c || []);
    } catch (err) { setError(err.message); }
  }, []);

  const cargarEmpleados = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/empleados/', { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setEmpleadosList(data || []);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);
  useEffect(() => { if (showPersonal) cargarEmpleados(); }, [showPersonal, cargarEmpleados]);

  const handleCrear = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await repse.crearRegistro({
        ...form,
        fecha_registro: form.fecha_registro + 'T00:00:00',
        fecha_vencimiento: form.fecha_vencimiento + 'T00:00:00',
        cliente_id: parseInt(form.cliente_id),
      });
      setShowForm(false);
      setForm({ cliente_id: '', numero_registro: '', fecha_registro: '', fecha_vencimiento: '', actividad_economica: '' });
      await cargarTodo();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleAviso = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const op = parseInt(avisoForm.operativos) || 0;
      const ad = parseInt(avisoForm.administrativos) || 0;
      await repse.crearAviso({
        registro_id: selectedReg.id,
        periodo: avisoForm.periodo,
        total_personal: op + ad,
        administrativos: ad,
        operativos: op,
      });
      setShowAviso(false);
      const updated = await repse.obtenerRegistro(selectedReg.id);
      setSelectedReg(updated);
    } catch (err) { setError(err.message); }
  };

  const handlePersonal = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await repse.asignarPersonal({
        registro_id: selectedReg.id,
        empleado_id: parseInt(personalForm.empleado_id),
        tipo: personalForm.tipo,
      });
      setShowPersonal(false);
      const updated = await repse.obtenerRegistro(selectedReg.id);
      setSelectedReg(updated);
    } catch (err) { setError(err.message); }
  };

  const verDetalle = async (reg) => {
    try {
      const data = await repse.obtenerRegistro(reg.id);
      setSelectedReg(data);
    } catch (err) { setError(err.message); }
  };

  // Stats bar
  const renderStats = () => stats && (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {[
        { label: 'Total registros', value: stats.total_registros, color: '' },
        { label: 'Activos', value: stats.activos, color: 'text-emerald-600' },
        { label: 'Vencidos', value: stats.vencidos, color: 'text-red-600' },
        { label: 'Por vencer (30d)', value: stats.por_vencer_30d, color: 'text-amber-600' },
        { label: 'Avisos pend.', value: stats.avisos_pendientes, color: 'text-sky-600' },
      ].map(s => (
        <div key={s.label} className="bg-white rounded-xl p-3 text-center border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
          <div className={`text-xl font-extrabold ${s.color || 'text-slate-900'}`}>{s.value}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );

  // Form
  const renderForm = () => (
    <form onSubmit={handleCrear} className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-slate-900">Nuevo registro REPSE</h3>
        <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Cliente</label>
          <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} required
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
            <option value="">Seleccionar...</option>
            {clientesList.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">N° Registro</label>
          <input type="text" required value={form.numero_registro}
            onChange={e => setForm(p => ({ ...p, numero_registro: e.target.value }))}
            placeholder="REPSE-2026-XXXX" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Fecha registro</label>
          <input type="date" required value={form.fecha_registro}
            onChange={e => setForm(p => ({ ...p, fecha_registro: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Vencimiento</label>
          <input type="date" required value={form.fecha_vencimiento}
            onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />
        </div>
      </div>
      <div className="mt-4">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Actividad económica</label>
        <input type="text" value={form.actividad_economica}
          onChange={e => setForm(p => ({ ...p, actividad_economica: e.target.value }))}
          placeholder="Servicios de consultoría fiscal" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />
      </div>
      <button type="submit" disabled={loading}
        className="mt-4 bg-slate-900 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
        {loading ? 'Guardando...' : 'Crear registro REPSE'}
      </button>
    </form>
  );

  // Aviso form
  const renderAvisoForm = () => (
    <form onSubmit={handleAviso} className="bg-white rounded-2xl p-4 border border-slate-900/5 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-900">Nuevo aviso trimestral</h4>
        <button type="button" onClick={() => setShowAviso(false)} className="text-[10px] text-slate-400">Cancelar</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Período</label>
          <input type="text" value={avisoForm.periodo} onChange={e => setAvisoForm(p => ({ ...p, periodo: e.target.value }))}
            placeholder="2026-Q3" required className="w-full bg-slate-50 border rounded-xl p-2.5 text-xs outline-none focus:border-[#2E8B57]" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Admvos</label>
          <input type="number" min="0" value={avisoForm.administrativos}
            onChange={e => setAvisoForm(p => ({ ...p, administrativos: e.target.value }))}
            required className="w-full bg-slate-50 border rounded-xl p-2.5 text-xs outline-none focus:border-[#2E8B57]" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Operativos</label>
          <input type="number" min="0" value={avisoForm.operativos}
            onChange={e => setAvisoForm(p => ({ ...p, operativos: e.target.value }))}
            required className="w-full bg-slate-50 border rounded-xl p-2.5 text-xs outline-none focus:border-[#2E8B57]" />
        </div>
      </div>
      <button type="submit" className="mt-3 bg-sky-600 text-white text-xs font-semibold rounded-xl px-4 py-2 hover:bg-sky-700 transition-all">
        Guardar aviso
      </button>
    </form>
  );

  // Personal form
  const renderPersonalForm = () => (
    <form onSubmit={handlePersonal} className="bg-white rounded-2xl p-4 border border-slate-900/5 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-900">Asignar empleado</h4>
        <button type="button" onClick={() => setShowPersonal(false)} className="text-[10px] text-slate-400">Cancelar</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Empleado</label>
          <select value={personalForm.empleado_id} onChange={e => setPersonalForm(p => ({ ...p, empleado_id: e.target.value }))} required
            className="w-full bg-slate-50 border rounded-xl p-2.5 text-xs outline-none focus:border-[#2E8B57]">
            <option value="">Seleccionar...</option>
            {empleadosList.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos} ({e.rfc})</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Tipo</label>
          <select value={personalForm.tipo} onChange={e => setPersonalForm(p => ({ ...p, tipo: e.target.value }))}
            className="w-full bg-slate-50 border rounded-xl p-2.5 text-xs outline-none focus:border-[#2E8B57]">
            <option value="operativo">Operativo (especializado)</option>
            <option value="administrativo">Administrativo</option>
          </select>
        </div>
      </div>
      <button type="submit" className="mt-3 bg-sky-600 text-white text-xs font-semibold rounded-xl px-4 py-2 hover:bg-sky-700 transition-all">
        Asignar
      </button>
    </form>
  );

  // Detail panel
  const renderDetalle = () => {
    if (!selectedReg) return null;
    return (
      <div className="mt-6 bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{selectedReg.numero_registro}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Vence: {fmtFecha(selectedReg.fecha_vencimiento)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${ESTATUS_COLOR[selectedReg.estatus]}`}>{selectedReg.estatus}</span>
            <button onClick={() => setSelectedReg(null)} className="text-xs text-slate-400 hover:text-slate-600">Cerrar</button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => { setShowAviso(true); setAvisoForm(p => ({ ...p, registro_id: selectedReg.id })); }}
            className="text-[10px] font-semibold bg-sky-50 text-sky-600 px-3 py-1.5 rounded-lg hover:bg-sky-100">+ Aviso</button>
          <button onClick={() => { setShowPersonal(true); setPersonalForm(p => ({ ...p, registro_id: selectedReg.id })); }}
            className="text-[10px] font-semibold bg-sky-50 text-sky-600 px-3 py-1.5 rounded-lg hover:bg-sky-100">+ Personal</button>
        </div>

        {showAviso && renderAvisoForm()}
        {showPersonal && renderPersonalForm()}

        {/* Avisos */}
        {selectedReg.avisos?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-900 mb-2">Avisos trimestrales</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Período</th>
                  <th className="text-right py-2 px-2 text-slate-400 font-medium">Total</th>
                  <th className="text-right py-2 px-2 text-slate-400 font-medium">Admvos</th>
                  <th className="text-right py-2 px-2 text-slate-400 font-medium">Opvos</th>
                  <th className="text-right py-2 px-2 text-slate-400 font-medium">% Especializado</th>
                  <th className="text-center py-2 pl-3 text-slate-400 font-medium">Presentado</th>
                </tr></thead>
                <tbody>
                  {selectedReg.avisos.map(a => (
                    <tr key={a.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-3 text-slate-900 font-medium">{a.periodo}</td>
                      <td className="text-right py-2.5 px-2 text-slate-600">{a.total_personal}</td>
                      <td className="text-right py-2.5 px-2 text-slate-600">{a.administrativos}</td>
                      <td className="text-right py-2.5 px-2 text-slate-600">{a.operativos}</td>
                      <td className={`text-right py-2.5 px-2 font-semibold ${parseFloat(a.porcentaje_especializado) >= 70 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {a.porcentaje_especializado}%
                      </td>
                      <td className="text-center py-2.5 pl-3">{a.presentado ? '✅' : '⏳'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Personal */}
        {selectedReg.personal?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-900 mb-2">Personal asignado</h4>
            <div className="flex flex-wrap gap-2">
              {selectedReg.personal.map(p => (
                <span key={p.id} className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${
                  p.tipo === 'operativo' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  #{p.empleado_id} · {p.tipo}
                  {!p.activo && ' (inactivo)'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">REPSE</h1>
        <p className="text-sm text-slate-500 mt-1">Registro de Prestadoras de Servicios Especializados</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-6">{error}</div>}

      {renderStats()}

      {showForm && renderForm()}

      <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 overflow-hidden">
        <div className="p-6 pb-0 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Registros</h2>
          <button onClick={() => setShowForm(true)}
            className="bg-slate-900 text-white text-xs font-semibold rounded-xl px-4 py-2 hover:bg-slate-800 transition-all">
            + Nuevo registro
          </button>
        </div>

        {registros.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-slate-400">Sin registros REPSE</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">N° Registro</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Cliente</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Registro</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Vencimiento</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Estatus</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Avisos</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => verDetalle(r)}>
                    <td className="py-3.5 px-4 text-slate-900 font-medium">{r.numero_registro}</td>
                    <td className="py-3.5 px-2 text-slate-600">#{r.cliente_id}</td>
                    <td className="py-3.5 px-2 text-slate-600">{fmtFecha(r.fecha_registro)}</td>
                    <td className="py-3.5 px-2 text-slate-600">{fmtFecha(r.fecha_vencimiento)}</td>
                    <td className="py-3.5 px-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[r.estatus]}`}>{r.estatus}</span>
                    </td>
                    <td className="text-center py-3.5 px-4 text-slate-600">{r.avisos?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {renderDetalle()}

      <div className="mt-6 text-[11px] text-slate-400 text-center">
        REPSE · STPS · % mínimo especializado: 30% · Avisos trimestrales obligatorios
      </div>
      </div>
    </div>
  );
}
