import { useState, useEffect, useCallback } from 'react';
import { cfdi, nomina } from './api';

const ESTATUS_COLOR = {
  timbrado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  cancelado: 'bg-slate-50 text-slate-400 border-slate-200',
};

const fmtFecha = (s) => s ? new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function CFDI({ usuario }) {
  const [periodos, setPeriodos] = useState([]);
  const [cfdiRecibos, setCfdiRecibos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [recibosPeriodo, setRecibosPeriodo] = useState([]);
  const [timbrarMsg, setTimbrarMsg] = useState('');
  const [error, setError] = useState('');

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

  const getCfdiStatus = (reciboId) => {
    const c = cfdiRecibos.find(x => x.recibo_id === reciboId);
    return c;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">CFDI / Timbrado</h1>
        <p className="text-sm text-slate-500 mt-1">Generación de CFDI 4.0 de nómina (PAC mock)</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-6">{error}</div>}
      {timbrarMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3 mb-6">{timbrarMsg}</div>}

      {/* Períodos con recibos */}
      <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-base font-semibold text-slate-900">Períodos calculados</h2>
        </div>
        {periodos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm text-slate-400">Sin períodos de nómina</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Período</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Tipo</th>
                  <th className="text-center py-3 px-2 text-slate-400 font-medium">Recibos</th>
                  <th className="text-center py-3 px-2 text-slate-400 font-medium">Timbrados</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {periodos.filter(p => p.estatus === 'calculado' || p.estatus === 'pagado').map(p => {
                  const nRecibos = p.recibos?.length || 0;
                  const nTimbr = cfdiRecibos.filter(c => p.recibos?.some(r => r.id === c.recibo_id)).length;
                  return (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                      onClick={() => verRecibosPeriodo(p)}>
                      <td className="py-3.5 px-4 text-slate-900 font-medium">{p.nombre}</td>
                      <td className="py-3.5 px-2 text-slate-500">{p.tipo}</td>
                      <td className="text-center py-3.5 px-2 text-slate-600">{nRecibos}</td>
                      <td className="text-center py-3.5 px-2 text-slate-600">{nTimbr}/{nRecibos}</td>
                      <td className="text-right py-3.5 px-4">
                        <span className="text-[10px] text-sky-600 font-semibold">Ver recibos →</span>
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
        <div className="mt-6 bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{selectedPeriodo.nombre}</h3>
              <p className="text-xs text-slate-500">{selectedPeriodo.tipo} · {recibosPeriodo.length} recibos</p>
            </div>
            <button onClick={() => setSelectedPeriodo(null)} className="text-xs text-slate-400">Cerrar</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Empleado</th>
                  <th className="text-right py-2 px-2 text-slate-400 font-medium">Neto</th>
                  <th className="text-center py-2 px-2 text-slate-400 font-medium">CFDI</th>
                  <th className="text-center py-2 px-2 text-slate-400 font-medium">UUID</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {recibosPeriodo.map(r => {
                  const cfdi = getCfdiStatus(r.id);
                  return (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="py-3 px-3 text-slate-900 font-medium">#{r.empleado_id}</td>
                      <td className="text-right py-3 px-2 text-slate-600 font-semibold">
                        ${parseFloat(r.neto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-center py-3 px-2">
                        {cfdi ? (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[cfdi.estatus]}`}>
                            {cfdi.estatus}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2 text-[10px] text-slate-500 font-mono">
                        {cfdi?.uuid ? cfdi.uuid.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="text-right py-3 px-3">
                        {!cfdi && (
                          <button onClick={() => timbrarUno(r.id)}
                            className="text-[10px] font-semibold bg-sky-50 text-sky-600 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-all">
                            Timbrar
                          </button>
                        )}
                        {cfdi?.uuid && (
                          <span className="text-[10px] text-emerald-600">✅</span>
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
        <div className="mt-6 bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">CFDI emitidos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">UUID</th>
                  <th className="text-center py-2 px-2 text-slate-400 font-medium">Folio</th>
                  <th className="text-center py-2 px-2 text-slate-400 font-medium">Estatus</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {cfdiRecibos.slice(0, 10).map(c => (
                  <tr key={c.id} className="border-b border-slate-50">
                    <td className="py-3 px-3 text-[10px] font-mono text-slate-600">{c.uuid || '—'}</td>
                    <td className="text-center py-3 px-2 text-slate-600">{c.serie}{c.folio || ''}</td>
                    <td className="text-center py-3 px-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ESTATUS_COLOR[c.estatus]}`}>{c.estatus}</span>
                    </td>
                    <td className="text-right py-3 px-3 text-slate-500">{fmtFecha(c.fecha_timbrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 text-[11px] text-slate-400 text-center">
        CFDI 4.0 · Nómina · PAC mock (desarrollo) · Conectar PAC real para timbrado oficial
      </div>
    </div>
  );
}
