import { useState, useEffect, useCallback } from 'react';
import { pld, clientes } from './api';

const RIESGO_COLOR = {
  bajo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medio: 'bg-amber-50 text-amber-700 border-amber-200',
  alto: 'bg-red-50 text-red-700 border-red-200',
};

const fmtFecha = (s) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PLD({ usuario }) {
  const [clientesList, setClientesList] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [cuestionarios, setCuestionarios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    cliente_id: '',
    ingresos_anuales: '', volumen_operaciones: '0',
    transacciones_internacionales: false, tipo_operacion: 'nacional',
    expuesto_politicamente: false, sector_riesgo_alto: false,
    origen_fondos_documentado: true, antigüedad_relacion: 0,
  });

  const cargarClientes = useCallback(async () => {
    try {
      const data = await clientes.listar();
      setClientesList(data || []);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => { cargarClientes(); }, [cargarClientes]);

  const cargarResumen = useCallback(async (clienteId) => {
    try {
      const [res, cues] = await Promise.all([
        pld.resumenCliente(clienteId),
        pld.listarCuestionarios(clienteId),
      ]);
      setResumen(res);
      setCuestionarios(cues || []);
    } catch (err) { setError(err.message); }
  }, []);

  const seleccionarCliente = async (e) => {
    const cid = parseInt(e.target.value);
    if (!cid) { setSelectedCliente(null); setResumen(null); setCuestionarios([]); return; }
    const c = clientesList.find(x => x.id === cid);
    setSelectedCliente(c);
    await cargarResumen(cid);
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await pld.crearCuestionario({
        ...form,
        cliente_id: selectedCliente.id,
        ingresos_anuales: form.ingresos_anuales,
        volumen_operaciones: form.volumen_operaciones || '0',
        antigüedad_relacion: parseInt(form.antigüedad_relacion) || 0,
      });
      setShowForm(false);
      await cargarResumen(selectedCliente.id);
    } catch (err) { setError(err.message); }
  };

  const renderForm = () => (
    <form onSubmit={handleCrear} className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 mt-4">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-slate-900">Nuevo cuestionario PLD</h3>
        <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Ingresos anuales</label>
            <input type="number" step="0.01" required value={form.ingresos_anuales}
              onChange={e => setForm(p => ({ ...p, ingresos_anuales: e.target.value }))}
              className="w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57]" placeholder="5000000" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Volumen operaciones</label>
            <input type="number" step="0.01" value={form.volumen_operaciones}
              onChange={e => setForm(p => ({ ...p, volumen_operaciones: e.target.value }))}
              className="w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57]" placeholder="0" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Antigüedad (meses)</label>
            <input type="number" min="0" value={form.antigüedad_relacion}
              onChange={e => setForm(p => ({ ...p, antigüedad_relacion: e.target.value }))}
              className="w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57]" placeholder="12" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.transacciones_internacionales}
              onChange={e => setForm(p => ({ ...p, transacciones_internacionales: e.target.checked }))}
              className="rounded border-slate-300 text-[#2E8B57]" />
            Transacciones intl.
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.expuesto_politicamente}
              onChange={e => setForm(p => ({ ...p, expuesto_politicamente: e.target.checked }))}
              className="rounded border-slate-300 text-[#2E8B57]" />
            PEP
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.sector_riesgo_alto}
              onChange={e => setForm(p => ({ ...p, sector_riesgo_alto: e.target.checked }))}
              className="rounded border-slate-300 text-[#2E8B57]" />
            Sector alto riesgo
          </label>
          <div>
            <select value={form.tipo_operacion} onChange={e => setForm(p => ({ ...p, tipo_operacion: e.target.value }))}
              className="w-full bg-slate-50 border rounded-xl p-3 text-xs outline-none focus:border-[#2E8B57]">
              <option value="nacional">Solo nacional</option>
              <option value="internacional">Solo internacional</option>
              <option value="ambas">Ambas</option>
            </select>
          </div>
        </div>
      </div>
      <button type="submit" className="mt-4 bg-slate-900 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all">
        Evaluar riesgo
      </button>
    </form>
  );

  // ─── Resultado ─────────────────────────────────
  const renderResultado = () => {
    if (!resumen) return null;
    const ultimo = resumen.ultimo_cuestionario;

    return (
      <div className="mt-6 space-y-4">
        {/* Risk badge */}
        {ultimo && (
          <div className={`rounded-2xl p-6 border ${RIESGO_COLOR[ultimo.nivel_riesgo] || 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Perfil de riesgo PLD</h3>
                <p className="text-xs text-slate-500 mt-0.5">Última evaluación: {fmtFecha(ultimo.fecha_aplicacion)}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold">{ultimo.puntaje}</div>
                <div className="text-[10px] uppercase tracking-wider">/ 100 pts</div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${RIESGO_COLOR[ultimo.nivel_riesgo]}`}>
                {ultimo.nivel_riesgo.toUpperCase()}
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500">Docs: {resumen.documentos_completos}✓ / {resumen.documentos_pendientes + resumen.documentos_completos}</span>
            </div>

            <div className="bg-white/60 rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
              {ultimo.recomendacion}
            </div>
          </div>
        )}

        {!ultimo && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-2xl p-6">
            Sin evaluación PLD. Aplica el cuestionario para evaluar el riesgo.
          </div>
        )}

        {/* Historial */}
        {cuestionarios.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 overflow-hidden">
            <div className="p-6 pb-0">
              <h3 className="text-sm font-semibold text-slate-900">Historial de evaluaciones</h3>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Fecha</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Ingresos</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Volumen</th>
                    <th className="text-center py-3 px-2 text-slate-400 font-medium">Intl</th>
                    <th className="text-center py-3 px-2 text-slate-400 font-medium">PEP</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Puntaje</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {cuestionarios.map(c => (
                    <tr key={c.id} className="border-b border-slate-50">
                      <td className="py-3 px-4 text-slate-600">{fmtFecha(c.fecha_aplicacion)}</td>
                      <td className="text-right py-3 px-2 text-slate-600">${parseFloat(c.ingresos_anuales).toLocaleString('es-MX')}</td>
                      <td className="text-right py-3 px-2 text-slate-600">${parseFloat(c.volumen_operaciones).toLocaleString('es-MX')}</td>
                      <td className="text-center py-3 px-2">{c.transacciones_internacionales ? '🌍' : '—'}</td>
                      <td className="text-center py-3 px-2">{c.expuesto_politicamente ? '⚠️' : '—'}</td>
                      <td className="text-right py-3 px-2 font-bold">{c.puntaje}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${RIESGO_COLOR[c.nivel_riesgo]}`}>
                          {c.nivel_riesgo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">PLD</h1>
        <p className="text-sm text-slate-500 mt-1">Prevención de Lavado de Dinero</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-6">{error}</div>}

      {/* Selector de cliente */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Seleccionar cliente</label>
        <div className="flex gap-3">
          <select value={selectedCliente?.id || ''} onChange={seleccionarCliente}
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
            <option value="">Seleccionar cliente...</option>
            {clientesList.map(c => <option key={c.id} value={c.id}>{c.razon_social} ({c.rfc})</option>)}
          </select>
          {selectedCliente && (
            <button onClick={() => setShowForm(true)}
              className="bg-slate-900 text-white text-xs font-semibold rounded-xl px-5 py-3 hover:bg-slate-800 transition-all whitespace-nowrap">
              + Nuevo cuestionario
            </button>
          )}
        </div>
      </div>

      {showForm && renderForm()}

      {selectedCliente && renderResultado()}

      {!selectedCliente && (
        <div className="mt-12 text-center">
          <div className="text-5xl mb-4">🛡️</div>
          <p className="text-sm text-slate-400">Selecciona un cliente para evaluar su perfil de riesgo PLD</p>
        </div>
      )}

      <div className="mt-6 text-[11px] text-slate-400 text-center">
        Basado en metodología CNBV · Factores: ingresos, volumen, PEP, internacional, antigüedad, sector
      </div>
    </div>
  );
}
