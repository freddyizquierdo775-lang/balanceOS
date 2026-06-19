import { useState, useEffect, useCallback } from 'react';
import { imss, API_BASE } from './api';
import { clientes } from './api';
import { empleados } from './api';

// ─── Constantes ───────────────────────────────────

const RIESGOS = [
  { value: 1, label: 'I — Mínimo' },
  { value: 2, label: 'II — Bajo' },
  { value: 3, label: 'III — Medio' },
  { value: 4, label: 'IV — Alto' },
  { value: 5, label: 'V — Máximo' },
];

const ESTATUS_OPTS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'completado', label: 'Completado' },
  { value: 'rechazado', label: 'Rechazado' },
];

const MOTIVOS_BAJA = [
  { value: 'renuncia', label: 'Renuncia' },
  { value: 'despido', label: 'Despido' },
  { value: 'fin_contrato', label: 'Fin de contrato' },
  { value: 'otro', label: 'Otro' },
];

const TIPOS_TRAMITE = [
  { value: 'riesgo_trabajo', label: 'Riesgo de trabajo' },
  { value: 'modificacion_salario', label: 'Modificación de salario' },
  { value: 'rectificacion', label: 'Rectificación' },
  { value: 'aclaracion', label: 'Aclaración' },
  { value: 'otro', label: 'Otro' },
];

const TABS = [
  { key: 'calculadora', label: 'Calculadora', icon: '🏥' },
  { key: 'altas', label: 'Altas', icon: '⬆️' },
  { key: 'bajas', label: 'Bajas', icon: '⬇️' },
  { key: 'tramites', label: 'Trámites', icon: '📋' },
  { key: 'seguimiento', label: 'Riesgos', icon: '⚠️' },
  { key: 'resumen', label: 'Resumen', icon: '📊' },
];

const initialForm = {
  salario_diario: '',
  dias_aguinaldo: 15,
  prima_vacacional_pct: 0.25,
  clase_riesgo: 1,
  anios_servicio: 1,
};

// ─── Helpers ─────────────────────────────────────

const fmt = (n) => {
  if (n === null || n === undefined) return '$0.00';
  return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const dateFmt = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

const badgeColor = (estatus) => {
  const map = { pendiente: 'bg-amber-500/20 text-amber-400', en_proceso: 'bg-sky-500/20 text-sky-400', completado: 'bg-emerald-500/20 text-emerald-400', rechazado: 'bg-red-500/20 text-red-400' };
  return map[estatus] || 'bg-gray-500/20 text-gray-400';
};

// ─── Sub-componentes ─────────────────────────────

function TabCalculadora({ usuario }) {
  const [form, setForm] = useState(initialForm);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setResultado(null);
    setError('');
  };

  const calcular = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        salario_diario: parseFloat(form.salario_diario),
        dias_aguinaldo: parseInt(form.dias_aguinaldo),
        prima_vacacional_pct: parseFloat(form.prima_vacacional_pct),
        clase_riesgo: parseInt(form.clase_riesgo),
        factor_integracion: form.factor_override ? parseFloat(form.factor_override) : null,
      };
      const data = await imss.calcular(payload);
      setResultado(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={calcular} className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] h-fit">
        <h2 className="text-base font-semibold text-white mb-5">Datos del trabajador</h2>
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">
              Salario diario <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]">$</span>
              <input type="number" step="0.01" min="1" required
                value={form.salario_diario}
                onChange={e => handleChange('salario_diario', e.target.value)}
                placeholder="500.00"
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-3.5 pl-8 pr-4 text-sm text-white outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:bg-[#141414] placeholder:text-[#71717A]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Días aguinaldo</label>
              <select value={form.dias_aguinaldo} onChange={e => handleChange('dias_aguinaldo', e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
                {[15, 20, 25, 30].map(d => <option key={d} value={d}>{d} días</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Prima vacacional</label>
              <select value={form.prima_vacacional_pct} onChange={e => handleChange('prima_vacacional_pct', e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
                <option value={0.25}>25% (mínimo ley)</option>
                <option value={0.30}>30%</option>
                <option value={0.50}>50%</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Años servicio</label>
              <select value={form.anios_servicio} onChange={e => handleChange('anios_servicio', e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(a => <option key={a} value={a}>{a} {a===1?'año':'años'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Clase de riesgo</label>
              <select value={form.clase_riesgo} onChange={e => handleChange('clase_riesgo', e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
                {RIESGOS.map(r => <option key={r.value} value={r.value}>{r.value} — {r.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">
              Factor integración <span className="text-[#71717A] font-normal">(opcional)</span>
            </label>
            <input type="number" step="0.000001" min="1" max="3"
              value={form.factor_override || ''}
              onChange={e => setForm(p => ({ ...p, factor_override: e.target.value }))}
              placeholder="1.045205"
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#71717A]"
            />
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">{error}</div>
          )}
          <button type="submit" disabled={loading || !form.salario_diario}
            className="w-full bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl py-3.5 hover:bg-slate-800 transition-all disabled:opacity-50">
            {loading ? 'Calculando...' : 'Calcular cuotas IMSS'}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {resultado && (
          <>
            <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
              <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">Salario Base de Cotización</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-extrabold text-white">{fmt(resultado.sbc_diario)}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">Diario</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-white">{fmt(resultado.sbc_mensual)}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">Mensual</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-white">{parseFloat(resultado.umas).toFixed(2)}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">UMAs</div>
                </div>
              </div>
            </div>
            <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
              <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">Cuotas Obrero-Patronales</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#262626]">
                      <th className="text-left py-2 pr-4 text-[#A1A1AA] font-medium">Concepto</th>
                      <th className="text-right py-2 px-2 text-[#A1A1AA] font-medium">Tasa Pat.</th>
                      <th className="text-right py-2 px-2 text-[#A1A1AA] font-medium">Tasa Obr.</th>
                      <th className="text-right py-2 pl-2 text-[#A1A1AA] font-medium">Patronal</th>
                      <th className="text-right py-2 pl-2 text-[#A1A1AA] font-medium">Obrero</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.cuotas.map((c, i) => (
                      <tr key={i} className="border-b border-[#1F1F1F]">
                        <td className="py-3 pr-4 text-white font-medium">{c.concepto}</td>
                        <td className="text-right py-3 px-2 text-[#D4D4D8]">{c.tasa_patronal}%</td>
                        <td className="text-right py-3 px-2 text-[#D4D4D8]">{c.tasa_obrera}%</td>
                        <td className="text-right py-3 pl-2 text-white font-semibold">{fmt(c.monto_patronal)}</td>
                        <td className="text-right py-3 pl-2 text-white">{fmt(c.monto_obrero)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#333333]">
                      <td className="py-3 pr-4 text-white font-bold">Totales</td>
                      <td></td><td></td>
                      <td className="text-right py-3 pl-2 text-white font-bold text-sm">{fmt(resultado.total_patronal)}</td>
                      <td className="text-right py-3 pl-2 text-white font-bold text-sm">{fmt(resultado.total_obrero)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-[#A1A1AA] text-[11px]">Gran total/día</td>
                      <td></td><td></td>
                      <td colSpan={2} className="text-right py-2 pl-2 text-white font-extrabold text-base">{fmt(resultado.gran_total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
              <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">Proyección mensual (30 días)</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-white">{fmt(parseFloat(resultado.total_patronal) * 30)}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">Patronal / mes</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{fmt(parseFloat(resultado.total_obrero) * 30)}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">Obrero / mes</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-400">{fmt(parseFloat(resultado.gran_total) * 30)}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">Gran total / mes</div>
                </div>
              </div>
            </div>
          </>
        )}
        {!resultado && !loading && (
          <div className="bg-[#141414] rounded-2xl p-12 text-center border border-[#262626] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)]">
            <div className="text-4xl mb-3">🏥</div>
            <p className="text-sm text-[#A1A1AA]">Ingresa los datos del trabajador y presiona "Calcular"</p>
            <p className="text-xs text-[#71717A] mt-1">SBC + cuotas obrero-patronales completas</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Altas ────────────────────────────────────

function TabAltas({ clienteId, setClienteId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [listaClientes, setListaClientes] = useState([]);
  const [listaEmpleados, setListaEmpleados] = useState([]);
  const [filtroEstatus, setFiltroEstatus] = useState('');

  const [form, setForm] = useState({ empleado_id: '', fecha_efectiva: '', nss: '', tipo_movimiento: 'alta', notas: '' });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clienteId) params.append('cliente_id', clienteId);
      if (filtroEstatus) params.append('estatus', filtroEstatus);
      const qs = params.toString();
      const data = await imss.listarAltas(qs ? `?${qs}` : '');
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clienteId, filtroEstatus]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { clientes.listar().then(setListaClientes).catch(() => {}); empleados.listar().then(setListaEmpleados).catch(() => {}); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await imss.crearAlta({ ...form, cliente_id: parseInt(clienteId), empleado_id: parseInt(form.empleado_id) });
      setShowForm(false);
      setForm({ empleado_id: '', fecha_efectiva: '', nss: '', tipo_movimiento: 'alta', notas: '' });
      cargar();
    } catch (err) { alert(err.message); }
  };

  const cambiarEstatus = async (id, nuevoEstatus) => {
    try { await imss.actualizarAlta(id, { estatus: nuevoEstatus }); cargar(); } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={clienteId} onChange={e => setClienteId(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los clientes</option>
          {listaClientes.map(c => <option key={c.id} value={c.id}>{c.razon_social || c.rfc}</option>)}
        </select>
        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los estados</option>
          {ESTATUS_OPTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <button onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-all ml-auto">
          + Nueva alta
        </button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="bg-[#141414] rounded-2xl p-6 border border-[#262626] space-y-4">
          <h3 className="text-sm font-semibold text-white">Nueva solicitud de alta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Empleado</label>
              <select required value={form.empleado_id} onChange={e => setForm(p => ({ ...p, empleado_id: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500">
                <option value="">Seleccionar empleado...</option>
                {listaEmpleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Tipo</label>
              <select value={form.tipo_movimiento} onChange={e => setForm(p => ({ ...p, tipo_movimiento: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500">
                <option value="alta">Alta</option>
                <option value="reingreso">Reingreso</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">NSS</label>
              <input type="text" value={form.nss} onChange={e => setForm(p => ({ ...p, nss: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Fecha efectiva</label>
              <input type="date" value={form.fecha_efectiva} onChange={e => setForm(p => ({ ...p, fecha_efectiva: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={!clienteId || !form.empleado_id} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 disabled:opacity-50">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-[#262626] hover:bg-[#333] text-white text-sm rounded-xl px-5 py-2.5">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-[#141414] rounded-2xl border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#262626] text-left">
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">ID</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Empleado</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Tipo</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Estatus</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">F. Efectiva</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Solicitado</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A]">
                  <td className="py-3 px-4 text-white font-mono text-xs">#{a.id}</td>
                  <td className="py-3 px-4 text-white">{a.empleado_id}</td>
                  <td className="py-3 px-4 text-[#D4D4D8] capitalize">{a.tipo_movimiento}</td>
                  <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor(a.estatus)}`}>{a.estatus}</span></td>
                  <td className="py-3 px-4 text-[#D4D4D8] text-xs">{dateFmt(a.fecha_efectiva)}</td>
                  <td className="py-3 px-4 text-[#D4D4D8] text-xs">{dateFmt(a.created_at)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <select value="" onChange={e => e.target.value && cambiarEstatus(a.id, e.target.value)}
                        className="bg-[#1A1A1A] border border-[#262626] rounded-lg px-2 py-1 text-xs text-white outline-none">
                        <option value="">Cambiar...</option>
                        {ESTATUS_OPTS.filter(o => o.value !== a.estatus).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const resp = await fetch(`${API_BASE}/imss/altas/${a.id}/generar-afil02`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                          });
                          if (!resp.ok) throw new Error('Error al generar AFIL-02');
                          const blob = await resp.blob();
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                        } catch(e) { alert(e.message); }
                      }}
                        className="text-[10px] bg-sky-600 hover:bg-sky-500 text-white rounded-lg px-2 py-1 transition-all">
                        AFIL-02
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr><td colSpan={7} className="py-8 text-center text-[#71717A] text-sm">No hay altas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Bajas ────────────────────────────────────

function TabBajas({ clienteId, setClienteId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [listaClientes, setListaClientes] = useState([]);
  const [listaEmpleados, setListaEmpleados] = useState([]);
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [form, setForm] = useState({ empleado_id: '', fecha_baja: '', motivo: 'renuncia', notas: '' });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clienteId) params.append('cliente_id', clienteId);
      if (filtroEstatus) params.append('estatus', filtroEstatus);
      const qs = params.toString();
      const data = await imss.listarBajas(qs ? `?${qs}` : '');
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clienteId, filtroEstatus]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { clientes.listar().then(setListaClientes).catch(() => {}); empleados.listar().then(setListaEmpleados).catch(() => {}); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await imss.crearBaja({ ...form, cliente_id: parseInt(clienteId), empleado_id: parseInt(form.empleado_id) });
      setShowForm(false);
      setForm({ empleado_id: '', fecha_baja: '', motivo: 'renuncia', notas: '' });
      cargar();
    } catch (err) { alert(err.message); }
  };

  const cambiarEstatus = async (id, nuevoEstatus) => {
    try { await imss.actualizarBaja(id, { estatus: nuevoEstatus }); cargar(); } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={clienteId} onChange={e => setClienteId(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los clientes</option>
          {listaClientes.map(c => <option key={c.id} value={c.id}>{c.razon_social || c.rfc}</option>)}
        </select>
        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los estados</option>
          {ESTATUS_OPTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <button onClick={() => setShowForm(true)}
          className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-all ml-auto">
          + Nueva baja
        </button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="bg-[#141414] rounded-2xl p-6 border border-[#262626] space-y-4">
          <h3 className="text-sm font-semibold text-white">Nueva solicitud de baja</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Empleado</label>
              <select required value={form.empleado_id} onChange={e => setForm(p => ({ ...p, empleado_id: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500">
                <option value="">Seleccionar empleado...</option>
                {listaEmpleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Motivo</label>
              <select value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500">
                {MOTIVOS_BAJA.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Fecha de baja</label>
              <input type="date" value={form.fecha_baja} onChange={e => setForm(p => ({ ...p, fecha_baja: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={!clienteId || !form.empleado_id} className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 disabled:opacity-50">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-[#262626] hover:bg-[#333] text-white text-sm rounded-xl px-5 py-2.5">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-[#141414] rounded-2xl border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#262626] text-left">
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">ID</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Empleado</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Motivo</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Estatus</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">F. Baja</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Solicitado</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(b => (
                <tr key={b.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A]">
                  <td className="py-3 px-4 text-white font-mono text-xs">#{b.id}</td>
                  <td className="py-3 px-4 text-white">{b.empleado_id}</td>
                  <td className="py-3 px-4 text-[#D4D4D8] capitalize">{b.motivo?.replace('_', ' ')}</td>
                  <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor(b.estatus)}`}>{b.estatus}</span></td>
                  <td className="py-3 px-4 text-[#D4D4D8] text-xs">{dateFmt(b.fecha_baja)}</td>
                  <td className="py-3 px-4 text-[#D4D4D8] text-xs">{dateFmt(b.created_at)}</td>
                  <td className="py-3 px-4">
                    <select value="" onChange={e => e.target.value && cambiarEstatus(b.id, e.target.value)}
                      className="bg-[#1A1A1A] border border-[#262626] rounded-lg px-2 py-1 text-xs text-white outline-none">
                      <option value="">Cambiar...</option>
                      {ESTATUS_OPTS.filter(o => o.value !== b.estatus).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr><td colSpan={7} className="py-8 text-center text-[#71717A] text-sm">No hay bajas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Trámites ─────────────────────────────────

function TabTramites({ clienteId, setClienteId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [listaClientes, setListaClientes] = useState([]);
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [form, setForm] = useState({ tipo: 'otro', descripcion: '', notas: '' });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clienteId) params.append('cliente_id', clienteId);
      if (filtroEstatus) params.append('estatus', filtroEstatus);
      if (filtroTipo) params.append('tipo', filtroTipo);
      const qs = params.toString();
      const data = await imss.listarTramites(qs ? `?${qs}` : '');
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clienteId, filtroEstatus, filtroTipo]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { clientes.listar().then(setListaClientes).catch(() => {}); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await imss.crearTramite({ ...form, cliente_id: parseInt(clienteId) });
      setShowForm(false);
      setForm({ tipo: 'otro', descripcion: '', notas: '' });
      cargar();
    } catch (err) { alert(err.message); }
  };

  const cambiarEstatus = async (id, nuevoEstatus) => {
    try { await imss.actualizarTramite(id, { estatus: nuevoEstatus }); cargar(); } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={clienteId} onChange={e => setClienteId(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los clientes</option>
          {listaClientes.map(c => <option key={c.id} value={c.id}>{c.razon_social || c.rfc}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los tipos</option>
          {TIPOS_TRAMITE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los estados</option>
          {ESTATUS_OPTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <button onClick={() => setShowForm(true)}
          className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-all ml-auto">
          + Nuevo trámite
        </button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="bg-[#141414] rounded-2xl p-6 border border-[#262626] space-y-4">
          <h3 className="text-sm font-semibold text-white">Nuevo trámite IMSS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500">
                {TIPOS_TRAMITE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" rows={2} />
          </div>
          <div>
            <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={!clienteId} className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 disabled:opacity-50">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-[#262626] hover:bg-[#333] text-white text-sm rounded-xl px-5 py-2.5">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-[#141414] rounded-2xl border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#262626] text-left">
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">ID</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Tipo</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Descripción</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Estatus</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Inicio</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A]">
                  <td className="py-3 px-4 text-white font-mono text-xs">#{t.id}</td>
                  <td className="py-3 px-4 text-[#D4D4D8] capitalize">{t.tipo?.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-white text-xs max-w-[200px] truncate">{t.descripcion || '—'}</td>
                  <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor(t.estatus)}`}>{t.estatus}</span></td>
                  <td className="py-3 px-4 text-[#D4D4D8] text-xs">{dateFmt(t.fecha_inicio)}</td>
                  <td className="py-3 px-4">
                    <select value="" onChange={e => e.target.value && cambiarEstatus(t.id, e.target.value)}
                      className="bg-[#1A1A1A] border border-[#262626] rounded-lg px-2 py-1 text-xs text-white outline-none">
                      <option value="">Cambiar...</option>
                      {ESTATUS_OPTS.filter(o => o.value !== t.estatus).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr><td colSpan={6} className="py-8 text-center text-[#71717A] text-sm">No hay trámites registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Riesgos de Trabajo (Seguimiento de Calificación) ──

const ESTATUS_RIESGO_OPTS = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'en_calificacion', label: 'En calificación', color: 'bg-sky-500/20 text-sky-400' },
  { value: 'calificado', label: 'Calificado', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-500/20 text-red-400' },
];

const TIPOS_RIESGO = [
  { value: 'accidente', label: 'Accidente' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'trayecto', label: 'Trayecto' },
  { value: 'otro', label: 'Otro' },
];

function badgeRiesgoColor(estatus) {
  const m = ESTATUS_RIESGO_OPTS.find(e => e.value === estatus);
  return m ? m.color : 'bg-gray-500/20 text-gray-400';
}

function formatDaysAgo(d) {
  if (!d) return '—';
  const diff = Math.floor((new Date() - new Date(d)) / 86400000);
  if (diff < 1) return 'Hoy';
  if (diff === 1) return '1 día';
  return `${diff} días`;
}

function TabRiesgosTrabajo({ clienteId, setClienteId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [listaClientes, setListaClientes] = useState([]);
  const [listaEmpleados, setListaEmpleados] = useState([]);
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [subiendoDoc, setSubiendoDoc] = useState(null);

  const [form, setForm] = useState({ empleado_id: '', tipo_riesgo: 'accidente', descripcion: '', notas: '' });
  const [archivoInicial, setArchivoInicial] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clienteId) params.append('cliente_id', clienteId);
      if (filtroEstatus) params.append('estatus', filtroEstatus);
      const qs = params.toString();
      const data = await imss.listarRiesgosTrabajo(qs ? `?${qs}` : '');
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clienteId, filtroEstatus]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    clientes.listar().then(setListaClientes).catch(() => {});
    empleados.listar().then(setListaEmpleados).catch(() => {});
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('empleado_id', parseInt(form.empleado_id));
      fd.append('cliente_id', parseInt(clienteId));
      fd.append('tipo_riesgo', form.tipo_riesgo);
      fd.append('descripcion', form.descripcion);
      fd.append('notas', form.notas);
      if (archivoInicial) fd.append('documento_inicial', archivoInicial);
      await imss.crearRiesgoTrabajo(fd);
      setShowForm(false);
      setForm({ empleado_id: '', tipo_riesgo: 'accidente', descripcion: '', notas: '' });
      setArchivoInicial(null);
      cargar();
    } catch (err) { alert(err.message); }
  };

  const cambiarEstatus = async (id, nuevoEstatus) => {
    try {
      await imss.actualizarRiesgoTrabajo(id, { estatus: nuevoEstatus });
      cargar();
    } catch (err) { alert(err.message); }
  };

  const subirCalificado = async (riesgoId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoDoc(riesgoId);
    try {
      await imss.subirDocumentoCalificado(riesgoId, file);
      cargar();
    } catch (err) { alert(err.message); }
    finally { setSubiendoDoc(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={clienteId} onChange={e => setClienteId(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los clientes</option>
          {listaClientes.map(c => <option key={c.id} value={c.id}>{c.razon_social || c.rfc}</option>)}
        </select>
        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los estados</option>
          {ESTATUS_RIESGO_OPTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <button onClick={() => setShowForm(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-all ml-auto">
          + Nuevo riesgo
        </button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="bg-[#141414] rounded-2xl p-6 border border-[#262626] space-y-4">
          <h3 className="text-sm font-semibold text-white">Reportar riesgo de trabajo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Empleado *</label>
              <select required value={form.empleado_id} onChange={e => setForm(p => ({ ...p, empleado_id: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500">
                <option value="">Seleccionar...</option>
                {listaEmpleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos} ({e.rfc})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Tipo de riesgo</label>
              <select value={form.tipo_riesgo} onChange={e => setForm(p => ({ ...p, tipo_riesgo: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500">
                {TIPOS_RIESGO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" rows={2} />
          </div>
          <div>
            <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Documento inicial (ST-7 / aviso)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setArchivoInicial(e.target.files[0])}
              className="w-full text-sm text-[#A1A1AA] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1A1A1A] file:text-white hover:file:bg-[#262626]" />
          </div>
          <div>
            <label className="text-[10px] text-[#A1A1AA] uppercase block mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={!clienteId || !form.empleado_id}
              className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 disabled:opacity-50">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)}
              className="bg-[#262626] hover:bg-[#333] text-white text-sm rounded-xl px-5 py-2.5">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-[#141414] rounded-2xl border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#262626] text-left">
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">ID</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Empleado</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Tipo</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Estatus</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Días</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Docs</th>
                <th className="py-3 px-4 text-[#A1A1AA] text-xs font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A]">
                  <td className="py-3 px-4 text-white font-mono text-xs">#{r.id}</td>
                  <td className="py-3 px-4 text-white text-xs">ID:{r.empleado_id}</td>
                  <td className="py-3 px-4 text-[#D4D4D8] capitalize text-xs">{r.tipo_riesgo?.replace('_',' ')}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeRiesgoColor(r.estatus)}`}>
                      {ESTATUS_RIESGO_OPTS.find(e => e.value === r.estatus)?.label || r.estatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs" title={new Date(r.fecha_reporte).toLocaleDateString()}>
                    <span className={r.estatus !== 'calificado' && r.estatus !== 'rechazado' && formatDaysAgo(r.fecha_reporte).includes('días') && parseInt(formatDaysAgo(r.fecha_reporte)) > 30
                      ? 'text-red-400 font-semibold' : 'text-[#D4D4D8]'}>
                      {formatDaysAgo(r.fecha_reporte)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 text-xs">
                      {r.documento_inicial_path && (
                        <a href={imss.descargarDocumentoUrl(r.id, 'inicial')} target="_blank" rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300 underline">Inicial</a>
                      )}
                      {r.documento_calificado_path ? (
                        <a href={imss.descargarDocumentoUrl(r.id, 'calificado')} target="_blank" rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 underline">Calif.</a>
                      ) : r.estatus !== 'calificado' && r.estatus !== 'rechazado' && (
                        <label className="text-[#A1A1AA] hover:text-white cursor-pointer underline">
                          {subiendoDoc === r.id ? '...' : 'Subir'}
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                            onChange={e => subirCalificado(r.id, e)} />
                        </label>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <select value="" onChange={e => e.target.value && cambiarEstatus(r.id, e.target.value)}
                        className="bg-[#1A1A1A] border border-[#262626] rounded-lg px-2 py-1 text-xs text-white outline-none">
                        <option value="">Cambiar...</option>
                        {ESTATUS_RIESGO_OPTS.filter(o => o.value !== r.estatus).map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <button onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const resp = await fetch(`${API_BASE}/imss/riesgos-trabajo/${r.id}/generar-st7`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                          });
                          if (!resp.ok) throw new Error('Error al generar ST-7');
                          const blob = await resp.blob();
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                        } catch(e) { alert(e.message); }
                      }}
                        className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-2 py-1 transition-all">
                        ST-7
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr><td colSpan={7} className="py-8 text-center text-[#71717A] text-sm">No hay riesgos de trabajo registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Resumen ──────────────────────────────────

function TabResumen({ clienteId, setClienteId }) {
  const [resumen, setResumen] = useState(null);
  const [listaClientes, setListaClientes] = useState([]);

  useEffect(() => {
    clientes.listar().then(setListaClientes).catch(() => {});
  }, []);

  useEffect(() => {
    imss.resumen(clienteId).then(setResumen).catch(() => {});
  }, [clienteId]);

  return (
    <div className="space-y-6">
      <div>
        <select value={clienteId} onChange={e => setClienteId(e.target.value)}
          className="bg-[#1A1A1A] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
          <option value="">Todos los clientes</option>
          {listaClientes.map(c => <option key={c.id} value={c.id}>{c.razon_social || c.rfc}</option>)}
        </select>
      </div>

      {resumen && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#141414] rounded-2xl p-6 border border-amber-500/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">Altas pendientes</div>
              <div className="text-4xl font-extrabold text-amber-400">{resumen.total_altas_pendientes}</div>
              <div className="text-xs text-[#71717A] mt-1">Solicitudes de alta sin completar</div>
            </div>
            <div className="bg-[#141414] rounded-2xl p-6 border border-red-500/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">Bajas pendientes</div>
              <div className="text-4xl font-extrabold text-red-400">{resumen.total_bajas_pendientes}</div>
              <div className="text-xs text-[#71717A] mt-1">Solicitudes de baja sin completar</div>
            </div>
            <div className="bg-[#141414] rounded-2xl p-6 border border-sky-500/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">Trámites activos</div>
              <div className="text-4xl font-extrabold text-sky-400">{resumen.total_tramites_activos}</div>
              <div className="text-xs text-[#71717A] mt-1">Trámites en proceso o pendientes</div>
            </div>
            <div className="bg-[#141414] rounded-2xl p-6 border border-amber-500/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">Riesgos activos</div>
              <div className="text-4xl font-extrabold text-amber-400">{resumen.total_riesgos_activos}</div>
              <div className="text-xs text-[#71717A] mt-1">Riesgos de trabajo sin calificar</div>
            </div>
            <div className="bg-[#141414] rounded-2xl p-6 border border-red-500/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">Riesgos vencidos</div>
              <div className="text-4xl font-extrabold text-red-400">{resumen.total_riesgos_vencidos}</div>
              <div className="text-xs text-[#71717A] mt-1">{'>'}30 días sin calificar ⚠️</div>
            </div>
            <div className="bg-[#141414] rounded-2xl p-6 border border-amber-500/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">Sin alta IMSS</div>
              <div className="text-4xl font-extrabold text-amber-400">{resumen.total_empleados_sin_alta}</div>
              <div className="text-xs text-[#71717A] mt-1">Empleados pendientes de alta</div>
            </div>
          </div>
        </div>
      )}

      {!resumen && (
        <div className="bg-[#141414] rounded-2xl p-12 text-center border border-[#262626]">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm text-[#A1A1AA]">Selecciona un cliente para ver el resumen de KPIs IMSS</p>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────

export default function IMSS({ usuario, subPage, setSubPage }) {
  const [tab, setTab] = useState(subPage || 'calculadora');

  // Sync subPage from SidePanel → tab
  useEffect(() => {
    if (subPage) setTab(subPage);
  }, [subPage]);

  const handleTabChange = (key) => {
    setTab(key);
    setSubPage?.(key);
  };
  const [clienteId, setClienteId] = useState('');

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tighter text-white">IMSS Engine</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">Cálculo de SBC, cuotas obrero-patronales y gestión de trámites</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-[#141414] rounded-2xl p-1 border border-[#262626]">
          {TABS.map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-white'
              }`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'calculadora' && <TabCalculadora usuario={usuario} />}
        {tab === 'altas' && <TabAltas clienteId={clienteId} setClienteId={setClienteId} />}
        {tab === 'bajas' && <TabBajas clienteId={clienteId} setClienteId={setClienteId} />}
        {tab === 'tramites' && <TabTramites clienteId={clienteId} setClienteId={setClienteId} />}
        {tab === 'seguimiento' && <TabRiesgosTrabajo clienteId={clienteId} setClienteId={setClienteId} />}
        {tab === 'resumen' && <TabResumen clienteId={clienteId} setClienteId={setClienteId} />}
      </div>
    </div>
  );
}
