import { useState, useEffect, useCallback } from 'react';
import { alertasEfos } from './api';

const fmtFecha = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TIPOS_LISTA = [
  { value: '69', label: '69' },
  { value: '69-B', label: '69-B' },
  { value: 'definitivos', label: 'Definitivos' },
  { value: 'sentencias', label: 'Sentencias' },
];

export default function AlertasEfos({ usuario }) {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard
  const [alertasActivas, setAlertasActivas] = useState(0);
  const [alertasResueltas, setAlertasResueltas] = useState(0);

  // Listas EFOS
  const [listas, setListas] = useState([]);
  const [showListaForm, setShowListaForm] = useState(false);
  const [listaForm, setListaForm] = useState({ rfc: '', tipo_lista: '69' });
  const [savingLista, setSavingLista] = useState(false);

  // Verificar clientes
  const [verificando, setVerificando] = useState(false);
  const [verificacionResultados, setVerificacionResultados] = useState(null);

  // Alertas
  const [alertas, setAlertas] = useState([]);
  const [resolviendo, setResolviendo] = useState(null);

  // Actualización SAT
  const [actualizandoSAT, setActualizandoSAT] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  // Carga CSV
  const [showCSV, setShowCSV] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvTipo, setCsvTipo] = useState('69-B');
  const [cargandoCSV, setCargandoCSV] = useState(false);

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'listas', label: 'Listas EFOS' },
    { key: 'verificar', label: 'Verificar clientes' },
    { key: 'alertas', label: 'Alertas activas' },
  ];

  const cargarDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await alertasEfos.listarAlertas();
      if (Array.isArray(data)) {
        setAlertas(data);
        setAlertasActivas(data.filter(a => !a.resuelto).length);
        setAlertasResueltas(data.filter(a => a.resuelto).length);
      } else {
        setAlertas([]);
        setAlertasActivas(0);
        setAlertasResueltas(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarListas = useCallback(async () => {
    try {
      const data = await alertasEfos.listarListas();
      setListas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (tab === 'dashboard' || tab === 'alertas') cargarDashboard();
    if (tab === 'listas') cargarListas();
  }, [tab, cargarDashboard, cargarListas]);

  // ─── Agregar RFC a lista ──────────────────────────
  const handleAgregarLista = async (e) => {
    e.preventDefault();
    setSavingLista(true);
    setError('');
    try {
      await alertasEfos.crearLista(listaForm);
      setShowListaForm(false);
      setListaForm({ rfc: '', tipo_lista: '69' });
      setSuccess('RFC agregado a la lista correctamente');
      cargarListas();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLista(false);
    }
  };

  // ─── Verificar todos los clientes ────────────────
  const handleVerificarTodos = async () => {
    setVerificando(true);
    setError('');
    setVerificacionResultados(null);
    try {
      const data = await alertasEfos.verificarTodos();
      setVerificacionResultados(data);
      setSuccess('Verificación completada');
    } catch (err) {
      setError(err.message);
    } finally {
      setVerificando(false);
    }
  };

  // ─── Resolver alerta ──────────────────────────────
  const handleResolver = async (id) => {
    setResolviendo(id);
    try {
      await alertasEfos.resolverAlerta(id);
      setSuccess('Alerta resuelta');
      cargarDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setResolviendo(null);
    }
  };

  // ─── Actualizar desde SAT ─────────────────────────
  const handleActualizarSAT = async () => {
    setActualizandoSAT(true);
    setError('');
    setUpdateResult(null);
    try {
      const data = await alertasEfos.actualizarDesdeSAT();
      setUpdateResult(data);
      if (data.exitoso) {
        setSuccess(data.mensaje);
        cargarListas();
      } else {
        setError(data.mensaje || 'No se pudo actualizar desde el SAT');
      }
    } catch (err) {
      setError(err.message || 'Error al conectar con el SAT');
    } finally {
      setActualizandoSAT(false);
    }
  };

  // ─── Cargar CSV ───────────────────────────────────
  const handleCargarCSV = async () => {
    if (!csvFile) {
      setError('Selecciona un archivo CSV');
      return;
    }
    setCargandoCSV(true);
    setError('');
    try {
      const text = await csvFile.text();
      const data = await alertasEfos.cargarCSV(csvTipo, text);
      if (data.exitoso) {
        setSuccess(data.mensaje);
        setCsvFile(null);
        setShowCSV(false);
        cargarListas();
      } else {
        setError(data.mensaje || 'Error al procesar el CSV');
      }
    } catch (err) {
      setError(err.message || 'Error al cargar el archivo');
    } finally {
      setCargandoCSV(false);
    }
  };

  // Clear success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ─── Dashboard ────────────────────────────────────
  const renderDashboard = () => (
    <div>
      {loading ? (
        <div className="text-center py-12 text-[#A1A1AA] text-sm">Cargando dashboard...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] text-center">
            <div className="text-3xl mb-2">🚨</div>
            <div className="text-3xl font-extrabold text-white">{alertasActivas}</div>
            <p className="text-xs text-[#A1A1AA] mt-1">Alertas activas</p>
          </div>
          <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-3xl font-extrabold text-emerald-600">{alertasResueltas}</div>
            <p className="text-xs text-[#A1A1AA] mt-1">Alertas resueltas</p>
          </div>
          <div className="bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] text-center">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-3xl font-extrabold text-white">{listas.length}</div>
            <p className="text-xs text-[#A1A1AA] mt-1">RFCs en listas</p>
          </div>
        </div>
      )}

      {/* Alertas recientes */}
      {alertas.filter(a => !a.resuelto).length > 0 && (
        <div className="mt-6 bg-[#141414] rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
          <h3 className="text-sm font-semibold text-white mb-4">Alertas recientes</h3>
          <div className="space-y-2">
            {alertas.filter(a => !a.resuelto).slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl p-3">
                <div>
                  <p className="text-xs font-semibold text-white">{a.rfc}</p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">{a.tipo_lista} · {fmtFecha(a.fecha_alerta)}</p>
                </div>
                <button onClick={() => handleResolver(a.id)} disabled={resolviendo === a.id}
                  className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all disabled:opacity-50">
                  {resolviendo === a.id ? '...' : 'Resolver'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && alertasActivas === 0 && alertasResueltas === 0 && (
        <div className="mt-4 bg-[#141414] rounded-2xl p-12 text-center shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
          <div className="text-4xl mb-3">🛡️</div>
          <p className="text-sm text-[#A1A1AA]">Sin alertas registradas</p>
          <p className="text-xs text-[#71717A] mt-1">Verifica clientes contra listas EFOS para generar alertas</p>
        </div>
      )}
    </div>
  );

  // ─── Listas EFOS ──────────────────────────────────
  const renderListas = () => (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <h2 className="text-base font-semibold text-white">RFCs en listas EFOS</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleActualizarSAT} disabled={actualizandoSAT}
            className="bg-[#2E8B57] text-white text-xs font-semibold rounded-xl px-4 py-2 hover:bg-[#236b43] transition-all disabled:opacity-50 flex items-center gap-2">
            {actualizandoSAT ? (
              <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Actualizando...</>
            ) : (
              <>🔄 Actualizar desde SAT</>
            )}
          </button>
          <button onClick={() => { setShowCSV(!showCSV); setError(''); setCsvFile(null); }}
            className="bg-[#262626] text-[#E5E5E5] text-xs font-semibold rounded-xl px-4 py-2 hover:bg-slate-200 transition-all">
            {showCSV ? 'Cancelar' : '📄 Cargar CSV'}
          </button>
          <button onClick={() => { setShowListaForm(!showListaForm); setError(''); }}
            className="bg-[#0A0A0A] text-white text-xs font-semibold rounded-xl px-4 py-2 hover:bg-slate-800 transition-all">
            {showListaForm ? 'Cancelar' : '+ Agregar RFC'}
          </button>
        </div>
      </div>

      {/* Resultado de actualización SAT */}
      {updateResult && (
        <div className={`rounded-xl p-4 mb-4 border text-sm ${updateResult.exitoso ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <p className="font-semibold mb-1">{updateResult.exitoso ? '✅' : '⚠️'} {updateResult.mensaje}</p>
          {updateResult.total_rfcs > 0 && (
            <div className="flex gap-4 text-xs mt-2">
              <span>Total: <strong>{updateResult.total_rfcs}</strong></span>
              <span className="text-emerald-600">Nuevos: <strong>{updateResult.nuevos}</strong></span>
              <span className="text-[#A1A1AA]">Actualizados: <strong>{updateResult.actualizados}</strong></span>
            </div>
          )}
          {updateResult.errores?.length > 0 && (
            <div className="mt-2 text-xs text-red-600">
              {updateResult.errores.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Carga CSV */}
      {showCSV && (
        <div className="bg-[#141414] rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
          <h3 className="text-sm font-semibold text-white mb-4">Cargar RFCs desde archivo CSV</h3>
          <p className="text-xs text-[#A1A1AA] mb-4">El archivo debe tener los RFCs en la primera columna.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Archivo CSV</label>
              <input type="file" accept=".csv,.txt"
                onChange={e => setCsvFile(e.target.files[0] || null)}
                className="w-full text-sm text-[#D4D4D8] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#262626] file:text-[#E5E5E5] hover:file:bg-slate-200" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Tipo de lista</label>
              <select value={csvTipo} onChange={e => setCsvTipo(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                {TIPOS_LISTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleCargarCSV} disabled={cargandoCSV || !csvFile}
            className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
            {cargandoCSV ? 'Cargando...' : 'Cargar RFCs'}
          </button>
        </div>
      )}

      {showListaForm && (
        <form onSubmit={handleAgregarLista} className="bg-[#141414] rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
          <h3 className="text-sm font-semibold text-white mb-4">Agregar RFC a lista</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">RFC</label>
              <input type="text" required value={listaForm.rfc}
                onChange={e => setListaForm(p => ({ ...p, rfc: e.target.value.toUpperCase() }))}
                placeholder="AAA010101AAA"
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm uppercase outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#71717A] placeholder:normal-case" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1.5">Tipo de lista</label>
              <select value={listaForm.tipo_lista}
                onChange={e => setListaForm(p => ({ ...p, tipo_lista: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                {TIPOS_LISTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={savingLista}
            className="mt-4 bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50">
            {savingLista ? 'Agregando...' : 'Agregar a lista'}
          </button>
        </form>
      )}

      {listas.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl p-12 text-center shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-[#A1A1AA]">No hay RFCs registrados en listas EFOS</p>
        </div>
      ) : (
        <div className="bg-[#141414] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">RFC</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Tipo lista</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Fecha publicación</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Fecha consulta</th>
                </tr>
              </thead>
              <tbody>
                {listas.map(l => (
                  <tr key={l.id} className="border-b border-slate-50 hover:bg-[#1A1A1A]/50">
                    <td className="py-3.5 px-4 text-white font-mono font-semibold">{l.rfc}</td>
                    <td className="py-3.5 px-2">
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        {l.tipo_lista}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-[#D4D4D8]">{fmtFecha(l.fecha_publicacion)}</td>
                    <td className="py-3.5 px-4 text-[#D4D4D8]">{fmtFecha(l.fecha_consulta || l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Verificar clientes ──────────────────────────
  const renderVerificar = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white mb-2">Verificar clientes contra listas EFOS</h2>
        <p className="text-xs text-[#A1A1AA]">Revisa los RFCs de todos tus clientes contra las listas del SAT (69, 69-B, definitivos y sentencias)</p>
      </div>

      <button onClick={handleVerificarTodos} disabled={verificando}
        className="bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all disabled:opacity-50 mb-6">
        {verificando ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Verificando...
          </span>
        ) : 'Verificar todos los clientes'}
      </button>

      {verificacionResultados && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#141414] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] text-center">
              <div className="text-2xl font-extrabold text-white">{verificacionResultados.total || verificacionResultados.verificados || 0}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Clientes verificados</div>
            </div>
            <div className="bg-[#141414] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] text-center">
              <div className="text-2xl font-extrabold text-red-600">{verificacionResultados.en_lista || 0}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Encontrados en listas</div>
            </div>
            <div className="bg-[#141414] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] text-center">
              <div className="text-2xl font-extrabold text-emerald-600">{verificacionResultados.limpios || 0}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Sin incidencias</div>
            </div>
          </div>

          {/* Detalle */}
          {verificacionResultados.resultados && verificacionResultados.resultados.length > 0 && (
            <div className="bg-[#141414] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] overflow-hidden">
              <div className="p-6 pb-0">
                <h3 className="text-sm font-semibold text-white">Resultados detallados</h3>
              </div>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#262626]">
                      <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">RFC</th>
                      <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Cliente</th>
                      <th className="text-center py-3 px-2 text-[#A1A1AA] font-medium">En lista</th>
                      <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificacionResultados.resultados.map((r, i) => (
                      <tr key={i} className={`border-b border-slate-50 hover:bg-[#1A1A1A]/50 ${
                        r.en_lista ? 'bg-red-50/50' : ''
                      }`}>
                        <td className="py-3 px-4 text-white font-mono font-semibold">{r.rfc}</td>
                        <td className="py-3 px-2 text-[#D4D4D8]">{r.cliente || r.nombre || '—'}</td>
                        <td className="text-center py-3 px-2">
                          {r.en_lista ? (
                            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Sí</span>
                          ) : (
                            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#D4D4D8]">{r.tipo || r.tipo_lista || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!verificacionResultados && !verificando && (
        <div className="bg-[#141414] rounded-2xl p-12 text-center shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-[#A1A1AA]">Presiona el botón para verificar todos los clientes</p>
          <p className="text-xs text-[#71717A] mt-1">Se revisarán RFCs contra listas 69, 69-B, definitivos y sentencias</p>
        </div>
      )}
    </div>
  );

  // ─── Alertas activas ──────────────────────────────
  const renderAlertas = () => (
    <div>
      <h2 className="text-base font-semibold text-white mb-4">Alertas activas</h2>

      {loading ? (
        <div className="text-center py-12 text-[#A1A1AA] text-sm">Cargando alertas...</div>
      ) : alertas.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl p-12 text-center shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626]">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-sm text-[#A1A1AA]">No hay alertas registradas</p>
        </div>
      ) : (
        <div className="bg-[#141414] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-[#262626] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Cliente</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">RFC</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Tipo</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Fecha</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA] font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map(a => (
                  <tr key={a.id} className={`border-b border-slate-50 hover:bg-[#1A1A1A]/50 ${
                    !a.resuelto ? '' : 'opacity-50'
                  }`}>
                    <td className="py-3.5 px-4 text-white font-medium">{a.rfc}</td>
                    <td className="py-3.5 px-2 text-[#D4D4D8] font-mono">{a.rfc}</td>
                    <td className="py-3.5 px-2">
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                        {a.tipo_lista || 'EFOS'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-[#D4D4D8]">{fmtFecha(a.fecha_alerta)}</td>
                    <td className="text-center py-3.5 px-4">
                      {(!a.resuelto) && (
                        <button onClick={() => handleResolver(a.id)} disabled={resolviendo === a.id}
                          className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all disabled:opacity-50">
                          {resolviendo === a.id ? '...' : 'Resolver'}
                        </button>
                      )}
                      {(a.resuelto) && (
                        <span className="text-[10px] text-emerald-500 font-medium">✓ Resuelta</span>
                      )}
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

  // ─── Main Render ─────────────────────────────────
  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-white">Alertas EFOS</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Monitoreo de listas EFOS del SAT y alertas de clientes</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3 mb-4">{success}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#141414] rounded-xl p-1 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[#262626] w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              tab === t.key ? 'bg-[#0A0A0A] text-white' : 'text-[#A1A1AA] hover:text-[#E5E5E5]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && renderDashboard()}
      {tab === 'listas' && renderListas()}
      {tab === 'verificar' && renderVerificar()}
      {tab === 'alertas' && renderAlertas()}
      </div>
    </div>
  );
}
