import { useState } from 'react';

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

export default function ApiPublica({ usuario }) {
  const [apiKey, setApiKey] = useState('');
  const [rfcConsulta, setRfcConsulta] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testWebhookUrl, setTestWebhookUrl] = useState('');
  const [testWebhookPayload, setTestWebhookPayload] = useState('{"evento": "test", "cliente_rfc": "AAA010101AAA"}');
  const [webhookResult, setWebhookResult] = useState(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/clientes',
      desc: 'Listar todos los clientes (versión pública)',
      params: '?api_key=TU_API_KEY',
    },
    {
      method: 'GET',
      path: '/api/v1/clientes/{rfc}',
      desc: 'Consultar un cliente por RFC',
      params: '?api_key=TU_API_KEY',
    },
  ];

  const probarEndpoint = async (endpointPath, rfcParam = '') => {
    setError('');
    setResultado(null);

    if (!apiKey) {
      setError('Ingresa una API Key primero');
      return;
    }

    setLoading(true);
    try {
      let path = endpointPath;
      if (rfcParam) {
        path = path.replace('{rfc}', rfcParam.trim().toUpperCase());
      }
      const data = await apiFetch(`${path}?api_key=${encodeURIComponent(apiKey)}`);
      setResultado(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const probarWebhook = async () => {
    if (!testWebhookUrl) {
      setError('Ingresa una URL de webhook');
      return;
    }
    setWebhookLoading(true);
    setError('');
    setWebhookResult(null);
    try {
      let payload;
      try {
        payload = JSON.parse(testWebhookPayload);
      } catch {
        throw new Error('Payload JSON inválido');
      }
      const data = await apiFetch('/api/v1/webhook', {
        method: 'POST',
        body: JSON.stringify({
          url: testWebhookUrl,
          payload,
        }),
      });
      setWebhookResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setWebhookLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">API Pública</h1>
        <p className="text-sm text-slate-500 mt-1">Documentación y pruebas de la API pública de Balance OS</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>
      )}

      {/* API Key Input */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">🔑 API Key</h2>
        <p className="text-xs text-slate-500 mb-3">Ingresa la API Key configurada en el backend para autenticar las pruebas</p>
        <div className="flex gap-3">
          <input type="text" value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-balance-xxx..."
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-slate-300 font-mono"
          />
          {apiKey && (
            <button onClick={() => setApiKey('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-3">Limpiar</button>
          )}
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-4 mb-6">
        <h2 className="text-base font-semibold text-slate-900">📡 Endpoints disponibles</h2>

        {endpoints.map((ep, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-1 rounded-lg uppercase">{ep.method}</span>
              <code className="text-sm font-mono text-slate-900">{ep.path}</code>
            </div>
            <p className="text-xs text-slate-500 mb-3">{ep.desc}</p>
            <p className="text-[10px] text-slate-400 mb-3 font-mono">Parámetros: <code className="text-slate-500">{ep.params}</code></p>

            {ep.path.includes('{rfc}') ? (
              <div className="flex gap-2">
                <input type="text" value={rfcConsulta}
                  onChange={e => setRfcConsulta(e.target.value.toUpperCase())}
                  placeholder="RFC del cliente"
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-slate-300 font-mono max-w-[200px]" />
                <button onClick={() => probarEndpoint(ep.path, rfcConsulta)}
                  disabled={loading || !apiKey || !rfcConsulta}
                  className="bg-slate-900 text-white text-xs font-semibold rounded-xl px-4 py-2.5 hover:bg-slate-800 transition-all disabled:opacity-50">
                  {loading ? 'Probando...' : 'Probar'}
                </button>
              </div>
            ) : (
              <button onClick={() => probarEndpoint(ep.path)}
                disabled={loading || !apiKey}
                className="bg-slate-900 text-white text-xs font-semibold rounded-xl px-4 py-2.5 hover:bg-slate-800 transition-all disabled:opacity-50">
                {loading ? 'Probando...' : 'Probar'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Result */}
      {resultado && (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">📦 Respuesta</h3>
            <button onClick={() => setResultado(null)}
              className="text-xs text-slate-400 hover:text-slate-600">Cerrar</button>
          </div>
          <pre className="bg-slate-50 rounded-xl p-4 text-xs font-mono text-slate-700 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        </div>
      )}

      {/* Webhook */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔗</span>
          <h2 className="text-sm font-semibold text-slate-900">Webhook</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">Configura una URL para recibir callbacks de Balance OS cuando ocurran eventos como creación de clientes, alertas EFOS, etc.</p>

        {/* Configure webhook URL */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">URL del webhook</label>
          <input type="url" value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://tu-sistema.com/webhook/balance-os"
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-slate-300 font-mono"
          />
        </div>

        <div className="border-t border-slate-100 pt-4 mt-4">
          <h3 className="text-xs font-semibold text-slate-900 mb-3">Probar webhook</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">URL de prueba</label>
              <input type="url" value={testWebhookUrl}
                onChange={e => setTestWebhookUrl(e.target.value)}
                placeholder="https://webhook.site/..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Payload (JSON)</label>
              <textarea value={testWebhookPayload}
                onChange={e => setTestWebhookPayload(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-mono outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15"
              />
            </div>
          </div>
          <button onClick={probarWebhook} disabled={webhookLoading || !testWebhookUrl}
            className="bg-slate-900 text-white text-xs font-semibold rounded-xl px-5 py-2.5 hover:bg-slate-800 transition-all disabled:opacity-50">
            {webhookLoading ? 'Enviando...' : 'Probar webhook'}
          </button>

          {webhookResult && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1">✅ Webhook enviado</p>
              <pre className="text-[10px] font-mono text-emerald-600 overflow-x-auto mt-1">
                {JSON.stringify(webhookResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 text-[11px] text-slate-400 text-center leading-relaxed">
        La API pública permite integración con sistemas externos. Los endpoints requieren autenticación via API Key.
        Consulta la documentación completa para más detalles sobre los formatos de respuesta y límites de tasa.
      </div>
    </div>
  );
}
