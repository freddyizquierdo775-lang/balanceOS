import { useState, useEffect, useCallback } from 'react';

const fmt = (n) => {
  if (n === null || n === undefined) return '$0.00';
  return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Error del servidor');
  }
  if (res.status === 204) return null;
  return res.json();
};

export default function EstadosFinancieros({ usuario }) {
  const [tab, setTab] = useState('balance-general');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const [balanceData, setBalanceData] = useState(null);
  const [resultadosData, setResultadosData] = useState(null);
  const [flujoData, setFlujoData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tabs = [
    { key: 'balance-general', label: 'Balance General' },
    { key: 'estado-resultados', label: 'Estado Resultados' },
    { key: 'flujo-efectivo', label: 'Flujo Efectivo' },
  ];

  const cargarBalance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/estados-financieros/balance-general?mes=${mes}&anio=${anio}`);
      setBalanceData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  const cargarResultados = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/estados-financieros/estado-resultados?mes=${mes}&anio=${anio}`);
      setResultadosData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  const cargarFlujo = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/estados-financieros/flujo-efectivo?mes=${mes}&anio=${anio}`);
      setFlujoData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    if (tab === 'balance-general') cargarBalance();
    else if (tab === 'estado-resultados') cargarResultados();
    else if (tab === 'flujo-efectivo') cargarFlujo();
  }, [tab, cargarBalance, cargarResultados, cargarFlujo]);

  // ─── Balance General ──────────────────────────────
  const renderBalanceGeneral = () => {
    if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Cargando Balance General...</div>;
    if (!balanceData) return null;

    const renderItem = (item, depth = 0) => (
      <tr key={item.nombre || item.cuenta} className={`border-b border-slate-50 ${depth === 0 ? 'bg-slate-50/80' : ''}`}>
        <td className={`py-2.5 px-4 text-slate-900 font-${depth === 0 ? 'bold' : depth === 1 ? 'semibold' : 'medium'} text-xs`}
          style={{ paddingLeft: `${16 + depth * 20}px` }}>
          {item.nombre || item.cuenta}
        </td>
        <td className="text-right py-2.5 px-4 text-slate-900 font-semibold text-xs">{fmt(item.monto || item.saldo)}</td>
      </tr>
    );

    const renderGroup = (group, title, depth = 0) => {
      if (!group) return null;
      return (
        <div className="mb-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2">{title}</h4>
          <table className="w-full text-xs">
            <tbody>
              {Array.isArray(group) ? group.map(item => renderItem(item, depth + 1)) :
                Object.entries(group).map(([key, items]) => (
                  <>
                    {typeof items === 'object' && !Array.isArray(items) ? (
                      Object.entries(items).map(([subKey, subItems]) => (
                        <>
                          {depth < 2 && <tr className="border-b border-slate-50 bg-slate-50/40"><td className="py-2 px-4 text-slate-600 font-semibold text-xs" style={{ paddingLeft: `${16 + (depth + 1) * 20}px` }}>{subKey}</td><td></td></tr>}
                          {Array.isArray(subItems) && subItems.map(item => renderItem(item, depth + 2))}
                        </>
                      ))
                    ) : (
                      Array.isArray(items) && items.map(item => renderItem(item, depth + 1))
                    )}
                  </>
                ))
              }
            </tbody>
          </table>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Activo</h3>
          {balanceData.activo && Object.entries(balanceData.activo).map(([key, items]) => (
            <div key={key} className="mb-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2">{key}</h4>
              <table className="w-full text-xs">
                <tbody>
                  {Array.isArray(items) && items.map(item => renderItem(item, 1))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="border-t-2 border-slate-200 mt-2 pt-3 px-4 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Total Activo</span>
            <span className="text-sm font-extrabold text-slate-900">{fmt(balanceData.total_activo)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Pasivo</h3>
          {balanceData.pasivo && Object.entries(balanceData.pasivo).map(([key, items]) => (
            <div key={key} className="mb-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2">{key}</h4>
              <table className="w-full text-xs">
                <tbody>
                  {Array.isArray(items) && items.map(item => renderItem(item, 1))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="border-t-2 border-slate-200 mt-2 pt-3 px-4 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Total Pasivo</span>
            <span className="text-sm font-extrabold text-slate-900">{fmt(balanceData.total_pasivo)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Capital</h3>
          {balanceData.capital && Object.entries(balanceData.capital).map(([key, items]) => (
            <div key={key} className="mb-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2">{key}</h4>
              <table className="w-full text-xs">
                <tbody>
                  {Array.isArray(items) && items.map(item => renderItem(item, 1))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="border-t-2 border-slate-200 mt-2 pt-3 px-4 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Total Capital</span>
            <span className="text-sm font-extrabold text-slate-900">{fmt(balanceData.total_capital)}</span>
          </div>
        </div>

        {/* Ecuación contable */}
        {balanceData.total_activo && balanceData.total_pasivo && balanceData.total_capital && (
          <div className={`rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border ${
            Math.abs(parseFloat(balanceData.total_activo) - (parseFloat(balanceData.total_pasivo) + parseFloat(balanceData.total_capital))) < 0.01
              ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Ecuación contable</p>
              <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                <span className="font-bold text-slate-900">Activo {fmt(balanceData.total_activo)}</span>
                <span className="text-slate-400">=</span>
                <span className="font-bold text-slate-900">Pasivo {fmt(balanceData.total_pasivo)}</span>
                <span className="text-slate-400">+</span>
                <span className="font-bold text-slate-900">Capital {fmt(balanceData.total_capital)}</span>
              </div>
              <div className="mt-2 font-semibold text-xs">
                <span className={Math.abs(parseFloat(balanceData.total_activo) - (parseFloat(balanceData.total_pasivo) + parseFloat(balanceData.total_capital))) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}>
                  {Math.abs(parseFloat(balanceData.total_activo) - (parseFloat(balanceData.total_pasivo) + parseFloat(balanceData.total_capital))) < 0.01
                    ? '✅ Balance correcto' : '⚠️ Diferencia detectada'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Estado Resultados ────────────────────────────
  const renderEstadoResultados = () => {
    if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Cargando Estado de Resultados...</div>;
    if (!resultadosData) return null;

    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (key) => {
      setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderDetailRow = (items, sectionKey) => {
      if (!expandedSections[sectionKey] || !items || items.length === 0) return null;
      return items.map((item, i) => (
        <tr key={i} className="border-b border-slate-50">
          <td className="py-2 px-4 text-slate-600 text-xs" style={{ paddingLeft: '48px' }}>{item.nombre || item.concepto}</td>
          <td className="text-right py-2 px-4 text-slate-600 text-xs">{fmt(item.monto)}</td>
        </tr>
      ));
    };

    return (
      <div className="space-y-4">
        {/* Ingresos */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <div className="px-6 pt-5 pb-3">
            <button onClick={() => toggleSection('ingresos')}
              className="flex items-center gap-2 w-full text-left">
              <span className="text-xs text-slate-400 transition-transform duration-200" style={{ transform: expandedSections.ingresos ? 'rotate(90deg)' : '' }}>▶</span>
              <h3 className="text-sm font-semibold text-slate-900">Ingresos</h3>
            </button>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {resultadosData.ingresos && Array.isArray(resultadosData.ingresos.items) && renderDetailRow(resultadosData.ingresos.items, 'ingresos')}
              <tr className="border-t border-slate-100">
                <td className="py-3 px-6 text-sm font-bold text-emerald-600">Total Ingresos</td>
                <td className="text-right py-3 px-6 text-sm font-extrabold text-emerald-600">{fmt(resultadosData.ingresos?.total || resultadosData.total_ingresos)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Costos */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <div className="px-6 pt-5 pb-3">
            <button onClick={() => toggleSection('costos')}
              className="flex items-center gap-2 w-full text-left">
              <span className="text-xs text-slate-400 transition-transform duration-200" style={{ transform: expandedSections.costos ? 'rotate(90deg)' : '' }}>▶</span>
              <h3 className="text-sm font-semibold text-slate-900">Costos</h3>
            </button>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {resultadosData.costos && Array.isArray(resultadosData.costos.items) && renderDetailRow(resultadosData.costos.items, 'costos')}
              <tr className="border-t border-slate-100">
                <td className="py-3 px-6 text-sm font-bold text-red-600">Total Costos</td>
                <td className="text-right py-3 px-6 text-sm font-extrabold text-red-600">{fmt(resultadosData.costos?.total || resultadosData.total_costos)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Utilidad Bruta */}
        <div className={`rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border ${
          parseFloat(resultadosData.utilidad_bruta) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Utilidad Bruta</span>
            <span className={`text-sm font-extrabold ${parseFloat(resultadosData.utilidad_bruta) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(resultadosData.utilidad_bruta)}
            </span>
          </div>
        </div>

        {/* Gastos */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <div className="px-6 pt-5 pb-3">
            <button onClick={() => toggleSection('gastos')}
              className="flex items-center gap-2 w-full text-left">
              <span className="text-xs text-slate-400 transition-transform duration-200" style={{ transform: expandedSections.gastos ? 'rotate(90deg)' : '' }}>▶</span>
              <h3 className="text-sm font-semibold text-slate-900">Gastos</h3>
            </button>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {resultadosData.gastos && Array.isArray(resultadosData.gastos.items) && renderDetailRow(resultadosData.gastos.items, 'gastos')}
              <tr className="border-t border-slate-100">
                <td className="py-3 px-6 text-sm font-bold text-red-600">Total Gastos</td>
                <td className="text-right py-3 px-6 text-sm font-extrabold text-red-600">{fmt(resultadosData.gastos?.total || resultadosData.total_gastos)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Utilidad Neta */}
        <div className={`rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border-2 ${
          parseFloat(resultadosData.utilidad_neta) >= 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-base font-extrabold text-slate-900">Utilidad Neta</span>
            <span className={`text-lg font-extrabold ${parseFloat(resultadosData.utilidad_neta) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(resultadosData.utilidad_neta)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ─── Flujo Efectivo ───────────────────────────────
  const renderFlujoEfectivo = () => {
    if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Cargando Flujo de Efectivo...</div>;
    if (!flujoData) return null;

    // Calculate max for bar chart scaling
    const allValues = [];
    if (flujoData.operativo) allValues.push(Math.abs(parseFloat(flujoData.operativo.total || flujoData.operativo)));
    if (flujoData.inversion) allValues.push(Math.abs(parseFloat(flujoData.inversion.total || flujoData.inversion)));
    if (flujoData.financiamiento) allValues.push(Math.abs(parseFloat(flujoData.financiamiento.total || flujoData.financiamiento)));
    if (flujoData.saldo_inicial) allValues.push(Math.abs(parseFloat(flujoData.saldo_inicial)));
    if (flujoData.saldo_final) allValues.push(Math.abs(parseFloat(flujoData.saldo_final)));
    const maxVal = Math.max(...allValues, 1);

    const barWidth = (val) => (Math.abs(parseFloat(val)) / maxVal) * 100;

    const renderCategory = (data, label, color, key) => {
      if (!data) return null;
      const total = parseFloat(data.total || data);
      const items = data.items || [];
      const [expanded, setExpanded] = useState({});

      return (
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
            <span className={`text-sm font-extrabold ${total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(total)}
            </span>
          </div>
          {/* Bar */}
          <div className="w-full bg-slate-100 rounded-full h-4 mb-3 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${color}`}
              style={{ width: `${barWidth(total)}%` }} />
          </div>
          {/* Items */}
          {items.length > 0 && (
            <div className="mt-2">
              <button onClick={() => {}} className="text-[10px] text-slate-400 hover:text-slate-600">Ver detalle</button>
              <table className="w-full text-xs mt-2">
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-1.5 px-2 text-slate-600">{item.concepto || item.nombre}</td>
                      <td className={`text-right py-1.5 px-2 font-medium ${parseFloat(item.monto) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {fmt(item.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    };

    // Use a stateful sub-component for expandable sections
    const FlujoCategory = ({ data, label, color }) => {
      const [showDetail, setShowDetail] = useState(false);
      if (!data) return null;
      const total = parseFloat(data.total || data);
      const items = data.items || [];

      return (
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
            <span className={`text-sm font-extrabold ${total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(total)}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${color}`}
              style={{ width: `${Math.min(barWidth(total), 100)}%` }} />
          </div>
          {items.length > 0 && (
            <>
              <button onClick={() => setShowDetail(!showDetail)}
                className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <span className={`transition-transform ${showDetail ? 'rotate-90' : ''}`}>▶</span>
                {showDetail ? 'Ocultar detalle' : 'Ver detalle'}
              </button>
              {showDetail && (
                <table className="w-full text-xs mt-2">
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-1.5 px-2 text-slate-600">{item.concepto || item.nombre}</td>
                        <td className={`text-right py-1.5 px-2 font-medium ${parseFloat(item.monto) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {fmt(item.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {/* Saldo inicial / final */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Saldo inicial</p>
            <div className="text-2xl font-extrabold text-slate-900">{fmt(flujoData.saldo_inicial)}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Saldo final</p>
            <div className="text-2xl font-extrabold text-slate-900">{fmt(flujoData.saldo_final)}</div>
          </div>
        </div>

        {/* Categorías */}
        <FlujoCategory data={flujoData.operativo} label="Operativo" color="bg-blue-500" />
        <FlujoCategory data={flujoData.inversion} label="Inversión" color="bg-amber-500" />
        <FlujoCategory data={flujoData.financiamiento} label="Financiamiento" color="bg-purple-500" />

        {/* Variación neta */}
        {flujoData.variacion_neta !== undefined && (
          <div className={`rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border-2 ${
            parseFloat(flujoData.variacion_neta) >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-900">Variación neta del período</span>
              <span className={`text-base font-extrabold ${parseFloat(flujoData.variacion_neta) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmt(flujoData.variacion_neta)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">Estados Financieros</h1>
        <p className="text-sm text-slate-500 mt-1">Balance General, Estado de Resultados y Flujo de Efectivo</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>
      )}

      {/* Period selector */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-900/5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mes</label>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-xs outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
            {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Año</label>
          <input type="number" min={2020} max={2050} value={anio}
            onChange={e => setAnio(parseInt(e.target.value))}
            className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-xs outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 w-20" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-900/5 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'balance-general' && renderBalanceGeneral()}
      {tab === 'estado-resultados' && renderEstadoResultados()}
      {tab === 'flujo-efectivo' && renderFlujoEfectivo()}
    </div>
  );
}
