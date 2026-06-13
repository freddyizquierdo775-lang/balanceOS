import { useState, useEffect, useCallback } from 'react';
import { nomina } from './api';

const TIPOS = ['semanal', 'quincenal', 'mensual'];
const ESTATUS_COLOR = {
  abierto: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  calculado: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  pagado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  cancelado: 'bg-[#1A1A1A] text-[#A1A1AA] border-[#333333]',
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
    <form onSubmit={handleCrear} className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] mb-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-white">Nuevo período</h3>
        <button type="button" onClick={() => setShowForm(false)}
          className="text-xs text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors">Cancelar</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Nombre</label>
          <input type="text" required value={newPeriodo.nombre}
            onChange={e => setNewPeriodo(p => ({ ...p, nombre: e.target.value }))}
            placeholder="Julio Quincena 2"
            className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#71717A]" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Inicio</label>
          <input type="date" required value={newPeriodo.fecha_inicio}
            onChange={e => setNewPeriodo(p => ({ ...p, fecha_inicio: e.target.value }))}
            className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Fin</label>
          <input type="date" required value={newPeriodo.fecha_fin}
            onChange={e => setNewPeriodo(p => ({ ...p, fecha_fin: e.target.value }))}
            className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Tipo</label>
          <select value={newPeriodo.tipo}
            onChange={e => setNewPeriodo(p => ({ ...p, tipo: e.target.value }))}
            className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
            {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="mt-4 bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
        {loading ? 'Creando...' : 'Crear período'}
      </button>
    </form>
  );

  // ─── Tabla de períodos ───────────────────────────
  const renderPeriodos = () => (
    <div className="bg-[#141414] rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] overflow-hidden">
      <div className="p-6 pb-0 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Períodos de nómina</h2>
        <button onClick={() => setShowForm(true)}
          className="bg-[#0A0A0A] text-white text-xs font-semibold rounded-xl px-4 py-2 hover:bg-slate-800 transition-all">
          + Nuevo período
        </button>
      </div>

      {periodos.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-[#A1A1AA]">No hay períodos registrados</p>
          <p className="text-xs text-[#71717A] mt-1">Crea un período para comenzar</p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#262626]">
                <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Nombre</th>
                <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Inicio</th>
                <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Fin</th>
                <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Tipo</th>
                <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Estatus</th>
                <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Recibos</th>
                <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {periodos.map(p => (
                <tr key={p.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A] cursor-pointer"
                  onClick={() => verDetalle(p)}>
                  <td className="py-3.5 px-4 text-white font-medium">{p.nombre}</td>
                  <td className="py-3.5 px-2 text-[#D4D4D8]">{fmtFecha(p.fecha_inicio)}</td>
                  <td className="py-3.5 px-2 text-[#D4D4D8]">{fmtFecha(p.fecha_fin)}</td>
                  <td className="py-3.5 px-2 text-[#A1A1AA]">{p.tipo}</td>
                  <td className="py-3.5 px-2">
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[p.estatus] || 'bg-[#1A1A1A] text-[#A1A1AA]'}`}>
                      {p.estatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-right text-[#D4D4D8]">{p.recibos?.length || 0}</td>
                  <td className="py-3.5 px-4 text-right">
                    {p.estatus === 'abierto' && (
                      <button onClick={(e) => { e.stopPropagation(); handleCalcular(p.id); }}
                        disabled={calculando === p.id}
                        className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 transition-all disabled:opacity-50">
                        {calculando === p.id ? 'Calculando...' : 'Calcular'}
                      </button>
                    )}
                    {p.estatus === 'calculado' && (
                      <span className="text-[10px] text-[#A1A1AA]">✅ Calculado</span>
                    )}
                    {p.estatus === 'pagado' && (
                      <span className="text-[10px] text-emerald-400">💚 Pagado</span>
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
        <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">{selectedPeriodo.nombre}</h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                {fmtFecha(selectedPeriodo.fecha_inicio)} — {fmtFecha(selectedPeriodo.fecha_fin)} · {selectedPeriodo.tipo}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${ESTATUS_COLOR[selectedPeriodo.estatus]}`}>
                {selectedPeriodo.estatus}
              </span>
              <button onClick={() => setSelectedPeriodo(null)}
                className="text-xs text-[#A1A1AA] hover:text-[#D4D4D8]">Cerrar</button>
            </div>
          </div>

          {/* Totales */}
          {t && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-white">{fmt(t.percepciones)}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-0.5">Total percepciones</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-red-400">{fmt(t.deducciones)}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-0.5">Total deducciones</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-emerald-400">{fmt(t.neto)}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-0.5">Total neto</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-white">{recibos.length}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-0.5">Empleados</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de recibos */}
        {recibos.length > 0 && (
          <div className="bg-[#141414] rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] overflow-hidden">
            <div className="p-6 pb-0">
              <h3 className="text-sm font-semibold text-white">Recibos</h3>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#262626]">
                    <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Empleado ID</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Salario</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Días</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">SBC</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">S. Base</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Percep.</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">IMSS</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">ISR</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Subsidio</th>
                    <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {recibos.map(r => (
                    <tr key={r.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A]">
                      <td className="py-3 px-4 text-white font-medium">#{r.empleado_id}</td>
                      <td className="text-right py-3 px-2 text-[#D4D4D8]">{fmt(r.salario_diario)}</td>
                      <td className="text-right py-3 px-2 text-[#D4D4D8]">{r.dias_trabajados}</td>
                      <td className="text-right py-3 px-2 text-[#D4D4D8]">{fmt(r.sbc)}</td>
                      <td className="text-right py-3 px-2 text-[#D4D4D8]">{fmt(r.sueldo_base)}</td>
                      <td className="text-right py-3 px-2 text-white font-semibold">{fmt(r.total_percepciones)}</td>
                      <td className="text-right py-3 px-2 text-[#D4D4D8]">{fmt(r.imss_obrero)}</td>
                      <td className="text-right py-3 px-2 text-[#D4D4D8]">{fmt(r.isr_neto)}</td>
                      <td className="text-right py-3 px-2 text-[#A1A1AA]">{fmt(r.subsidio_al_empleo)}</td>
                      <td className="text-right py-3 px-4 text-white font-bold">{fmt(r.neto)}</td>
                    </tr>
                  ))}
                </tbody>
                {t && (
                  <tfoot>
                    <tr className="border-t-2 border-[#333333]">
                      <td className="py-3 px-4 text-white font-bold">Totales</td>
                      <td></td><td></td><td></td><td></td>
                      <td className="text-right py-3 px-2 text-white font-bold">{fmt(t.percepciones)}</td>
                      <td className="text-right py-3 px-2 text-white font-bold">{fmt(t.imss)}</td>
                      <td className="text-right py-3 px-2 text-white font-bold">{fmt(t.isr)}</td>
                      <td></td>
                      <td className="text-right py-3 px-4 text-white font-bold text-sm">{fmt(t.neto)}</td>
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
        <h1 className="text-2xl font-extrabold tracking-tighter text-white">Nómina</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Gestión de períodos, cálculo y recibos</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 mb-6">{error}</div>
      )}

      {showForm && renderForm()}

      {renderPeriodos()}

      {renderDetalle()}

      <div className="mt-6 text-[11px] text-[#A1A1AA] text-center leading-relaxed">
        ISR calculado con tarifa LISR Art. 96 + subsidio al empleo (transitorio).
        IMSS con motor de cuotas obrero-patronales 2026. UMA $117.31/día.
        Cálculos orientativos — validar contra SUA.
      </div>
      </div>
    </div>
  );
}
