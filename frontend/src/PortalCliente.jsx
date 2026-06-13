import { useState, useEffect, useCallback } from 'react';

const fmt = (n) => {
  if (n === null || n === undefined) return '$0.00';
  return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2 });
};

const fmtFecha = (s) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const api = async (path) => {
  const token = localStorage.getItem('token');
  const r = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) { localStorage.clear(); window.location.reload(); throw new Error('Sesión expirada'); }
  return r.json();
};

export default function PortalCliente({ usuario, cerrarSesion }) {
  const [page, setPage] = useState('dashboard');
  const [perfil, setPerfil] = useState(null);
  const [recibos, setRecibos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r, d] = await Promise.all([
        api('/portal/mi-perfil').catch(() => null),
        api('/portal/mis-recibos').catch(() => []),
        api('/portal/mis-documentos').catch(() => []),
      ]);
      setPerfil(p);
      setRecibos(r || []);
      setDocumentos(d || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const totalesRecibos = recibos.reduce((acc, r) => ({
    percepciones: acc.percepciones + parseFloat(r.total_percepciones || 0),
    deducciones: acc.deducciones + parseFloat(r.total_deducciones || 0),
    neto: acc.neto + parseFloat(r.neto || 0),
  }), { percepciones: 0, deducciones: 0, neto: 0 });

  if (loading) return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="text-slate-400 text-sm">Cargando...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl text-sm">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Navbar minimal */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-900/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-900">
              <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
              <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
              <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
            </svg>
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">Mi Portal</span>
          </div>
          <span className="text-xs text-slate-400">
            {perfil?.razon_social || usuario.nombre}
            <button onClick={cerrarSesion} className="ml-3 text-red-400 hover:text-red-600 transition-colors">Salir</button>
          </span>
        </div>
      </nav>

      {/* Nav tabs */}
      <div className="border-b border-slate-900/5 bg-white">
        <div className="max-w-4xl mx-auto px-6 flex gap-4">
          {[
            { key: 'dashboard', label: '📊 Dashboard' },
            { key: 'recibos', label: '📄 Recibos' },
            { key: 'documentos', label: '📎 Documentos' },
            { key: 'perfil', label: '👤 Perfil' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setPage(tab.key)}
              className={`py-3 text-xs font-medium border-b-2 transition-all ${
                page === tab.key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {page === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Dashboard</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Recibos</div>
                <div className="text-2xl font-extrabold text-slate-900">{recibos.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">Emitidos</div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total neto</div>
                <div className="text-2xl font-extrabold text-[#2E8B57]">{fmt(totalesRecibos.neto)}</div>
                <div className="text-[11px] text-slate-500 mt-1">Acumulado</div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Documentos</div>
                <div className="text-2xl font-extrabold text-slate-900">{documentos.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">En tu expediente</div>
              </div>
            </div>
            {recibos.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Últimos recibos</h3>
                {recibos.slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                    <div>
                      <div className="text-xs font-medium text-slate-900">Recibo #{r.id}</div>
                      <div className="text-[10px] text-slate-400">{fmtFecha(r.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#2E8B57]">{fmt(r.neto)}</div>
                      <div className="text-[10px] text-slate-400">Neto</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {page === 'recibos' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Mis recibos de nómina</h2>
            {recibos.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-900/5">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-sm text-slate-400">Sin recibos disponibles</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-900/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">#</th>
                        <th className="text-right py-3 px-2 text-slate-400 font-medium">Sueldo</th>
                        <th className="text-right py-3 px-2 text-slate-400 font-medium">Percepciones</th>
                        <th className="text-right py-3 px-2 text-slate-400 font-medium">Deducciones</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Neto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recibos.map(r => (
                        <tr key={r.id} className="border-b border-slate-50">
                          <td className="py-3 px-4 text-slate-900 font-medium">#{r.id}</td>
                          <td className="text-right py-3 px-2 text-slate-600">{fmt(r.sueldo_base)}</td>
                          <td className="text-right py-3 px-2 text-slate-900 font-semibold">{fmt(r.total_percepciones)}</td>
                          <td className="text-right py-3 px-2 text-red-600">{fmt(r.total_deducciones)}</td>
                          <td className="text-right py-3 px-4 text-[#2E8B57] font-bold">{fmt(r.neto)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td className="py-3 px-4 text-slate-900 font-bold">Totales</td>
                        <td></td>
                        <td className="text-right py-3 px-2 font-bold">{fmt(totalesRecibos.percepciones)}</td>
                        <td className="text-right py-3 px-2 font-bold text-red-600">{fmt(totalesRecibos.deducciones)}</td>
                        <td className="text-right py-3 px-4 font-bold text-[#2E8B57]">{fmt(totalesRecibos.neto)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {page === 'documentos' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Mis documentos</h2>
            {documentos.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-900/5">
                <div className="text-4xl mb-3">📎</div>
                <p className="text-sm text-slate-400">Sin documentos disponibles</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {documentos.map(d => (
                  <div key={d.id} className="bg-white rounded-2xl p-4 border border-slate-900/5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{d.nombre || 'Documento'}</div>
                      <div className="text-[10px] text-slate-400">{d.tipo} · {fmtFecha(d.created_at)}</div>
                    </div>
                    <span className="text-[10px] text-slate-400">{d.tipo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {page === 'perfil' && perfil && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Mi perfil</h2>
            <div className="bg-white rounded-2xl p-6 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Razón social', value: perfil.razon_social },
                  { label: 'RFC', value: perfil.rfc },
                  { label: 'Régimen fiscal', value: perfil.regimen_fiscal },
                  { label: 'Tipo persona', value: perfil.tipo_persona },
                  { label: 'Email', value: perfil.email || '—' },
                  { label: 'Teléfono', value: perfil.telefono || '—' },
                  { label: 'Estatus', value: perfil.estatus },
                  { label: 'REPSE', value: perfil.tiene_repse ? '✅ Activo' : '—' },
                ].map(f => (
                  <div key={f.label}>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">{f.label}</div>
                    <div className="text-sm text-slate-900 font-medium">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
            {perfil.fiel_vencimiento && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <span className="text-xs text-amber-700">⚠️ FIEL vence: {fmtFecha(perfil.fiel_vencimiento)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center py-6 text-[11px] text-slate-400">
        Balance OS · Portal del Cliente · {new Date().getFullYear()}
      </div>
    </div>
  );
}
