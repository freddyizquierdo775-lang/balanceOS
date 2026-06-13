import { useState, useEffect, useCallback } from 'react';
import { tesoreria } from './api';

const fmt = (n) => {
  if (n === null || n === undefined) return '$0.00';
  return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtFecha = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function Tesoreria({ usuario }) {
  const [tab, setTab] = useState('cuentas');
  const [cuentas, setCuentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form nueva cuenta
  const [showCuentaForm, setShowCuentaForm] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({ banco: '', numero_cuenta: '', tipo: 'cheques', saldo_inicial: '' });
  const [savingCuenta, setSavingCuenta] = useState(false);

  // Form nuevo movimiento
  const [showMovForm, setShowMovForm] = useState(false);
  const [movForm, setMovForm] = useState({ cuenta_id: '', fecha: '', tipo: 'abono', concepto: '', monto: '' });
  const [savingMov, setSavingMov] = useState(false);

  // Conciliación
  const [concCtaId, setConcCtaId] = useState('');
  const [concMes, setConcMes] = useState(new Date().getMonth() + 1);
  const [concAnio, setConcAnio] = useState(new Date().getFullYear());
  const [concSaldoEstado, setConcSaldoEstado] = useState('');
  const [concResult, setConcResult] = useState(null);
  const [savingConc, setSavingConc] = useState(false);

  // Estado de cuenta
  const [ecCtaId, setEcCtaId] = useState('');
  const [ecMes, setEcMes] = useState(new Date().getMonth() + 1);
  const [ecAnio, setEcAnio] = useState(new Date().getFullYear());
  const [ecData, setEcData] = useState(null);
  const [loadingEc, setLoadingEc] = useState(false);

  const cargarCuentas = useCallback(async () => {
    try {
      const data = await tesoreria.listarCuentas();
      setCuentas(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { cargarCuentas(); }, [cargarCuentas]);

  const handleCrearCuenta = async (e) => {
    e.preventDefault();
    setSavingCuenta(true);
    setError('');
    try {
      await tesoreria.crearCuenta(cuentaForm);
      setShowCuentaForm(false);
      setCuentaForm({ banco: '', numero_cuenta: '', tipo: 'cheques', saldo_inicial: '' });
      setSuccess('Cuenta creada exitosamente');
      cargarCuentas();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCuenta(false);
    }
  };

  const cargarMovimientos = async (cuentaId) => {
    if (!cuentaId) return;
    setLoading(true);
    setError('');
    try {
      const data = await tesoreria.listarMovimientos(cuentaId);
      setMovimientos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearMovimiento = async (e) => {
    e.preventDefault();
    setSavingMov(true);
    setError('');
    try {
      await tesoreria.crearMovimiento(movForm);
      setShowMovForm(false);
      setMovForm({ cuenta_id: movForm.cuenta_id, fecha: '', tipo: 'abono', concepto: '', monto: '' });
      setSuccess('Movimiento registrado exitosamente');
      if (movForm.cuenta_id) cargarMovimientos(movForm.cuenta_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingMov(false);
    }
  };

  const handleConciliar = async (e) => {
    e.preventDefault();
    setSavingConc(true);
    setError('');
    setConcResult(null);
    try {
      const data = await tesoreria.conciliar({
        cuenta_id: parseInt(concCtaId),
        periodo_mes: concMes,
        periodo_anio: concAnio,
        saldo_estado_cuenta: parseFloat(concSaldoEstado),
      });
      setConcResult(data);
      setSuccess('Conciliación completada');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingConc(false);
    }
  };

  const cargarEstadoCuenta = async () => {
    if (!ecCtaId) return;
    setLoadingEc(true);
    setError('');
    setEcData(null);
    try {
      const data = await tesoreria.estadoCuenta(ecCtaId, ecMes, ecAnio);
      setEcData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingEc(false);
    }
  };

  // Clear success message
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ─── Tabs ─────────────────────────────────────────
  const tabs = [
    { key: 'cuentas', label: 'Cuentas' },
    { key: 'movimientos', label: 'Movimientos' },
    { key: 'conciliacion', label: 'Conciliación' },
    { key: 'estado-cuenta', label: 'Estado de Cuenta' },
  ];

  // ─── Cuentas bancarias ────────────────────────────
  const renderCuentas = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">Cuentas bancarias</h2>
        <button onClick={() => { setShowCuentaForm(!showCuentaForm); setError(''); }}
          className="bg-[#0A0A0A] text-white text-xs font-semibold rounded-xl px-4 py-2 hover:bg-slate-800 transition-all">
          {showCuentaForm ? 'Cancelar' : '+ Nueva cuenta'}
        </button>
      </div>

      {showCuentaForm && (
        <form onSubmit={handleCrearCuenta} className="bg-[#141414] rounded-2xl p-6 mb-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
          <h3 className="text-sm font-semibold text-white mb-4">Nueva cuenta bancaria</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Banco</label>
              <input type="text" required value={cuentaForm.banco}
                onChange={e => setCuentaForm(p => ({ ...p, banco: e.target.value }))}
                placeholder="BBVA, Santander..."
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#71717A]" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Número de cuenta</label>
              <input type="text" required value={cuentaForm.numero_cuenta}
                onChange={e => setCuentaForm(p => ({ ...p, numero_cuenta: e.target.value }))}
                placeholder="1234567890"
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#71717A]" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Tipo</label>
              <select value={cuentaForm.tipo}
                onChange={e => setCuentaForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
                <option value="cheques">Cheques</option>
                <option value="ahorro">Ahorro</option>
                <option value="inversion">Inversión</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Saldo inicial</label>
              <input type="number" step="0.01" required value={cuentaForm.saldo_inicial}
                onChange={e => setCuentaForm(p => ({ ...p, saldo_inicial: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#71717A]" />
            </div>
          </div>
          <button type="submit" disabled={savingCuenta}
            className="mt-4 bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
            {savingCuenta ? 'Guardando...' : 'Guardar cuenta'}
          </button>
        </form>
      )}

      {cuentas.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl p-12 text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
          <div className="text-4xl mb-3">🏦</div>
          <p className="text-sm text-[#A1A1AA]">No hay cuentas registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cuentas.map(c => (
            <div key={c.id} className="bg-[#141414] rounded-2xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{c.banco}</span>
                <span className="text-[10px] font-medium text-[#A1A1AA] bg-[#262626] px-2 py-0.5 rounded-full uppercase">{c.tipo}</span>
              </div>
              <p className="text-xs text-[#A1A1AA] font-mono mb-3">{c.numero_cuenta}</p>
              <div className="text-xl font-extrabold text-white">{fmt(c.saldo_actual)}</div>
              <p className="text-[10px] text-[#A1A1AA] mt-0.5">Saldo actual</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Movimientos ──────────────────────────────────
  const renderMovimientos = () => (
    <div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Cuenta</label>
          <select value={movForm.cuenta_id}
            onChange={e => {
              setMovForm(p => ({ ...p, cuenta_id: e.target.value }));
              cargarMovimientos(e.target.value);
            }}
            className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
            <option value="">Seleccionar cuenta...</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco} — {c.numero_cuenta}</option>)}
          </select>
        </div>
        <div className="pt-5">
          <button onClick={() => { setShowMovForm(!showMovForm); setError(''); }}
            disabled={!movForm.cuenta_id}
            className="bg-[#0A0A0A] text-white text-xs font-semibold rounded-xl px-4 py-3 hover:bg-slate-800 transition-all disabled:opacity-40">
            {showMovForm ? 'Cancelar' : '+ Nuevo movimiento'}
          </button>
        </div>
      </div>

      {showMovForm && (
        <form onSubmit={handleCrearMovimiento} className="bg-[#141414] rounded-2xl p-6 mb-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
          <h3 className="text-sm font-semibold text-white mb-4">Nuevo movimiento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Fecha</label>
              <input type="date" required value={movForm.fecha}
                onChange={e => setMovForm(p => ({ ...p, fecha: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Tipo</label>
              <select value={movForm.tipo}
                onChange={e => setMovForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
                <option value="abono">Abono (ingreso)</option>
                <option value="cargo">Cargo (egreso)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Concepto</label>
              <input type="text" required value={movForm.concepto}
                onChange={e => setMovForm(p => ({ ...p, concepto: e.target.value }))}
                placeholder="Pago proveedor..."
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#71717A]" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Monto</label>
              <input type="number" step="0.01" required value={movForm.monto}
                onChange={e => setMovForm(p => ({ ...p, monto: e.target.value }))}
                placeholder="1000.00"
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#71717A]" />
            </div>
          </div>
          <button type="submit" disabled={savingMov}
            className="mt-4 bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
            {savingMov ? 'Guardando...' : 'Registrar movimiento'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-[#A1A1AA] text-sm">Cargando movimientos...</div>
      ) : movimientos.length === 0 && movForm.cuenta_id ? (
        <div className="bg-[#141414] rounded-2xl p-12 text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm text-[#A1A1AA]">Sin movimientos registrados</p>
        </div>
      ) : movimientos.length > 0 ? (
        <div className="bg-[#141414] rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Fecha</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Tipo</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Concepto</th>
                  <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Monto</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA] font-medium">Conciliado</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(m => (
                  <tr key={m.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A]">
                    <td className="py-3.5 px-4 text-[#D4D4D8]">{fmtFecha(m.fecha)}</td>
                    <td className="py-3.5 px-2">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        m.tipo === 'abono' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {m.tipo === 'abono' ? 'Abono' : 'Cargo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-white">{m.concepto}</td>
                    <td className={`text-right py-3.5 px-2 font-semibold ${
                      m.tipo === 'abono' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {fmt(m.monto)}
                    </td>
                    <td className="text-center py-3.5 px-4">
                      {m.conciliado ? (
                        <span className="text-emerald-400 text-sm">✓</span>
                      ) : (
                        <span className="text-[#71717A]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#141414] rounded-2xl p-12 text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
          <p className="text-sm text-[#A1A1AA]">Selecciona una cuenta para ver sus movimientos</p>
        </div>
      )}
    </div>
  );

  // ─── Conciliación ─────────────────────────────────
  const renderConciliacion = () => (
    <div>
      <h2 className="text-base font-semibold text-white mb-4">Conciliación bancaria</h2>

      <form onSubmit={handleConciliar} className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Cuenta</label>
            <select required value={concCtaId}
              onChange={e => setConcCtaId(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
              <option value="">Seleccionar...</option>
              {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco} — {c.numero_cuenta}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Mes</label>
            <select value={concMes} onChange={e => setConcMes(parseInt(e.target.value))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
              {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Año</label>
            <input type="number" min={2020} max={2050} value={concAnio}
              onChange={e => setConcAnio(parseInt(e.target.value))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Saldo estado de cuenta</label>
            <input type="number" step="0.01" required value={concSaldoEstado}
              onChange={e => setConcSaldoEstado(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-[#71717A]" />
          </div>
        </div>
        <button type="submit" disabled={savingConc || !concCtaId}
          className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
          {savingConc ? 'Conciliando...' : 'Conciliar'}
        </button>
      </form>

      {concResult && (
        <div className="bg-[#141414] rounded-2xl p-6 mt-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
          <h3 className="text-sm font-semibold text-white mb-4">Resultado de conciliación</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
              <div className="text-lg font-extrabold text-white">{fmt(concResult.saldo_sistema)}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Saldo en sistema</div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
              <div className="text-lg font-extrabold text-white">{fmt(concResult.saldo_estado_cuenta)}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Saldo estado de cuenta</div>
            </div>
            <div className={`rounded-xl p-4 text-center ${
              parseFloat(concResult.diferencia) === 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10'
            }`}>
              <div className={`text-lg font-extrabold ${
                parseFloat(concResult.diferencia) === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {fmt(concResult.diferencia)}
              </div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Diferencia</div>
            </div>
          </div>
          {parseFloat(concResult.diferencia) === 0 && (
            <div className="mt-3 text-center text-xs text-emerald-400 font-semibold bg-emerald-500/10 rounded-xl p-3">✅ Cuenta conciliada exitosamente</div>
          )}
          {parseFloat(concResult.diferencia) !== 0 && (
            <div className="mt-3 text-center text-xs text-amber-400 font-semibold bg-amber-500/10 rounded-xl p-3">⚠️ Hay diferencias por revisar</div>
          )}
        </div>
      )}
    </div>
  );

  // ─── Estado de cuenta ─────────────────────────────
  const renderEstadoCuenta = () => (
    <div>
      <h2 className="text-base font-semibold text-white mb-4">Estado de cuenta</h2>

      <div className="bg-[#141414] rounded-2xl p-6 mb-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Cuenta</label>
            <select value={ecCtaId} onChange={e => { setEcCtaId(e.target.value); setEcData(null); }}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
              <option value="">Seleccionar...</option>
              {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco} — {c.numero_cuenta}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Mes</label>
            <select value={ecMes} onChange={e => setEcMes(parseInt(e.target.value))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15">
              {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Año</label>
            <input type="number" min={2020} max={2050} value={ecAnio}
              onChange={e => setEcAnio(parseInt(e.target.value))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
          </div>
        </div>
        <button onClick={cargarEstadoCuenta} disabled={loadingEc || !ecCtaId}
          className="mt-4 bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
          {loadingEc ? 'Cargando...' : 'Consultar estado de cuenta'}
        </button>
      </div>

      {loadingEc && <div className="text-center py-8 text-[#A1A1AA] text-sm">Cargando estado de cuenta...</div>}

      {ecData && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
                <div className="text-lg font-extrabold text-white">{fmt(ecData.saldo_inicial)}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-1">Saldo inicial</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
                <div className="text-lg font-extrabold text-emerald-400">{fmt(ecData.cargos || 0)}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-1">Cargos</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
                <div className="text-lg font-extrabold text-red-400">{fmt(ecData.abonos || 0)}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-1">Abonos</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
                <div className="text-lg font-extrabold text-white">{fmt(ecData.saldo_final)}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-1">Saldo final</div>
              </div>
            </div>
          </div>

          {/* Movimientos del período */}
          {ecData.movimientos && ecData.movimientos.length > 0 && (
            <div className="bg-[#141414] rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] overflow-hidden">
              <div className="p-6 pb-0">
                <h3 className="text-sm font-semibold text-white">Movimientos del período</h3>
              </div>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#262626]">
                      <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Fecha</th>
                      <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Tipo</th>
                      <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Concepto</th>
                      <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecData.movimientos.map(m => (
                      <tr key={m.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A]">
                        <td className="py-3 px-4 text-[#D4D4D8]">{fmtFecha(m.fecha)}</td>
                        <td className="py-3 px-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            m.tipo === 'abono' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {m.tipo === 'abono' ? 'Abono' : 'Cargo'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-white">{m.concepto}</td>
                        <td className={`text-right py-3 px-4 font-semibold ${
                          m.tipo === 'abono' ? 'text-emerald-400' : 'text-red-400'
                        }`}>{fmt(m.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ─── Main Render ─────────────────────────────────
  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-white">Tesorería</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Gestión de cuentas, movimientos y conciliación</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl p-3 mb-4">{success}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#141414] rounded-xl p-1 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              tab === t.key ? 'bg-[#0A0A0A] text-white' : 'text-[#A1A1AA] hover:text-[#E5E5E5]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cuentas' && renderCuentas()}
      {tab === 'movimientos' && renderMovimientos()}
      {tab === 'conciliacion' && renderConciliacion()}
      {tab === 'estado-cuenta' && renderEstadoCuenta()}
      </div>
    </div>
  );
}
