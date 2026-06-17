import { useState, useEffect, useCallback } from 'react';
import { cfdi, nomina } from './api';

const ESTATUS_COLOR = {
  timbrado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  pendiente: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/10 text-red-400 border-red-500/30',
  cancelado: 'bg-[#1A1A1A] text-[#A1A1AA] border-[#333333]',
};

const fmtFecha = (s) => s ? new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function CFDI({ usuario }) {
  const [periodos, setPeriodos] = useState([]);
  const [cfdiRecibos, setCfdiRecibos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [recibosPeriodo, setRecibosPeriodo] = useState([]);
  const [timbrarMsg, setTimbrarMsg] = useState('');
  const [error, setError] = useState('');
  const [cancelUuid, setCancelUuid] = useState('');
  const [cancelRfc, setCancelRfc] = useState('');
  const [cancelMsg, setCancelMsg] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const cargarTodo = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([nomina.listarPeriodos(), cfdi.listarRecibos()]);
      setPeriodos(p || []);
      setCfdiRecibos(c || []);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const verRecibosPeriodo = async (periodo) => {
    try {
      const data = await nomina.obtenerPeriodo(periodo.id);
      setSelectedPeriodo(data);
      setRecibosPeriodo(data.recibos || []);
    } catch (e) { setError(e.message); }
  };

  const timbrarUno = async (reciboId) => {
    setTimbrarMsg(''); setError('');
    try {
      const r = await cfdi.timbrar(reciboId);
      setTimbrarMsg(`✅ Timbre generado: ${r.uuid}`);
      await cargarTodo();
      if (selectedPeriodo) {
        const data = await nomina.obtenerPeriodo(selectedPeriodo.id);
        setSelectedPeriodo(data);
        setRecibosPeriodo(data.recibos || []);
      }
    } catch (e) { setError(e.message); }
  };

  const cancelarCfdi = async (e) => {
    e.preventDefault();
    setCancelLoading(true);
    setCancelMsg('');
    setError('');
    try {
      const r = await cfdi.cancelar({ uuid: cancelUuid, rfc_emisor: cancelRfc });
      setCancelMsg(`✅ CFDI ${r.uuid} cancelado: ${r.estatus || 'ok'}`);
      setCancelUuid('');
      setCancelRfc('');
      await cargarTodo();
    } catch (e) { setError(e.message); }
    setCancelLoading(false);
  };

  const getCfdiStatus = (reciboId) => {
    const c = cfdiRecibos.find(x => x.recibo_id === reciboId);
    return c;
  };

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-white">CFDI / Timbrado</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Generación de CFDI 4.0 de nómina (PAC mock)</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 mb-6">{error}</div>}
      {timbrarMsg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl p-3 mb-6">{timbrarMsg}</div>}

      {/* Períodos con recibos */}
      <div className="bg-[#141414] rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-base font-semibold text-white">Períodos calculados</h2>
        </div>
        {periodos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm text-[#A1A1AA]">Sin períodos de nómina</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Período</th>
                  <th className="text-left py-3 px-2 text-[#A1A1AA] font-medium">Tipo</th>
                  <th className="text-center py-3 px-2 text-[#A1A1AA] font-medium">Recibos</th>
                  <th className="text-center py-3 px-2 text-[#A1A1AA] font-medium">Timbrados</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {periodos.filter(p => p.estatus === 'calculado' || p.estatus === 'pagado').map(p => {
                  const nRecibos = p.recibos?.length || 0;
                  const nTimbr = cfdiRecibos.filter(c => p.recibos?.some(r => r.id === c.recibo_id)).length;
                  return (
                    <tr key={p.id} className="border-b border-[#1F1F1F] hover:bg-[#1A1A1A] cursor-pointer"
                      onClick={() => verRecibosPeriodo(p)}>
                      <td className="py-3.5 px-4 text-white font-medium">{p.nombre}</td>
                      <td className="py-3.5 px-2 text-[#A1A1AA]">{p.tipo}</td>
                      <td className="text-center py-3.5 px-2 text-[#D4D4D8]">{nRecibos}</td>
                      <td className="text-center py-3.5 px-2 text-[#D4D4D8]">{nTimbr}/{nRecibos}</td>
                      <td className="text-right py-3.5 px-4">
                        <span className="text-[10px] text-sky-400 font-semibold">Ver recibos →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detalle período + recibos para timbrar */}
      {selectedPeriodo && (
        <div className="mt-6 bg-[#141414] rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">{selectedPeriodo.nombre}</h3>
              <p className="text-xs text-[#A1A1AA]">{selectedPeriodo.tipo} · {recibosPeriodo.length} recibos</p>
            </div>
            <button onClick={() => setSelectedPeriodo(null)} className="text-xs text-[#A1A1AA]">Cerrar</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-2 px-3 text-[#A1A1AA] font-medium">Empleado</th>
                  <th className="text-right py-2 px-2 text-[#A1A1AA] font-medium">Neto</th>
                  <th className="text-center py-2 px-2 text-[#A1A1AA] font-medium">CFDI</th>
                  <th className="text-center py-2 px-2 text-[#A1A1AA] font-medium">UUID</th>
                  <th className="text-right py-2 px-3 text-[#A1A1AA] font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {recibosPeriodo.map(r => {
                  const cfdi = getCfdiStatus(r.id);
                  return (
                    <tr key={r.id} className="border-b border-[#1F1F1F]">
                      <td className="py-3 px-3 text-white font-medium">#{r.empleado_id}</td>
                      <td className="text-right py-3 px-2 text-[#D4D4D8] font-semibold">
                        ${parseFloat(r.neto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-center py-3 px-2">
                        {cfdi ? (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[cfdi.estatus]}`}>
                            {cfdi.estatus}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#A1A1AA]">—</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2 text-[10px] text-[#A1A1AA] font-mono">
                        {cfdi?.uuid ? cfdi.uuid.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="text-right py-3 px-3">
                        {!cfdi && (
                          <button onClick={() => timbrarUno(r.id)}
                            className="text-[10px] font-semibold bg-sky-500/10 text-sky-400 px-3 py-1.5 rounded-lg hover:bg-sky-500/20 transition-all">
                            Timbrar
                          </button>
                        )}
                        {cfdi?.uuid && (
                          <span className="text-[10px] text-emerald-400">✅</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CFDI emitidos */}
      {cfdiRecibos.length > 0 && (
        <div className="mt-6 bg-[#141414] rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] border border-[#262626] p-6">
          <h3 className="text-sm font-semibold text-white mb-3">CFDI emitidos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left py-2 px-3 text-[#A1A1AA] font-medium">UUID</th>
                  <th className="text-center py-2 px-2 text-[#A1A1AA] font-medium">Folio</th>
                  <th className="text-center py-2 px-2 text-[#A1A1AA] font-medium">Estatus</th>
                  <th className="text-right py-2 px-3 text-[#A1A1AA] font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {cfdiRecibos.slice(0, 10).map(c => (
                  <tr key={c.id} className="border-b border-[#1F1F1F]">
                    <td className="py-3 px-3 text-[10px] font-mono text-[#D4D4D8]">{c.uuid || '—'}</td>
                    <td className="text-center py-3 px-2 text-[#D4D4D8]">{c.serie}{c.folio || ''}</td>
                    <td className="text-center py-3 px-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[c.estatus]}`}>{c.estatus}</span>
                    </td>
                    <td className="text-right py-3 px-3 text-[#A1A1AA]">{fmtFecha(c.fecha_timbrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 text-[11px] text-[#A1A1AA] text-center">
        CFDI 4.0 · Nómina · PAC Finkok · Timbrado oficial
      </div>

      {/* Cancelación */}
      <div className="mt-6 p-4 rounded-xl border border-[#262626] bg-[#141414]">
        <h3 className="text-sm font-semibold text-white mb-3">Cancelar CFDI</h3>
        {cancelMsg && (
          <div className="bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-xs rounded-lg p-2 mb-3">{cancelMsg}</div>
        )}
        <form onSubmit={cancelarCfdi} className="flex gap-2">
          <input type="text" placeholder="UUID del CFDI" value={cancelUuid}
            onChange={e => setCancelUuid(e.target.value)} required
            className="flex-1 bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#10B981] placeholder:text-[#A1A1AA]"
          />
          <input type="text" placeholder="RFC Emisor" value={cancelRfc}
            onChange={e => setCancelRfc(e.target.value.toUpperCase())} required maxLength={13}
            className="w-36 bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#10B981] placeholder:text-[#A1A1AA]"
          />
          <button type="submit" disabled={cancelLoading}
            className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {cancelLoading ? '...' : 'Cancelar'}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
