import { useState } from 'react';
import { imss } from './api';

const RIESGOS = [
  { value: 1, label: 'I — Mínimo' },
  { value: 2, label: 'II — Bajo' },
  { value: 3, label: 'III — Medio' },
  { value: 4, label: 'IV — Alto' },
  { value: 5, label: 'V — Máximo' },
];

const CRITICIDAD = {
  critico: 'bg-red-50 border-red-200',
  alerta: 'bg-amber-50 border-amber-200',
  aviso: 'bg-sky-50 border-sky-200',
};

const initialForm = {
  salario_diario: '',
  dias_aguinaldo: 15,
  prima_vacacional_pct: 0.25,
  clase_riesgo: 1,
  anios_servicio: 1,
};

export default function IMSS({ usuario }) {
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

  const fmt = (n) => {
    if (n === null || n === undefined) return '$0.00';
    return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">IMSS Engine</h1>
        <p className="text-sm text-slate-500 mt-1">Cálculo de SBC y cuotas obrero-patronales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={calcular} className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 h-fit">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Datos del trabajador</h2>

          <div className="space-y-5">
            {/* Salario */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Salario diario <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input type="number" step="0.01" min="1" required
                  value={form.salario_diario}
                  onChange={e => handleChange('salario_diario', e.target.value)}
                  placeholder="500.00"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-8 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 focus:bg-white placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Row 2 cols */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Días aguinaldo</label>
                <select value={form.dias_aguinaldo} onChange={e => handleChange('dias_aguinaldo', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  {[15, 20, 25, 30].map(d => <option key={d} value={d}>{d} días</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Prima vacacional</label>
                <select value={form.prima_vacacional_pct} onChange={e => handleChange('prima_vacacional_pct', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  <option value={0.25}>25% (mínimo ley)</option>
                  <option value={0.30}>30%</option>
                  <option value={0.50}>50%</option>
                </select>
              </div>
            </div>

            {/* Row 2 cols */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Años servicio</label>
                <select value={form.anios_servicio} onChange={e => handleChange('anios_servicio', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(a => <option key={a} value={a}>{a} {a===1?'año':'años'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Clase de riesgo</label>
                <select value={form.clase_riesgo} onChange={e => handleChange('clase_riesgo', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  {RIESGOS.map(r => <option key={r.value} value={r.value}>{r.value} — {r.label}</option>)}
                </select>
              </div>
            </div>

            {/* Factor override */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Factor integración <span className="text-slate-300 font-normal">(opcional — dejar vacío para calcular automático)</span>
              </label>
              <input type="number" step="0.000001" min="1" max="3"
                value={form.factor_override || ''}
                onChange={e => setForm(p => ({ ...p, factor_override: e.target.value }))}
                placeholder="1.045205"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm text-slate-900 outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-slate-300"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>
            )}

            <button type="submit" disabled={loading || !form.salario_diario}
              className="w-full bg-slate-900 text-white text-sm font-semibold rounded-xl py-3.5 hover:bg-slate-800 transition-all disabled:opacity-50">
              {loading ? 'Calculando...' : 'Calcular cuotas IMSS'}
            </button>
          </div>
        </form>

        {/* Results */}
        <div className="space-y-4">
          {resultado && (
            <>
              {/* SBC Card */}
              <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Salario Base de Cotización</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900">{fmt(resultado.sbc_diario)}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Diario</div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900">{fmt(resultado.sbc_mensual)}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Mensual</div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900">{parseFloat(resultado.umas).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 mt-1">UMAs</div>
                  </div>
                </div>
              </div>

              {/* Cuotas Table */}
              <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Cuotas Obrero-Patronales</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 pr-4 text-slate-400 font-medium">Concepto</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Tasa Pat.</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Tasa Obr.</th>
                        <th className="text-right py-2 pl-2 text-slate-400 font-medium">Patronal</th>
                        <th className="text-right py-2 pl-2 text-slate-400 font-medium">Obrero</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.cuotas.map((c, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-3 pr-4 text-slate-900 font-medium">{c.concepto}</td>
                          <td className="text-right py-3 px-2 text-slate-600">{c.tasa_patronal}%</td>
                          <td className="text-right py-3 px-2 text-slate-600">{c.tasa_obrera}%</td>
                          <td className="text-right py-3 pl-2 text-slate-900 font-semibold">{fmt(c.monto_patronal)}</td>
                          <td className="text-right py-3 pl-2 text-slate-900">{fmt(c.monto_obrero)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td className="py-3 pr-4 text-slate-900 font-bold">Totales</td>
                        <td></td><td></td>
                        <td className="text-right py-3 pl-2 text-slate-900 font-bold text-sm">{fmt(resultado.total_patronal)}</td>
                        <td className="text-right py-3 pl-2 text-slate-900 font-bold text-sm">{fmt(resultado.total_obrero)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-slate-500 text-[11px]">Gran total/día</td>
                        <td></td><td></td>
                        <td colSpan={2} className="text-right py-2 pl-2 text-slate-900 font-extrabold text-base">
                          {fmt(resultado.gran_total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Monthly projection */}
              <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Proyección mensual (30 días)</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{fmt(parseFloat(resultado.total_patronal) * 30)}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Patronal / mes</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">{fmt(parseFloat(resultado.total_obrero) * 30)}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Obrero / mes</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#2E8B57]">{fmt(parseFloat(resultado.gran_total) * 30)}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Gran total / mes</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!resultado && !loading && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
              <div className="text-4xl mb-3">🏥</div>
              <p className="text-sm text-slate-400">Ingresa los datos del trabajador y presiona "Calcular"</p>
              <p className="text-xs text-slate-300 mt-1">SBC + cuotas obrero-patronales completas</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-[11px] text-slate-400 text-center leading-relaxed">
        Basado en LSS, LFT y DOF 2026. UMA $117.31/día (INEGI). Tope 25 UMAs.
        Cálculos orientativos — validar contra SUA oficial.
      </div>
      </div>
    </div>
  );
}
