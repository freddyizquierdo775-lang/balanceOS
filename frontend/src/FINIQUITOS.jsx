import { useState, useEffect, useCallback } from 'react';
import { finiquitos } from './api';

const TIPOS = [
  { value: 'despido_injustificado', label: 'Despido injustificado' },
  { value: 'renuncia', label: 'Renuncia voluntaria' },
  { value: 'terminacion_mutuo', label: 'Terminación mutuo acuerdo' },
  { value: 'terminacion_temporal', label: 'Término contrato temporal' },
];

const fmt = (n) => {
  if (n === null || n === undefined) return '$0.00';
  return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2 });
};

export default function FINIQUITOS({ usuario }) {
  const [empleadosList, setEmpleadosList] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [form, setForm] = useState({ empleado_id: '', fecha_baja: '', tipo: 'despido_injustificado', causa: '', otros_pagos: '0' });
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargarEmpleados = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/empleados/', { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setEmpleadosList(data || []);
    } catch (e) { /* silent */ }
  }, []);
  useEffect(() => { cargarEmpleados(); }, [cargarEmpleados]);

  const seleccionarEmpleado = (e) => {
    const eid = parseInt(e.target.value);
    const emp = empleadosList.find(x => x.id === eid);
    setSelectedEmp(emp);
    setForm(p => ({ ...p, empleado_id: eid }));
    setPreview(null);
    setSaved(null);
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await finiquitos.preview({
        empleado_id: form.empleado_id, fecha_baja: form.fecha_baja + 'T00:00:00',
        tipo: form.tipo, causa: form.causa, otros_pagos: form.otros_pagos || '0',
      });
      setPreview(r);
      setSaved(null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleGuardar = async () => {
    setLoading(true); setError('');
    try {
      const r = await finiquitos.calcular({
        empleado_id: form.empleado_id, fecha_baja: form.fecha_baja + 'T00:00:00',
        tipo: form.tipo, causa: form.causa, otros_pagos: form.otros_pagos || '0',
      });
      setSaved(r);
      setHistorial(prev => [r, ...prev]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const cargarHistorial = useCallback(async () => {
    try {
      const data = await finiquitos.listar();
      setHistorial(data || []);
    } catch (e) { /* silent */ }
  }, []);
  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const ItemRow = ({ label, value, color }) => (
    <div className="flex justify-between py-2 border-b border-[#1F1F1F] last:border-0">
      <span className="text-xs text-[#D4D4D8]">{label}</span>
      <span className={`text-xs font-semibold ${color || 'text-white'}`}>{fmt(value)}</span>
    </div>
  );

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-white">Finiquitos / Liquidaciones</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Cálculo basado en LFT (Art. 48-50, 87, 162)</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 mb-6">{error}</div>}

      {/* Selector empleado + form */}
      <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Empleado</label>
            <select value={form.empleado_id} onChange={seleccionarEmpleado} required
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500">
              <option value="">Seleccionar...</option>
              {empleadosList.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Fecha de baja</label>
            <input type="date" required value={form.fecha_baja}
              onChange={e => setForm(p => ({ ...p, fecha_baja: e.target.value }))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Tipo</label>
            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500">
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Salario</label>
            <div className="p-3 text-sm text-white font-semibold bg-[#1A1A1A] rounded-xl">
              {selectedEmp ? fmt(selectedEmp.salario_diario) + '/día' : '—'}
            </div>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Causa / otros pagos</label>
          <div className="flex gap-4">
            <input type="text" value={form.causa} onChange={e => setForm(p => ({ ...p, causa: e.target.value }))}
              placeholder="Motivo de la baja"
              className="flex-1 bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500" />
            <input type="number" step="0.01" value={form.otros_pagos}
              onChange={e => setForm(p => ({ ...p, otros_pagos: e.target.value }))}
              placeholder="Otros pagos"
              className="w-40 bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={handlePreview} disabled={loading || !form.empleado_id || !form.fecha_baja}
            className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
            {loading ? 'Calculando...' : 'Preview'}
          </button>
          {preview && (
            <button onClick={handleGuardar} disabled={loading}
              className="bg-emerald-500 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-emerald-600 transition-all">
              Guardar finiquito
            </button>
          )}
        </div>
      </div>

      {/* Resultado */}
      {(preview || saved) && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Percepciones */}
          <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
            <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">📈 Percepciones</h3>
            <ItemRow label="Indemnización 3 meses" value={(preview||saved).indemnizacion_3meses} color={parseFloat((preview||saved).indemnizacion_3meses) > 0 ? 'text-red-400' : ''} />
            <ItemRow label="Indemnización 20 días/año" value={(preview||saved).indemnizacion_20dias_x_anio} color={parseFloat((preview||saved).indemnizacion_20dias_x_anio) > 0 ? 'text-red-400' : ''} />
            <ItemRow label="Prima de antigüedad" value={(preview||saved).prima_antiguedad} />
            <ItemRow label="Vacaciones pendientes" value={(preview||saved).vacaciones_pendientes} />
            <ItemRow label="Prima vacacional" value={(preview||saved).prima_vacacional} />
            <ItemRow label="Aguinaldo proporcional" value={(preview||saved).aguinaldo_proporcional} />
            <ItemRow label="Otros pagos" value={(preview||saved).otras_percepciones} />
            <ItemRow label="TOTAL PERCEPCIONES" value={(preview||saved).total_percepciones} color="text-white font-bold text-sm" />
          </div>

          {/* Deducciones + Neto */}
          <div className="space-y-4">
            <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626]">
              <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4">📉 Deducciones</h3>
              <ItemRow label="ISR" value={(preview||saved).isr} color="text-red-400" />
              <ItemRow label="ISR Exento" value={(preview||saved).isr_exento} color="text-emerald-400" />
              <ItemRow label="TOTAL DEDUCCIONES" value={(preview||saved).total_deducciones} color="text-red-400 font-bold text-sm" />
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
              <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">NETO A PAGAR</div>
              <div className="text-3xl font-extrabold text-emerald-400">{fmt((preview||saved).neto)}</div>
              <div className="text-xs text-[#A1A1AA] mt-2">
                {(preview||saved).anios_servicio} años de servicio · {(preview||saved).isr_detalle?.gravable ? `Base gravable: ${fmt((preview||saved).isr_detalle.gravable)}` : ''}
              </div>
            </div>

            {saved && (
              <div className="bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs rounded-xl p-3">
                ✅ Finiquito guardado · ID #{saved.id}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div className="mt-8 bg-[#141414] rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] overflow-hidden">
          <div className="p-6 pb-0">
            <h3 className="text-sm font-semibold text-white">Historial</h3>
          </div>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Empleado</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Fecha baja</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Tipo</th>
                  <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Percepciones</th>
                  <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Deducciones</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Neto</th>
                </tr>
              </thead>
              <tbody>
                {historial.slice(0, 20).map(f => (
                  <tr key={f.id} className="border-b border-[#1F1F1F]">
                    <td className="py-3 px-4 text-white font-medium">#{f.empleado_id}</td>
                    <td className="py-3 px-2 text-[#D4D4D8]">{new Date(f.fecha_baja).toLocaleDateString()}</td>
                    <td className="py-3 px-2 text-[#A1A1AA]">{f.tipo.replace(/_/g, ' ')}</td>
                    <td className="text-right py-3 px-2 text-white font-semibold">{fmt(f.total_percepciones)}</td>
                    <td className="text-right py-3 px-2 text-red-400">{fmt(f.total_deducciones)}</td>
                    <td className="text-right py-3 px-4 text-emerald-400 font-bold">{fmt(f.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 text-[11px] text-[#A1A1AA] text-center">
        Basado en LFT Art. 48-50, 87, 162 · ISR LISR Art. 110 · Prima antigüedad tope 2 UMAs
      </div>
      </div>
    </div>
  );
}
