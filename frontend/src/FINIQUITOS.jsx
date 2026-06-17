import { useState, useEffect, useCallback, useRef } from 'react';
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

const fmtFecha = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function FINIQUITOS({ usuario }) {
  // ── Búsqueda de trabajadores ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef(null);
  const searchRef = useRef(null);

  // ── Trabajador seleccionado + datos ──
  const [selectedTrabajador, setSelectedTrabajador] = useState(null);
  const [trabajadorDatos, setTrabajadorDatos] = useState(null);

  // ── Formulario ──
  const [form, setForm] = useState({
    empleado_id: '',
    fecha_baja: '',
    tipo: 'despido_injustificado',
    causa: '',
    otros_pagos: '0',
    dias_vacaciones_pendientes: '',
  });

  // ── Resultados ──
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Debounced search ──
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await finiquitos.buscarTrabajador(q);
      setSearchResults(data || []);
      setShowDropdown(true);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(searchQuery), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery, doSearch]);

  // ── Cargar datos del trabajador al seleccionar ──
  const seleccionarTrabajador = async (emp) => {
    setSelectedTrabajador(emp);
    setSearchQuery(`${emp.nombre} ${emp.apellidos}`);
    setShowDropdown(false);
    setPreview(null);
    setSaved(null);
    setError('');

    setForm(p => ({
      ...p,
      empleado_id: emp.id,
      dias_vacaciones_pendientes: '',
    }));

    // Cargar datos completos
    try {
      const datos = await finiquitos.datosTrabajador(emp.id, form.fecha_baja || undefined);
      setTrabajadorDatos(datos);
      if (datos.dias_vacaciones_pendientes > 0) {
        setForm(p => ({ ...p, dias_vacaciones_pendientes: String(datos.dias_vacaciones_pendientes) }));
      }
    } catch (e) {
      setTrabajadorDatos(null);
    }
  };

  // ── Re-cargar datos cuando cambia fecha_baja ──
  useEffect(() => {
    if (selectedTrabajador && form.fecha_baja) {
      finiquitos.datosTrabajador(selectedTrabajador.id, form.fecha_baja)
        .then(datos => {
          setTrabajadorDatos(datos);
          if (datos.dias_vacaciones_pendientes > 0) {
            setForm(p => ({ ...p, dias_vacaciones_pendientes: String(datos.dias_vacaciones_pendientes) }));
          }
        })
        .catch(() => {});
    }
  }, [form.fecha_baja]);

  // ── Manejar clic fuera del dropdown ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Preview ──
  const handlePreview = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await finiquitos.preview({
        empleado_id: form.empleado_id,
        fecha_baja: form.fecha_baja + 'T00:00:00',
        tipo: form.tipo,
        causa: form.causa,
        otros_pagos: form.otros_pagos || '0',
        dias_vacaciones_pendientes: form.dias_vacaciones_pendientes
          ? parseInt(form.dias_vacaciones_pendientes) : null,
      });
      setPreview(r);
      setSaved(null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── Guardar ──
  const handleGuardar = async () => {
    setLoading(true); setError('');
    try {
      const r = await finiquitos.calcular({
        empleado_id: form.empleado_id,
        fecha_baja: form.fecha_baja + 'T00:00:00',
        tipo: form.tipo,
        causa: form.causa,
        otros_pagos: form.otros_pagos || '0',
        dias_vacaciones_pendientes: form.dias_vacaciones_pendientes
          ? parseInt(form.dias_vacaciones_pendientes) : null,
      });
      setSaved(r);
      setHistorial(prev => [r, ...prev]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── Cargar historial ──
  const cargarHistorial = useCallback(async () => {
    try {
      const data = await finiquitos.listar();
      setHistorial(data || []);
    } catch (e) { /* silent */ }
  }, []);
  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  // ── Componentes internos ──
  const ItemRow = ({ label, value, color }) => (
    <div className="flex justify-between py-2 border-b border-[#1F1F1F] last:border-0">
      <span className="text-xs text-[#D4D4D8]">{label}</span>
      <span className={`text-xs font-semibold ${color || 'text-white'}`}>{fmt(value)}</span>
    </div>
  );

  const Tag = ({ label, color }) => (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${color}`}>{label}</span>
  );

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tighter text-white">Finiquitos / Liquidaciones</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">Cálculo basado en LFT (Art. 48-50, 87, 162)</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 mb-6">
            {error}
          </div>
        )}

        {/* ── Buscador de trabajadores ── */}
        <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] mb-6">
          <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-2">
            🔍 Buscar trabajador
          </label>
          <div ref={searchRef} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (!e.target.value) {
                  setSelectedTrabajador(null);
                  setTrabajadorDatos(null);
                  setForm(p => ({ ...p, empleado_id: '' }));
                }
              }}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Buscar por nombre, RFC o CURP..."
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 pl-10 text-sm outline-none focus:border-emerald-500 text-white placeholder-[#52525B]"
            />
            {/* Lupa icon */}
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Dropdown de resultados */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-[#1A1A1A] border border-[#262626] rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                {searchResults.map(emp => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => seleccionarTrabajador(emp)}
                    className="w-full text-left px-4 py-3 hover:bg-[#262626] transition-colors border-b border-[#1F1F1F] last:border-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-semibold text-white">
                          {emp.nombre} {emp.apellidos}
                        </span>
                        <span className="text-[10px] text-[#71717A] ml-2">{emp.rfc}</span>
                      </div>
                      <Tag
                        label={emp.estatus === 'activo' ? 'Activo' : emp.estatus}
                        color={emp.estatus === 'activo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}
                      />
                    </div>
                    <div className="text-[11px] text-[#71717A] mt-0.5">
                      {fmt(emp.salario_diario)}/día · Ingreso: {fmtFecha(emp.fecha_ingreso)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Datos del trabajador seleccionado ── */}
        {selectedTrabajador && (
          <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                {selectedTrabajador.nombre} {selectedTrabajador.apellidos}
              </h3>
              <span className="text-[10px] text-[#71717A]">{selectedTrabajador.rfc}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1">Salario diario</span>
                <span className="text-sm font-bold text-white">{fmt(selectedTrabajador.salario_diario)}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1">Fecha ingreso</span>
                <span className="text-sm text-[#D4D4D8]">{fmtFecha(selectedTrabajador.fecha_ingreso)}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1">Estatus</span>
                <Tag
                  label={selectedTrabajador.estatus}
                  color={selectedTrabajador.estatus === 'activo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}
                />
              </div>
              {trabajadorDatos && (
                <div>
                  <span className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1">Años servicio</span>
                  <span className="text-sm font-bold text-white">{trabajadorDatos.anios_servicio}</span>
                </div>
              )}
            </div>

            {/* Campos auto-calculados */}
            {trabajadorDatos && form.fecha_baja && (
              <div className="mt-4 pt-4 border-t border-[#1F1F1F]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-[#1A1A1A] rounded-xl p-3">
                    <span className="text-[10px] text-[#71717A] block">Días vacaciones pend.</span>
                    <span className="text-sm font-bold text-white">
                      {trabajadorDatos.dias_vacaciones_pendientes} días
                    </span>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-xl p-3">
                    <span className="text-[10px] text-[#71717A] block">Aguinaldo proporcional</span>
                    <span className="text-sm font-bold text-white">
                      {fmt(trabajadorDatos.aguinaldo_proporcional)}
                    </span>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-xl p-3">
                    <span className="text-[10px] text-[#71717A] block">Prima vacacional</span>
                    <span className="text-sm font-bold text-white">
                      {fmt(trabajadorDatos.prima_vacacional_proporcional)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Formulario de cálculo ── */}
        {selectedTrabajador && (
          <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Fecha de baja</label>
                <input
                  type="date"
                  required
                  value={form.fecha_baja}
                  onChange={e => setForm(p => ({ ...p, fecha_baja: e.target.value }))}
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 text-white"
                >
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Días vacaciones</label>
                <input
                  type="number"
                  min="0"
                  value={form.dias_vacaciones_pendientes}
                  onChange={e => setForm(p => ({ ...p, dias_vacaciones_pendientes: e.target.value }))}
                  placeholder="Auto"
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 text-white placeholder-[#52525B]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Otros pagos</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.otros_pagos}
                  onChange={e => setForm(p => ({ ...p, otros_pagos: e.target.value }))}
                  placeholder="0.00"
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 text-white placeholder-[#52525B]"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase block mb-1.5">Causa / motivo</label>
              <input
                type="text"
                value={form.causa}
                onChange={e => setForm(p => ({ ...p, causa: e.target.value }))}
                placeholder="Motivo de la baja"
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-emerald-500 text-white placeholder-[#52525B]"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handlePreview}
                disabled={loading || !form.empleado_id || !form.fecha_baja}
                className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {loading ? 'Calculando...' : '📊 Preview'}
              </button>
              {preview && (
                <button
                  onClick={handleGuardar}
                  disabled={loading}
                  className="bg-emerald-500 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-emerald-600 transition-all"
                >
                  💾 Guardar finiquito
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Resultado ── */}
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

        {/* ── Tabla de finiquitos recientes ── */}
        {historial.length > 0 && (
          <div className="mt-8 bg-[#141414] rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] overflow-hidden">
            <div className="p-6 pb-0 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">📋 Finiquitos recientes</h3>
              <span className="text-[10px] text-[#71717A]">{historial.length} registros</span>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#262626]">
                    <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">ID</th>
                    <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Empleado</th>
                    <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Fecha baja</th>
                    <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Tipo</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Percepciones</th>
                    <th className="text-right py-3 px-2 text-[#A1A1AA] font-medium">Deducciones</th>
                    <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Neto</th>
                    <th className="py-3 px-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {historial.slice(0, 30).map(f => (
                    <tr key={f.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A] transition-colors">
                      <td className="py-3 px-4 text-[#71717A]">#{f.id}</td>
                      <td className="py-3 px-2 text-white font-medium">
                        {f.empleado_id === selectedTrabajador?.id
                          ? `${selectedTrabajador.nombre} ${selectedTrabajador.apellidos}`
                          : `#${f.empleado_id}`}
                      </td>
                      <td className="py-3 px-2 text-[#D4D4D8]">{fmtFecha(f.fecha_baja)}</td>
                      <td className="py-3 px-2">
                        <Tag
                          label={f.tipo?.replace(/_/g, ' ') || '—'}
                          color={
                            f.tipo === 'despido_injustificado' ? 'bg-red-500/10 text-red-400' :
                            f.tipo === 'renuncia' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-sky-500/10 text-sky-400'
                          }
                        />
                      </td>
                      <td className="text-right py-3 px-2 text-white font-semibold">{fmt(f.total_percepciones)}</td>
                      <td className="text-right py-3 px-2 text-red-400">{fmt(f.total_deducciones)}</td>
                      <td className="text-right py-3 px-4 text-emerald-400 font-bold">{fmt(f.neto)}</td>
                      <td className="py-3 px-2 text-center">
                        <a href={finiquitos.descargarPdfUrl(f.id)}
                           title="Descargar PDF"
                           className="text-[10px] text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-lg transition-all inline-block">
                          PDF
                        </a>
                      </td>
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
