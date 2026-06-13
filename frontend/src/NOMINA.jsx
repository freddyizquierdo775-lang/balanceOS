import { useState, useEffect, useCallback } from 'react';
import { nomina } from './api';

const TIPOS = ['semanal', 'quincenal', 'mensual'];
const ESTATUS_COLOR = {
  abierto: 'bg-amber-50 text-amber-700 border-amber-200',
  calculado: 'bg-sky-50 text-sky-700 border-sky-200',
  pagado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelado: 'bg-slate-50 text-slate-400 border-slate-200',
};

const fmt = (n) => {
  if (n === null || n === undefined) return '$0.00';
  return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtFecha = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const emptyPeriodo = {
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  tipo: 'quincenal',
};

export default function NOMINA({ usuario }) {
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newPeriodo, setNewPeriodo] = useState(emptyPeriodo);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(null);
  const [error, setError] = useState('');

  const cargarPeriodos = useCallback(async () => {
    try {
      const data = await nomina.listarPeriodos();
      setPeriodos(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { cargarPeriodos(); }, [cargarPeriodos]);

  const handleCrear = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...newPeriodo,
        fecha_inicio: newPeriodo.fecha_inicio + 'T00:00:00',
        fecha_fin: newPeriodo.fecha_fin + 'T00:00:00',
      };
      await nomina.crearPeriodo(payload);
      setShowForm(false);
      setNewPeriodo(emptyPeriodo);
      await cargarPeriodos();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCalcular = async (periodoId) => {
    setCalculando(periodoId);
    setError('');
    try {
      const data = await nomina.calcularPeriodo(periodoId);
      // If this was the selected period, update it
      if (selectedPeriodo?.id === periodoId) {
        setSelectedPeriodo(data);
      }
      await cargarPeriodos();
    } catch (err) {
      setError(err.message);
    } finally {
      setCalculando(null);
    }
  };

  const verDetalle = async (periodo) => {
    try {
      const data = await nomina.obtenerPeriodo(periodo.id);
      setSelectedPeriodo(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPeriodo = (recibos) => {
    if (!recibos || recibos.length === 0) return null;
    return {
      percepciones: recibos.reduce((s, r) => s + parseFloat(r.total_percepciones), 0),
      deducciones: recibos.reduce((s, r) => s + parseFloat(r.total_deducciones), 0),
      neto: recibos.reduce((s, r) => s + parseFloat(r.neto), 0),
      imss: recibos.reduce((s, r) => s + parseFloat(r.imss_obrero), 0),
      isr: recibos.reduce((s, r) => s + parseFloat(r.isr_neto), 0),
    };
  };

  // ─── Formulario nuevo periodo ────────────────────
  const renderForm = () => (
    <form onSubmit={handleCrear} className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-slate-900">Nuevo período</h3>
        <button type="button" onClick={() => setShowForm(false)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Nombre</label>
          <input type="text" required value={newPeriodo.nombre}
            onChange={e => setNewPeriodo(p => ({ ...p, nombre: e.target.value }))}
            placeholder="Julio Quincena 2"
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-slate-300" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Inicio</label>
          <input type="date" required value={newPeriodo.fecha_inicio}
            onChange={e => setNewPeriodo(p => ({ ...p, fecha_inicio: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Fin</label>
          <input type="date" required value={newPeriodo.fecha_fin}
            onChange={e => setNewPeriodo(p => ({ ...p, fecha_fin: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Tipo</label>
          <select value={newPeriodo.tipo}
            onChange={e => setNewPeriodo(p => ({ ...p, tipo: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
            {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="mt-4 bg-slate-900 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
        {loading ? 'Creando...' : 'Crear período'}
      </button>
    </form>
  );

  // ─── Tabla de períodos ───────────────────────────
  const renderPeriodos = () => (
    <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 overflow-hidden">
      <div className="p-6 pb-0 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Períodos de nómina</h2>
        <button onClick={() => setShowForm(true)}
          className="bg-slate-900 text-white text-xs font-semibold rounded-xl px-4 py-2 hover:bg-slate-800 transition-all">
          + Nuevo período
        </button>
      </div>

      {periodos.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-slate-400">No hay períodos registrados</p>
          <p className="text-xs text-slate-300 mt-1">Crea un período para comenzar</p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Nombre</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Inicio</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Fin</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Tipo</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Estatus</th>
                <th className="text-right py-3 px-2 text-slate-400 font-medium">Recibos</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {periodos.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => verDetalle(p)}>
                  <td className="py-3.5 px-4 text-slate-900 font-medium">{p.nombre}</td>
                  <td className="py-3.5 px-2 text-slate-600">{fmtFecha(p.fecha_inicio)}</td>
                  <td className="py-3.5 px-2 text-slate-600">{fmtFecha(p.fecha_fin)}</td>
                  <td className="py-3.5 px-2 text-slate-500">{p.tipo}</td>
                  <td className="py-3.5 px-2">
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[p.estatus] || 'bg-slate-50 text-slate-500'}`}>
                      {p.estatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-right text-slate-600">{p.recibos?.length || 0}</td>
                  <td className="py-3.5 px-4 text-right">
                    {p.estatus === 'abierto' && (
                      <button onClick={(e) => { e.stopPropagation(); handleCalcular(p.id); }}
                        disabled={calculando === p.id}
                        className="text-[10px] font-semibold text-sky-600 hover:text-sky-700 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition-all disabled:opacity-50">
                        {calculando === p.id ? 'Calculando...' : 'Calcular'}
                      </button>
                    )}
                    {p.estatus === 'calculado' && (
                      <span className="text-[10px] text-slate-400">✅ Calculado</span>
                    )}
                    {p.estatus === 'pagado' && (
                      <span className="text-[10px] text-emerald-500">💚 Pagado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ─── Detalle del período ─────────────────────────
  const renderDetalle = () => {
    if (!selectedPeriodo) return null;

    const t = totalPeriodo(selectedPeriodo.recibos);
    const recibos = selectedPeriodo.recibos || [];

    return (
      <div className="mt-6 space-y-4">
        {/* Cabecera */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{selectedPeriodo.nombre}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {fmtFecha(selectedPeriodo.fecha_inicio)} — {fmtFecha(selectedPeriodo.fecha_fin)} · {selectedPeriodo.tipo}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${ESTATUS_COLOR[selectedPeriodo.estatus]}`}>
                {selectedPeriodo.estatus}
              </span>
              <button onClick={() => setSelectedPeriodo(null)}
                className="text-xs text-slate-400 hover:text-slate-600">Cerrar</button>
            </div>
          </div>

          {/* Totales */}
          {t && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-slate-900">{fmt(t.percepciones)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Total percepciones</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-red-600">{fmt(t.deducciones)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Total deducciones</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-[#2E8B57]">{fmt(t.neto)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Total neto</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-slate-900">{recibos.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Empleados</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de recibos */}
        {recibos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 overflow-hidden">
            <div className="p-6 pb-0">
              <h3 className="text-sm font-semibold text-slate-900">Recibos</h3>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Empleado ID</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Salario</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Días</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">SBC</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">S. Base</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Percep.</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">IMSS</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">ISR</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Subsidio</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {recibos.map(r => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-900 font-medium">#{r.empleado_id}</td>
                      <td className="text-right py-3 px-2 text-slate-600">{fmt(r.salario_diario)}</td>
                      <td className="text-right py-3 px-2 text-slate-600">{r.dias_trabajados}</td>
                      <td className="text-right py-3 px-2 text-slate-600">{fmt(r.sbc)}</td>
                      <td className="text-right py-3 px-2 text-slate-600">{fmt(r.sueldo_base)}</td>
                      <td className="text-right py-3 px-2 text-slate-900 font-semibold">{fmt(r.total_percepciones)}</td>
                      <td className="text-right py-3 px-2 text-slate-600">{fmt(r.imss_obrero)}</td>
                      <td className="text-right py-3 px-2 text-slate-600">{fmt(r.isr_neto)}</td>
                      <td className="text-right py-3 px-2 text-slate-500">{fmt(r.subsidio_al_empleo)}</td>
                      <td className="text-right py-3 px-4 text-slate-900 font-bold">{fmt(r.neto)}</td>
                    </tr>
                  ))}
                </tbody>
                {t && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200">
                      <td className="py-3 px-4 text-slate-900 font-bold">Totales</td>
                      <td></td><td></td><td></td><td></td>
                      <td className="text-right py-3 px-2 text-slate-900 font-bold">{fmt(t.percepciones)}</td>
                      <td className="text-right py-3 px-2 text-slate-900 font-bold">{fmt(t.imss)}</td>
                      <td className="text-right py-3 px-2 text-slate-900 font-bold">{fmt(t.isr)}</td>
                      <td></td>
                      <td className="text-right py-3 px-4 text-slate-900 font-bold text-sm">{fmt(t.neto)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────
  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">Nómina</h1>
        <p className="text-sm text-slate-500 mt-1">Gestión de períodos, cálculo y recibos</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-6">{error}</div>
      )}

      {showForm && renderForm()}

      {renderPeriodos()}

      {renderDetalle()}

      <div className="mt-6 text-[11px] text-slate-400 text-center leading-relaxed">
        ISR calculado con tarifa LISR Art. 96 + subsidio al empleo (transitorio).
        IMSS con motor de cuotas obrero-patronales 2026. UMA $117.31/día.
        Cálculos orientativos — validar contra SUA.
      </div>
      </div>
    </div>
  );
}
