import { useState, useEffect } from 'react';
import { impuestos, clientes } from './api';

export default function Impuestos({ usuario }) {
  const [tab, setTab] = useState('calculadora');
  const tabs = [
    { key: 'calculadora', label: 'Calculadora IVA/ISR' },
    { key: 'declaraciones', label: 'Declaraciones' },
    { key: 'diot', label: 'DIOT' },
    { key: 'estimulos', label: 'Estímulos Fiscales' },
  ];

  // ─── Calculadora ──────────────────────────────
  const [calcForm, setCalcForm] = useState({
    ingresos: '', deducciones: '', iva_trasladado: '', iva_acreditable: '',
  });
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');

  const handleCalc = async (e) => {
    e.preventDefault();
    setCalcLoading(true);
    setCalcError('');
    try {
      const data = await impuestos.calcular({
        ingresos: parseFloat(calcForm.ingresos) || 0,
        deducciones: parseFloat(calcForm.deducciones) || 0,
        iva_trasladado: parseFloat(calcForm.iva_trasladado) || 0,
        iva_acreditable: parseFloat(calcForm.iva_acreditable) || 0,
      });
      setCalcResult(data);
    } catch (err) {
      setCalcError(err.message);
    } finally {
      setCalcLoading(false);
    }
  };

  const fmt = (n) => {
    if (n === null || n === undefined) return '$0.00';
    return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const pct = (n) => {
    if (n === null || n === undefined) return '0.00%';
    return parseFloat(n).toFixed(2) + '%';
  };

  // ─── Declaraciones ────────────────────────────
  const [clienteList, setClienteList] = useState([]);
  const [declFiltroCliente, setDeclFiltroCliente] = useState('');
  const [declFiltroMes, setDeclFiltroMes] = useState('');
  const [declFiltroAnio, setDeclFiltroAnio] = useState('');
  const [declaraciones, setDeclaraciones] = useState([]);
  const [loadingDecl, setLoadingDecl] = useState(true);
  const [showDeclForm, setShowDeclForm] = useState(false);
  const [declSaving, setDeclSaving] = useState(false);
  const [declErrors, setDeclErrors] = useState({});
  const [declForm, setDeclForm] = useState({
    cliente_id: '', tipo: 'mensual', periodo_mes: '', periodo_anio: '', conceptos: [],
  });
  const [declConcInput, setDeclConcInput] = useState({ tipo: 'ingreso', concepto: '', monto: '' });
  const now = new Date();

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await clientes.listar();
        setClienteList(data);
      } catch (_) {}
    };
    loadClientes();
  }, []);

  const loadDeclaraciones = async () => {
    setLoadingDecl(true);
    try {
      const params = new URLSearchParams();
      if (declFiltroCliente) params.set('cliente_id', declFiltroCliente);
      if (declFiltroMes) params.set('mes', declFiltroMes);
      if (declFiltroAnio) params.set('anio', declFiltroAnio);
      const qs = params.toString();
      const data = await impuestos.listarDeclaraciones(qs ? `?${qs}` : '');
      setDeclaraciones(data);
    } catch (err) {
      console.error('Error al cargar declaraciones:', err);
    } finally {
      setLoadingDecl(false);
    }
  };

  useEffect(() => { loadDeclaraciones(); }, [declFiltroCliente, declFiltroMes, declFiltroAnio]);

  const addDeclConcepto = () => {
    const c = declConcInput;
    if (!c.concepto || !c.monto) return;
    setDeclForm(prev => ({
      ...prev,
      conceptos: [...prev.conceptos, { ...c, monto: parseFloat(c.monto) }],
    }));
    setDeclConcInput({ tipo: 'ingreso', concepto: '', monto: '' });
  };

  const removeDeclConcepto = (idx) => {
    setDeclForm(prev => ({
      ...prev,
      conceptos: prev.conceptos.filter((_, i) => i !== idx),
    }));
  };

  const validateDecl = () => {
    const errs = {};
    if (!declForm.cliente_id) errs.cliente_id = 'Selecciona un cliente';
    if (!declForm.periodo_mes && declForm.tipo === 'mensual') errs.periodo_mes = 'Selecciona mes';
    if (!declForm.periodo_anio) errs.periodo_anio = 'Selecciona año';
    if (declForm.conceptos.length === 0) errs.conceptos = 'Agrega al menos un concepto';
    setDeclErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleDeclSubmit = async (e) => {
    e.preventDefault();
    if (!validateDecl()) return;
    setDeclSaving(true);
    try {
      await impuestos.crearDeclaracion({
        cliente_id: parseInt(declForm.cliente_id),
        tipo: declForm.tipo,
        periodo_mes: declForm.tipo === 'mensual' ? parseInt(declForm.periodo_mes) : null,
        periodo_anio: parseInt(declForm.periodo_anio),
        conceptos: declForm.conceptos.map(c => ({ ...c, monto: parseFloat(c.monto) })),
      });
      setShowDeclForm(false);
      setDeclForm({ cliente_id: '', tipo: 'mensual', periodo_mes: '', periodo_anio: '', conceptos: [] });
      setDeclErrors({});
      loadDeclaraciones();
    } catch (err) {
      setDeclErrors({ general: err.message });
    } finally {
      setDeclSaving(false);
    }
  };

  // ─── DIOT ─────────────────────────────────────
  const [diotCliente, setDiotCliente] = useState('');
  const [diotMes, setDiotMes] = useState(now.getMonth() + 1);
  const [diotAnio, setDiotAnio] = useState(now.getFullYear());
  const [diotData, setDiotData] = useState(null);
  const [diotLoading, setDiotLoading] = useState(false);
  const [diotError, setDiotError] = useState('');

  const loadDiot = async () => {
    if (!diotCliente) return;
    setDiotLoading(true);
    setDiotError('');
    try {
      const data = await impuestos.diot(parseInt(diotCliente), diotMes, diotAnio);
      setDiotData(data);
    } catch (err) {
      setDiotError(err.message);
      setDiotData(null);
    } finally {
      setDiotLoading(false);
    }
  };

  // ─── Estímulos Fiscales ────────────────────────
  const [estimulos, setEstimulos] = useState([]);
  const [estimulosLoading, setEstimulosLoading] = useState(true);
  const [estimuloCliente, setEstimuloCliente] = useState('');
  const [estimulosCliente, setEstimulosCliente] = useState([]);
  const [estimulosClienteLoading, setEstimulosClienteLoading] = useState(false);
  const [showEstimuloForm, setShowEstimuloForm] = useState(false);
  const [estimuloForm, setEstimuloForm] = useState({
    nombre: '', tipo: 'credito', porcentaje: '', impuesto_aplicable: 'ISR', fundamento_legal: '', descripcion: '',
  });
  const [estimuloError, setEstimuloError] = useState('');
  const [estimuloCalcForm, setEstimuloCalcForm] = useState({
    ingresos: '', deducciones: '', iva_trasladado: '', iva_acreditable: '',
    ieps_trasladado: '', ieps_acreditable: '', isn_base: '',
    estimulos_ids: [],
  });
  const [estimuloCalcResult, setEstimuloCalcResult] = useState(null);
  const [estimuloCalcLoading, setEstimuloCalcLoading] = useState(false);
  const [estimuloCalcError, setEstimuloCalcError] = useState('');

  const loadEstimulos = async () => {
    setEstimulosLoading(true);
    try {
      const data = await impuestos.listarEstimulos(true);
      setEstimulos(data);
    } catch (_) {
      setEstimulos([]);
    } finally {
      setEstimulosLoading(false);
    }
  };

  const loadEstimulosCliente = async () => {
    if (!estimuloCliente) { setEstimulosCliente([]); return; }
    setEstimulosClienteLoading(true);
    try {
      const data = await impuestos.listarEstimulosCliente(parseInt(estimuloCliente));
      setEstimulosCliente(data);
    } catch (_) {
      setEstimulosCliente([]);
    } finally {
      setEstimulosClienteLoading(false);
    }
  };

  useEffect(() => { loadEstimulos(); }, []);
  useEffect(() => { loadEstimulosCliente(); }, [estimuloCliente]);

  const handleAsignarEstimulo = async (estimuloId) => {
    if (!estimuloCliente) return;
    try {
      await impuestos.asignarEstimuloCliente(parseInt(estimuloCliente), {
        cliente_id: parseInt(estimuloCliente), estimulo_id: estimuloId,
      });
      loadEstimulosCliente();
      setEstimuloError('');
    } catch (err) {
      setEstimuloError(err.message);
    }
  };

  const handleQuitarEstimulo = async (estimuloId) => {
    if (!estimuloCliente) return;
    try {
      await impuestos.quitarEstimuloCliente(parseInt(estimuloCliente), estimuloId);
      loadEstimulosCliente();
      setEstimuloError('');
    } catch (err) {
      setEstimuloError(err.message);
    }
  };

  const handleEstimuloSubmit = async (e) => {
    e.preventDefault();
    try {
      await impuestos.crearEstimulo({
        nombre: estimuloForm.nombre,
        tipo: estimuloForm.tipo,
        porcentaje: parseFloat(estimuloForm.porcentaje) || 0,
        impuesto_aplicable: estimuloForm.impuesto_aplicable,
        fundamento_legal: estimuloForm.fundamento_legal,
        descripcion: estimuloForm.descripcion,
      });
      setShowEstimuloForm(false);
      setEstimuloForm({ nombre: '', tipo: 'credito', porcentaje: '', impuesto_aplicable: 'ISR', fundamento_legal: '', descripcion: '' });
      loadEstimulos();
      setEstimuloError('');
    } catch (err) {
      setEstimuloError(err.message);
    }
  };

  const handleSeedEstimulos = async () => {
    try {
      await impuestos.seedEstimulos();
      loadEstimulos();
      setEstimuloError('');
    } catch (err) {
      setEstimuloError(err.message);
    }
  };

  const handleEstimuloCalc = async (e) => {
    e.preventDefault();
    setEstimuloCalcLoading(true);
    setEstimuloCalcError('');
    try {
      const data = await impuestos.calcularCompleto({
        ingresos: parseFloat(estimuloCalcForm.ingresos) || 0,
        deducciones: parseFloat(estimuloCalcForm.deducciones) || 0,
        iva_trasladado: parseFloat(estimuloCalcForm.iva_trasladado) || 0,
        iva_acreditable: parseFloat(estimuloCalcForm.iva_acreditable) || 0,
        ieps_trasladado: parseFloat(estimuloCalcForm.ieps_trasladado) || 0,
        ieps_acreditable: parseFloat(estimuloCalcForm.ieps_acreditable) || 0,
        isn_base: parseFloat(estimuloCalcForm.isn_base) || 0,
        periodo_mes: new Date().getMonth() + 1,
        periodo_anio: new Date().getFullYear(),
        estimulos_ids: estimuloCalcForm.estimulos_ids,
      });
      setEstimuloCalcResult(data);
    } catch (err) {
      setEstimuloCalcError(err.message);
    } finally {
      setEstimuloCalcLoading(false);
    }
  };

  const toggleEstimuloCalc = (id) => {
    setEstimuloCalcForm(prev => {
      const ids = prev.estimulos_ids.includes(id)
        ? prev.estimulos_ids.filter(x => x !== id)
        : [...prev.estimulos_ids, id];
      return { ...prev, estimulos_ids: ids };
    });
  };

  // ─── Helpers ──────────────────────────────────
  const meses = [
    { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
    { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
    { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
    { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
  ];
  const anios = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);

  const Logo = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#71717A] shrink-0">
      <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
      <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
      <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
    </svg>
  );

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Logo />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-white">Impuestos</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">IVA, ISR y DIOT</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#141414] rounded-2xl p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[#262626] w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              tab === t.key ? 'bg-[#0A0A0A] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-[#E5E5E5] hover:bg-[#1A1A1A]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── CALCULADORA ───────────────────────── */}
      {tab === 'calculadora' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input form */}
          <form onSubmit={handleCalc} className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] h-fit">
            <h2 className="text-base font-semibold text-white mb-5">Calculadora de Impuestos</h2>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Ingresos brutos</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]">$</span>
                  <input type="number" step="0.01" min="0" required value={calcForm.ingresos}
                    onChange={e => setCalcForm({...calcForm, ingresos: e.target.value})} placeholder="100,000.00"
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-3.5 pl-8 pr-4 text-sm text-white outline-none transition-all duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 focus:bg-[#1A1A1A] placeholder:text-[#71717A]"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Deducciones autorizadas</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]">$</span>
                  <input type="number" step="0.01" min="0" value={calcForm.deducciones}
                    onChange={e => setCalcForm({...calcForm, deducciones: e.target.value})} placeholder="60,000.00"
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-3.5 pl-8 pr-4 text-sm outline-none transition-all duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 focus:bg-[#1A1A1A] placeholder:text-[#71717A]"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">IVA trasladado</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]">$</span>
                    <input type="number" step="0.01" min="0" value={calcForm.iva_trasladado}
                      onChange={e => setCalcForm({...calcForm, iva_trasladado: e.target.value})} placeholder="16,000.00"
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-3.5 pl-8 pr-4 text-sm outline-none transition-all duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 focus:bg-[#1A1A1A] placeholder:text-[#71717A]"/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">IVA acreditable</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]">$</span>
                    <input type="number" step="0.01" min="0" value={calcForm.iva_acreditable}
                      onChange={e => setCalcForm({...calcForm, iva_acreditable: e.target.value})} placeholder="9,600.00"
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-3.5 pl-8 pr-4 text-sm outline-none transition-all duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 focus:bg-[#1A1A1A] placeholder:text-[#71717A]"/>
                  </div>
                </div>
              </div>
              {calcError && (
                <div className="bg-red-500/10 border border-red-200 text-red-700 text-sm rounded-xl p-3">{calcError}</div>
              )}
              <button type="submit" disabled={calcLoading || !calcForm.ingresos}
                className="w-full bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl py-3.5 hover:bg-slate-800 transition-all disabled:opacity-50">
                {calcLoading ? 'Calculando...' : 'Calcular'}
              </button>
            </div>
          </form>

          {/* Results */}
          <div className="space-y-4">
            {calcResult && (
              <>
                {/* IVA Card */}
                <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
                  <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">IVA</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className={`text-lg font-extrabold ${parseFloat(calcResult.iva_por_pagar || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {fmt(calcResult.iva_por_pagar)}
                      </div>
                      <div className="text-[10px] text-[#A1A1AA] mt-1">Por pagar</div>
                    </div>
                    <div>
                      <div className={`text-lg font-extrabold ${parseFloat(calcResult.iva_a_favor || 0) > 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {fmt(calcResult.iva_a_favor)}
                      </div>
                      <div className="text-[10px] text-[#A1A1AA] mt-1">A favor</div>
                    </div>
                  </div>
                </div>

                {/* ISR Card */}
                <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
                  <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">ISR</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">Utilidad fiscal</span>
                      <span className="text-white font-semibold">{fmt(calcResult.utilidad_fiscal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">Tasa efectiva</span>
                      <span className="text-white font-semibold">{pct(calcResult.tasa_efectiva)}</span>
                    </div>
                    <div className="border-t border-[#262626] pt-3 flex justify-between text-sm">
                      <span className="text-[#E5E5E5] font-medium">ISR bruto</span>
                      <span className="text-white font-bold">{fmt(calcResult.isr_bruto)}</span>
                    </div>
                    {calcResult.isr_retenciones > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#A1A1AA]">Retenciones</span>
                        <span className="text-emerald-400 font-semibold">-{fmt(calcResult.isr_retenciones)}</span>
                      </div>
                    )}
                    {calcResult.isr_pago_provisional > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#A1A1AA]">Pagos provisionales</span>
                        <span className="text-emerald-400 font-semibold">-{fmt(calcResult.isr_pago_provisional)}</span>
                      </div>
                    )}
                    <div className="border-t-2 border-[#333333] pt-3 flex justify-between text-sm">
                      <span className="text-white font-bold text-base">ISR neto</span>
                      <span className={`font-extrabold text-base ${parseFloat(calcResult.isr_neto || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {fmt(calcResult.isr_neto)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Brackets Table + Break-even */}
                {calcResult.brackets && calcResult.brackets.length > 0 && (
                  <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
                    <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">
                      Tarifa Progresiva ISR Art. 152 LISR
                    </h3>

                    {/* Break-even visual */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] mb-1">
                        <span>Posición en la tarifa</span>
                        <span>Utilidad: {fmt(calcResult.utilidad_fiscal)}</span>
                      </div>
                      <div className="relative h-2 bg-[#262626] rounded-full overflow-hidden">
                        {/* Background bracket segments */}
                        {calcResult.brackets.map((b, i) => {
                          const total = calcResult.brackets[calcResult.brackets.length - 1]?.limite_inferior || 1;
                          const loPct = (parseFloat(b.limite_inferior) / parseFloat(total)) * 100;
                          const hi = b.limite_superior;
                          const hiPct = hi === 'Infinity' || hi === null
                            ? 100
                            : (Math.min(parseFloat(hi), parseFloat(total)) / parseFloat(total)) * 100;
                          const width = hiPct - loPct;
                          const isActive = parseFloat(b.base_gravable || 0) > 0 && (
                            i === calcResult.brackets.length - 1 || parseFloat(calcResult.brackets[i + 1]?.base_gravable || 0) === 0
                          );
                          return (
                            <div key={i}
                              className={`absolute top-0 h-full transition-all ${isActive ? 'bg-[#2E8B57] z-10' : 'bg-[#333333]'}`}
                              style={{ left: `${loPct}%`, width: `${Math.max(width, 0.3)}%` }}
                              title={`Bracket ${i + 1}: ${fmt(b.limite_inferior)} – ${hi === 'Infinity' || hi === null ? '∞' : fmt(hi)}`}
                            />
                          );
                        })}
                        {/* Marker dot */}
                        {(() => {
                          const util = parseFloat(calcResult.utilidad_fiscal || 0);
                          const total = parseFloat(calcResult.brackets[calcResult.brackets.length - 1]?.limite_inferior || 1);
                          const pct = Math.min((util / total) * 100, 100);
                          return util > 0 ? (
                            <div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: `calc(${pct}% - 5px)` }}>
                              <div className="w-2.5 h-2.5 bg-[#0A0A0A] rounded-full border-2 border-white shadow-sm" />
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex justify-between text-[9px] text-[#71717A] mt-0.5">
                        <span>$0</span>
                        <span>{fmt(calcResult.brackets[calcResult.brackets.length - 1]?.limite_inferior)}+</span>
                      </div>
                    </div>

                    {/* Brackets table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-[#262626] text-[#A1A1AA]">
                            <th className="text-left py-1.5 pr-2 font-medium">Límite inf.</th>
                            <th className="text-left py-1.5 px-2 font-medium">Límite sup.</th>
                            <th className="text-right py-1.5 px-2 font-medium">Tasa</th>
                            <th className="text-right py-1.5 px-2 font-medium">Cuota fija</th>
                            <th className="text-right py-1.5 px-2 font-medium">Base gravable</th>
                            <th className="text-right py-1.5 pl-2 font-medium">Impuesto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calcResult.brackets.map((b, i) => {
                            const isActive = parseFloat(b.base_gravable || 0) > 0 && (
                              i === calcResult.brackets.length - 1 ||
                              parseFloat(calcResult.brackets[i + 1]?.base_gravable || 0) === 0
                            );
                            const hiDisplay = b.limite_superior === 'Infinity' || b.limite_superior === null
                              ? '∞'
                              : fmt(b.limite_superior);
                            return (
                              <tr key={i}
                                className={`border-b border-slate-50 transition-colors ${isActive ? 'bg-[#2E8B57]/8 font-semibold' : parseFloat(b.base_gravable || 0) > 0 ? 'bg-[#1A1A1A]' : 'text-[#71717A]'}`}>
                                <td className="py-1.5 pr-2 text-[#E5E5E5] font-mono">{fmt(b.limite_inferior)}</td>
                                <td className="py-1.5 px-2 text-[#E5E5E5] font-mono">{hiDisplay}</td>
                                <td className="py-1.5 px-2 text-right font-mono">{(parseFloat(b.tasa) * 100).toFixed(2)}%</td>
                                <td className="py-1.5 px-2 text-right font-mono">{fmt(b.cuota_fija)}</td>
                                <td className={`py-1.5 px-2 text-right font-mono ${isActive ? 'text-[#2E8B57]' : ''}`}>
                                  {fmt(b.base_gravable)}
                                </td>
                                <td className={`py-1.5 pl-2 text-right font-mono ${isActive ? 'text-[#2E8B57]' : ''}`}>
                                  {fmt(b.impuesto)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {!calcResult && !calcLoading && (
              <div className="bg-[#141414] rounded-2xl p-12 text-center border border-[#262626] shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <div className="text-4xl mb-3">🧮</div>
                <p className="text-sm text-[#A1A1AA]">Ingresa los datos y presiona "Calcular"</p>
                <p className="text-xs text-[#71717A] mt-1">IVA por pagar/a favor + ISR bruto/neto</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DECLARACIONES ──────────────────────── */}
      {tab === 'declaraciones' && (
        <div>
          {/* Filter + New */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select value={declFiltroCliente} onChange={e => setDeclFiltroCliente(e.target.value)}
              className="bg-[#141414] border border-[#333333] rounded-xl p-3 text-sm outline-none focus:border-slate-400 min-w-[200px]">
              <option value="">Todos los clientes</option>
              {clienteList.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
            <select value={declFiltroMes} onChange={e => setDeclFiltroMes(e.target.value)}
              className="bg-[#141414] border border-[#333333] rounded-xl p-3 text-sm outline-none focus:border-slate-400">
              <option value="">Todos los meses</option>
              {meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={declFiltroAnio} onChange={e => setDeclFiltroAnio(e.target.value)}
              className="bg-[#141414] border border-[#333333] rounded-xl p-3 text-sm outline-none focus:border-slate-400">
              <option value="">Todos los años</option>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => { setShowDeclForm(!showDeclForm); setDeclErrors({}); }}
              className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-slate-800 transition-all duration-200 ml-auto">
              {showDeclForm ? 'Cancelar' : '+ Nueva Declaración'}
            </button>
          </div>

          {declErrors.general && (
            <div className="bg-red-500/10 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{declErrors.general}</div>
          )}

          {/* New declaration form */}
          {showDeclForm && (
            <form onSubmit={handleDeclSubmit} className="bg-[#141414] rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
              <h2 className="text-base font-semibold text-white mb-4">Nueva Declaración</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Cliente *</label>
                  <select value={declForm.cliente_id} onChange={e => setDeclForm({...declForm, cliente_id: e.target.value})} required
                    className={`w-full bg-[#1A1A1A] border rounded-xl p-3 text-sm outline-none focus:ring-2 ${
                      declErrors.cliente_id ? 'border-red-300' : 'border-[#262626] focus:border-[#10B981] focus:ring-[#2E8B57]/15'
                    }`}>
                    <option value="">Seleccionar...</option>
                    {clienteList.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Tipo</label>
                  <select value={declForm.tipo} onChange={e => setDeclForm({...declForm, tipo: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15">
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Período</label>
                  <div className="flex gap-2">
                    {declForm.tipo === 'mensual' && (
                      <select value={declForm.periodo_mes} onChange={e => setDeclForm({...declForm, periodo_mes: e.target.value})}
                        className={`flex-1 bg-[#1A1A1A] border rounded-xl p-3 text-sm outline-none focus:ring-2 ${
                          declErrors.periodo_mes ? 'border-red-300' : 'border-[#262626] focus:border-[#10B981] focus:ring-[#2E8B57]/15'
                        }`}>
                        <option value="">Mes</option>
                        {meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                      </select>
                    )}
                    <select value={declForm.periodo_anio} onChange={e => setDeclForm({...declForm, periodo_anio: e.target.value})}
                      className={`flex-1 bg-[#1A1A1A] border rounded-xl p-3 text-sm outline-none focus:ring-2 ${
                        declErrors.periodo_anio ? 'border-red-300' : 'border-[#262626] focus:border-[#10B981] focus:ring-[#2E8B57]/15'
                      }`}>
                      <option value="">Año</option>
                      {anios.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Conceptos */}
              <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-3">Conceptos</h3>
              {declForm.conceptos.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#262626]">
                        <th className="text-left py-2 pr-2 text-[#A1A1AA] font-medium">Tipo</th>
                        <th className="text-left py-2 px-2 text-[#A1A1AA] font-medium">Concepto</th>
                        <th className="text-right py-2 px-2 text-[#A1A1AA] font-medium">Monto</th>
                        <th className="py-2 pl-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {declForm.conceptos.map((c, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-2 pr-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              c.tipo === 'ingreso' ? 'bg-emerald-500/10 text-emerald-400' :
                              c.tipo === 'deduccion' ? 'bg-red-500/10 text-red-400' : 'bg-blue-50 text-blue-600'
                            }`}>{c.tipo}</span>
                          </td>
                          <td className="py-2 px-2 text-white">{c.concepto}</td>
                          <td className="text-right py-2 px-2 text-[#D4D4D8] font-mono">{fmt(c.monto)}</td>
                          <td className="py-2 pl-2">
                            <button type="button" onClick={() => removeDeclConcepto(i)}
                              className="text-[#71717A] hover:text-red-400 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#333333]">
                        <td colSpan={2} className="py-2 pr-2 text-white font-bold">Total</td>
                        <td className="text-right py-2 px-2 text-white font-bold">{fmt(declForm.conceptos.reduce((s, c) => s + c.monto, 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {declErrors.conceptos && <p className="text-xs text-red-400 mb-2">{declErrors.conceptos}</p>}

              {/* Add concept */}
              <div className="flex items-end gap-2 bg-[#1A1A1A] rounded-xl p-3 border border-[#262626]">
                <select value={declConcInput.tipo} onChange={e => setDeclConcInput({...declConcInput, tipo: e.target.value})}
                  className="bg-[#141414] border border-[#333333] rounded-lg p-2 text-xs outline-none focus:border-slate-400">
                  <option value="ingreso">Ingreso</option>
                  <option value="deduccion">Deducción</option>
                  <option value="otro">Otro</option>
                </select>
                <div className="flex-1">
                  <input placeholder="Concepto" value={declConcInput.concepto} onChange={e => setDeclConcInput({...declConcInput, concepto: e.target.value})}
                    className="w-full bg-[#141414] border border-[#333333] rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-[#71717A]"/>
                </div>
                <div className="w-28">
                  <input type="number" step="0.01" min="0" placeholder="Monto" value={declConcInput.monto} onChange={e => setDeclConcInput({...declConcInput, monto: e.target.value})}
                    className="w-full bg-[#141414] border border-[#333333] rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-[#71717A]"/>
                </div>
                <button type="button" onClick={addDeclConcepto}
                  className="bg-[#333333] text-[#D4D4D8] text-xs font-semibold rounded-lg px-3 py-2 hover:bg-slate-300 transition-colors shrink-0">+</button>
              </div>

              <div className="mt-4 flex gap-3">
                <button type="submit" disabled={declSaving}
                  className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
                  {declSaving ? 'Guardando...' : 'Guardar declaración'}
                </button>
              </div>
            </form>
          )}

          {/* Declaraciones list */}
          {loadingDecl ? (
            <div className="text-center py-12 text-[#A1A1AA] text-sm">Cargando...</div>
          ) : declaraciones.length === 0 ? (
            <div className="text-center py-12 text-[#A1A1AA] text-sm">No hay declaraciones registradas</div>
          ) : (
            <div className="space-y-3">
              {declaraciones.map(d => (
                <div key={d.id} className="bg-[#141414] rounded-2xl p-5 shadow-[0_6px_16px_rgba(0,0,0,0.03)] border border-[#262626] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition-all duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold text-white bg-slate-500 px-2 py-0.5 rounded-full uppercase">{d.tipo}</span>
                      <span className="font-semibold text-white">{d.cliente_razon_social || `Cliente #${d.cliente_id}`}</span>
                      {d.periodo_mes && <span className="text-xs text-[#A1A1AA]">{meses.find(m => m.v === d.periodo_mes)?.l} {d.periodo_anio}</span>}
                      {!d.periodo_mes && <span className="text-xs text-[#A1A1AA]">Ejercicio {d.periodo_anio}</span>}
                    </div>
                  </div>
                  {d.conceptos && d.conceptos.length > 0 && (
                    <div className="text-xs text-[#A1A1AA] mt-2">
                      {d.conceptos.length} concepto(s) · Total: {fmt(d.conceptos.reduce((s, c) => s + parseFloat(c.monto || 0), 0))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── DIOT ────────────────────────────────── */}
      {tab === 'diot' && (
        <div>
          {/* Filter */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <select value={diotCliente} onChange={e => setDiotCliente(e.target.value)}
              className="bg-[#141414] border border-[#333333] rounded-xl p-3 text-sm outline-none focus:border-slate-400 min-w-[250px]">
              <option value="">Seleccionar cliente...</option>
              {clienteList.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
            <select value={diotMes} onChange={e => setDiotMes(parseInt(e.target.value))}
              className="bg-[#141414] border border-[#333333] rounded-xl p-3 text-sm outline-none focus:border-slate-400">
              {meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={diotAnio} onChange={e => setDiotAnio(parseInt(e.target.value))}
              className="bg-[#141414] border border-[#333333] rounded-xl p-3 text-sm outline-none focus:border-slate-400">
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={loadDiot} disabled={!diotCliente || diotLoading}
              className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
              {diotLoading ? 'Consultando...' : 'Consultar DIOT'}
            </button>
          </div>

          {diotError && (
            <div className="bg-red-500/10 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{diotError}</div>
          )}

          {/* DIOT Results */}
          {diotData && (
            <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
              <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-5">
                DIOT — {clienteList.find(c => c.id === parseInt(diotCliente))?.razon_social || ''} — {meses.find(m => m.v === diotMes)?.l} {diotAnio}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="bg-[#1A1A1A] rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-white">{fmt(diotData.iva_acreditable)}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">IVA Acreditable</div>
                </div>
                <div className="bg-[#1A1A1A] rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-white">{fmt(diotData.iva_trasladado)}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">IVA Trasladado</div>
                </div>
                <div className="bg-[#1A1A1A] rounded-2xl p-4">
                  <div className={`text-xl font-extrabold ${parseFloat(diotData.diferencia || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(diotData.diferencia)}
                  </div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">Diferencia</div>
                </div>
                <div className="bg-[#1A1A1A] rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-white">{diotData.num_proveedores || 0}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1"># Proveedores</div>
                </div>
              </div>
              {diotData.proveedores && diotData.proveedores.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-3">Proveedores</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#262626]">
                          <th className="text-left py-2 pr-2 text-[#A1A1AA] font-medium">RFC</th>
                          <th className="text-left py-2 px-2 text-[#A1A1AA] font-medium">Nombre</th>
                          <th className="text-right py-2 px-2 text-[#A1A1AA] font-medium">Total facturado</th>
                          <th className="text-right py-2 pl-2 text-[#A1A1AA] font-medium">IVA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diotData.proveedores.map((p, i) => (
                          <tr key={i} className="border-b border-slate-50">
                            <td className="py-2 pr-2 font-mono text-[#D4D4D8]">{p.rfc}</td>
                            <td className="py-2 px-2 text-white">{p.nombre}</td>
                            <td className="text-right py-2 px-2 text-[#D4D4D8] font-mono">{fmt(p.total_facturado)}</td>
                            <td className="text-right py-2 pl-2 text-[#D4D4D8] font-mono">{fmt(p.iva)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {!diotData && !diotLoading && !diotError && (
            <div className="bg-[#141414] rounded-2xl p-12 text-center border border-[#262626] shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm text-[#A1A1AA]">Selecciona un cliente, período y presiona "Consultar DIOT"</p>
            </div>
          )}
        </div>
      )}

      {/* ─── ESTÍMULOS FISCALES ─────────────────── */}
      {tab === 'estimulos' && (
        <div>
          {/* Header actions */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <select value={estimuloCliente} onChange={e => setEstimuloCliente(e.target.value)}
              className="bg-[#141414] border border-[#333333] rounded-xl p-3 text-sm outline-none focus:border-slate-400 min-w-[250px]">
              <option value="">Seleccionar cliente...</option>
              {clienteList.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
            <button onClick={handleSeedEstimulos}
              className="bg-emerald-600 text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-emerald-700 transition-all duration-200 disabled:opacity-50"
              title="Insertar estímulos fiscales predefinidos">
              🌱 Seed Estímulos
            </button>
            <button onClick={() => { setShowEstimuloForm(!showEstimuloForm); setEstimuloError(''); }}
              className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-slate-800 transition-all duration-200 ml-auto">
              {showEstimuloForm ? 'Cancelar' : '+ Nuevo Estímulo'}
            </button>
          </div>

          {estimuloError && (
            <div className="bg-red-500/10 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{estimuloError}</div>
          )}

          {/* New estimulo form */}
          {showEstimuloForm && (
            <form onSubmit={handleEstimuloSubmit} className="bg-[#141414] rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
              <h2 className="text-base font-semibold text-white mb-4">Nuevo Estímulo Fiscal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Nombre *</label>
                  <input value={estimuloForm.nombre} onChange={e => setEstimuloForm({...estimuloForm, nombre: e.target.value})} required
                    placeholder="Ej. Deducción inmediata inversiones"
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15"/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Tipo</label>
                  <select value={estimuloForm.tipo} onChange={e => setEstimuloForm({...estimuloForm, tipo: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15">
                    <option value="credito">Crédito fiscal</option>
                    <option value="deduccion">Deducción</option>
                    <option value="exencion">Exención</option>
                    <option value="tasa_reducida">Tasa reducida</option>
                    <option value="diferimiento">Diferimiento</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Porcentaje</label>
                  <div className="relative">
                    <input type="number" step="0.0001" min="0" max="1" value={estimuloForm.porcentaje}
                      onChange={e => setEstimuloForm({...estimuloForm, porcentaje: e.target.value})}
                      placeholder="0.30 = 30%"
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 pr-10 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15"/>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#A1A1AA]">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Impuesto aplicable</label>
                  <select value={estimuloForm.impuesto_aplicable} onChange={e => setEstimuloForm({...estimuloForm, impuesto_aplicable: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15">
                    <option value="ISR">ISR</option>
                    <option value="IVA">IVA</option>
                    <option value="IEPS">IEPS</option>
                    <option value="ISN">ISN</option>
                    <option value="ISH">ISH</option>
                    <option value="CEDULAR">Impuesto Cedular</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Fundamento legal</label>
                  <input value={estimuloForm.fundamento_legal} onChange={e => setEstimuloForm({...estimuloForm, fundamento_legal: e.target.value})}
                    placeholder="Art. 204 LISR"
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15"/>
                </div>
              </div>
              <button type="submit" disabled={!estimuloForm.nombre}
                className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
                Guardar Estímulo
              </button>
            </form>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Estímulos disponibles */}
            <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
              <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">Estímulos Disponibles</h3>
              {estimulosLoading ? (
                <div className="text-center py-8 text-[#A1A1AA] text-sm">Cargando...</div>
              ) : estimulos.length === 0 ? (
                <div className="text-center py-8 text-[#A1A1AA] text-sm">
                  No hay estímulos. Presiona "🌱 Seed Estímulos" o "+ Nuevo Estímulo"
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {estimulos.map(est => {
                    const asignado = estimulosCliente.some(ce => ce.estimulo_id === est.id);
                    return (
                      <div key={est.id} className={`rounded-xl p-4 border transition-all ${
                        asignado ? 'bg-emerald-500/10 border-emerald-200' : 'bg-[#1A1A1A] border-[#262626]'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white truncate">{est.nombre}</span>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#333333] text-[#D4D4D8]">{est.impuesto_aplicable}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                est.tipo === 'credito' ? 'bg-blue-50 text-blue-600' :
                                est.tipo === 'deduccion' ? 'bg-amber-500/10 text-amber-600' :
                                est.tipo === 'exencion' ? 'bg-emerald-500/10 text-emerald-400' :
                                'bg-purple-50 text-purple-600'
                              }`}>{est.tipo}</span>
                              <span className="text-xs text-[#A1A1AA] font-mono">{(parseFloat(est.porcentaje) * 100).toFixed(1)}%</span>
                            </div>
                            {est.fundamento_legal && (
                              <div className="text-[10px] text-[#A1A1AA] mt-1 truncate">{est.fundamento_legal}</div>
                            )}
                          </div>
                          <div className="shrink-0">
                            {estimuloCliente ? (
                              asignado ? (
                                <button onClick={() => handleQuitarEstimulo(est.id)}
                                  className="text-xs text-red-400 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
                                  Quitar
                                </button>
                              ) : (
                                <button onClick={() => handleAsignarEstimulo(est.id)}
                                  className="text-xs text-[#2E8B57] hover:text-emerald-700 font-medium px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-colors">
                                  + Asignar
                                </button>
                              )
                            ) : (
                              <span className="text-[10px] text-[#71717A]">Selecciona cliente</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Estímulos del cliente + Cálculo */}
            <div className="space-y-6">
              {/* Estímulos del cliente */}
              <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
                <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">
                  Estímulos del Cliente
                  {estimuloCliente && clienteList.find(c => c.id === parseInt(estimuloCliente)) && (
                    <span className="text-white ml-1 normal-case">
                      — {clienteList.find(c => c.id === parseInt(estimuloCliente)).razon_social}
                    </span>
                  )}
                </h3>
                {!estimuloCliente ? (
                  <div className="text-center py-8 text-[#A1A1AA] text-sm">
                    Selecciona un cliente para ver sus estímulos
                  </div>
                ) : estimulosClienteLoading ? (
                  <div className="text-center py-8 text-[#A1A1AA] text-sm">Cargando...</div>
                ) : estimulosCliente.length === 0 ? (
                  <div className="text-center py-8 text-[#A1A1AA] text-sm">
                    No tiene estímulos asignados
                  </div>
                ) : (
                  <div className="space-y-2">
                    {estimulosCliente.map(ce => {
                      const est = estimulos.find(e => e.id === ce.estimulo_id);
                      if (!est) return null;
                      return (
                        <div key={ce.id} className="flex items-center justify-between bg-emerald-500/10 rounded-xl p-3 border border-emerald-100">
                          <div className="text-sm font-medium text-white">{est.nombre}</div>
                          <button onClick={() => handleQuitarEstimulo(est.id)}
                            className="text-xs text-red-400 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Calculadora con estímulos */}
              <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
                <h3 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">
                  Calcular con Estímulos
                </h3>
                <form onSubmit={handleEstimuloCalc} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Ingresos</label>
                      <input type="number" step="0.01" min="0" required value={estimuloCalcForm.ingresos}
                        onChange={e => setEstimuloCalcForm({...estimuloCalcForm, ingresos: e.target.value})} placeholder="100,000"
                        className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-2.5 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#71717A]"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Deducciones</label>
                      <input type="number" step="0.01" min="0" value={estimuloCalcForm.deducciones}
                        onChange={e => setEstimuloCalcForm({...estimuloCalcForm, deducciones: e.target.value})} placeholder="60,000"
                        className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-2.5 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#71717A]"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">IVA Trasladado</label>
                      <input type="number" step="0.01" min="0" value={estimuloCalcForm.iva_trasladado}
                        onChange={e => setEstimuloCalcForm({...estimuloCalcForm, iva_trasladado: e.target.value})} placeholder="16,000"
                        className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-2.5 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#71717A]"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">IVA Acreditable</label>
                      <input type="number" step="0.01" min="0" value={estimuloCalcForm.iva_acreditable}
                        onChange={e => setEstimuloCalcForm({...estimuloCalcForm, iva_acreditable: e.target.value})} placeholder="9,600"
                        className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-2.5 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#71717A]"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">IEPS Trasladado</label>
                      <input type="number" step="0.01" min="0" value={estimuloCalcForm.ieps_trasladado}
                        onChange={e => setEstimuloCalcForm({...estimuloCalcForm, ieps_trasladado: e.target.value})} placeholder="0"
                        className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-2.5 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#71717A]"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">IEPS Acreditable</label>
                      <input type="number" step="0.01" min="0" value={estimuloCalcForm.ieps_acreditable}
                        onChange={e => setEstimuloCalcForm({...estimuloCalcForm, ieps_acreditable: e.target.value})} placeholder="0"
                        className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-2.5 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#71717A]"/>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Base ISN (Nómina)</label>
                      <input type="number" step="0.01" min="0" value={estimuloCalcForm.isn_base}
                        onChange={e => setEstimuloCalcForm({...estimuloCalcForm, isn_base: e.target.value})} placeholder="50,000"
                        className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl py-2.5 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#71717A]"/>
                    </div>
                  </div>

                  {/* Estímulos toggle para el cálculo */}
                  {estimulos.length > 0 && (
                    <div>
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-2">
                        Estímulos a aplicar ({estimuloCalcForm.estimulos_ids.length} seleccionados)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {estimulos.map(est => (
                          <button key={est.id} type="button" onClick={() => toggleEstimuloCalc(est.id)}
                            className={`text-[10px] font-medium px-2.5 py-1.5 rounded-full border transition-all ${
                              estimuloCalcForm.estimulos_ids.includes(est.id)
                                ? 'bg-[#2E8B57] text-white border-[#2E8B57]'
                                : 'bg-[#141414] text-[#A1A1AA] border-[#333333] hover:border-slate-300'
                            }`}>
                            {est.nombre.length > 25 ? est.nombre.slice(0, 25) + '...' : est.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {estimuloCalcError && (
                    <div className="bg-red-500/10 border border-red-200 text-red-700 text-sm rounded-xl p-3">{estimuloCalcError}</div>
                  )}
                  <button type="submit" disabled={estimuloCalcLoading}
                    className="w-full bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
                    {estimuloCalcLoading ? 'Calculando...' : 'Calcular con Estímulos'}
                  </button>
                </form>

                {/* Resultados del cálculo */}
                {estimuloCalcResult && estimuloCalcResult.resumen && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider">Resultados</h4>
                    {estimuloCalcResult.resumen.map((r, i) => (
                      <div key={i} className={`rounded-xl p-4 border ${
                        r.estimulo_aplicado ? 'bg-emerald-500/10 border-emerald-200' : 'bg-[#1A1A1A] border-[#262626]'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-white">{r.impuesto}</span>
                          {r.estimulo_aplicado && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              {r.estimulo_tipo} {(parseFloat(r.estimulo_porcentaje || 0) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <div className="text-xs text-[#A1A1AA]">Base</div>
                            <div className="text-sm font-mono text-[#E5E5E5]">{fmt(r.base)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-[#A1A1AA]">Bruto</div>
                            <div className="text-sm font-mono text-red-400">{fmt(r.bruto)}</div>
                          </div>
                          {r.estimulo_aplicado && (
                            <div>
                              <div className="text-xs text-[#A1A1AA]">Ahorro</div>
                              <div className="text-sm font-mono text-emerald-400">-{fmt(r.ahorro_estimulo)}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-xs text-[#A1A1AA]">Neto</div>
                            <div className={`text-sm font-bold ${parseFloat(r.neto || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(r.neto)}</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Totales */}
                    <div className="rounded-xl p-4 bg-[#0A0A0A] text-white">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Total bruto</span>
                        <span className="font-mono">{fmt(estimuloCalcResult.total_impuestos_brutos)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Ahorro por estímulos</span>
                        <span className="font-mono text-emerald-300">-{fmt(estimuloCalcResult.total_ahorro_estimulos)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-slate-700 pt-2 mt-1">
                        <span>Total neto a pagar</span>
                        <span className="font-mono">{fmt(estimuloCalcResult.total_impuestos_netos)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
