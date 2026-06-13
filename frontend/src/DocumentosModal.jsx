import { useState, useEffect, useRef } from 'react';
import { documentos } from './api';

const TIPOS = [
  { value: 'constancia', label: 'Constancia' },
  { value: 'opinion', label: 'Opinión' },
  { value: 'declaracion', label: 'Declaración' },
  { value: 'cfdi', label: 'CFDI' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'acuse', label: 'Acuse' },
  { value: 'otro', label: 'Otro' },
];

export default function DocumentosModal({ cliente, onClose }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [filtro, setFiltro] = useState('');
  const fileRef = useRef(null);
  const [uploadTipo, setUploadTipo] = useState('otro');

  const load = async () => {
    setLoading(true);
    try {
      const data = await documentos.listar(cliente.id, filtro);
      setLista(data);
    } catch (err) {
      console.error('Error al cargar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [cliente.id, filtro]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendo(true);
    try {
      await documentos.subir(cliente.id, file, uploadTipo);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubiendo(false);
      fileRef.current.value = '';
    }
  };

  const eliminar = async (doc) => {
    if (!window.confirm(`¿Eliminar "${doc.nombre}" definitivamente?`)) return;
    try {
      await documentos.eliminar(doc.id);
      setLista(prev => prev.filter(d => d.id !== doc.id));
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getIcon = (tipo) => {
    const icons = {
      constancia: '📋', opinion: '📊', declaracion: '📄',
      cfdi: '🧾', contrato: '📝', acuse: '✅', otro: '📎',
    };
    return icons[tipo] || '📎';
  };

  const getTipoLabel = (tipo) => {
    const t = TIPOS.find(t => t.value === tipo);
    return t ? t.label : tipo;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#141414] rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-[#262626] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Documentos</h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">{cliente.razon_social}</p>
          </div>
          <button onClick={onClose} className="text-[#A1A1AA] hover:text-[#D4D4D8] text-lg leading-none p-1">&times;</button>
        </div>

        {/* Upload area */}
        <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4 border border-dashed border-[#333333]">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={uploadTipo} onChange={e => setUploadTipo(e.target.value)}
              className="bg-[#141414] border border-[#333333] rounded-lg px-3 py-2 text-xs font-medium text-[#D4D4D8] outline-none focus:border-[#10B981]">
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              ref={fileRef}
              type="file"
              onChange={handleUpload}
              disabled={subiendo}
              className="flex-1 text-xs text-[#A1A1AA] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0A0A0A] file:text-white hover:file:bg-slate-800 file:cursor-pointer file:transition-all"
            />
            {subiendo && <span className="text-xs text-[#A1A1AA]">Subiendo...</span>}
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFiltro('')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${!filtro ? 'bg-[#0A0A0A] text-white' : 'bg-[#262626] text-[#A1A1AA] hover:bg-[#333333]'}`}>
            Todos
          </button>
          {TIPOS.map(t => (
            <button key={t.value} onClick={() => setFiltro(t.value)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filtro === t.value ? 'bg-[#0A0A0A] text-white' : 'bg-[#262626] text-[#A1A1AA] hover:bg-[#333333]'}`}>
              {getIcon(t.value)} {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-sm text-[#A1A1AA]">Cargando...</div>
          ) : lista.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#A1A1AA]">
              {filtro ? 'Sin documentos de este tipo' : 'Sin documentos. Arrastra o selecciona archivos arriba.'}
            </div>
          ) : (
            lista.map(doc => (
              <div key={doc.id} className="group flex items-center justify-between bg-[#1A1A1A] rounded-xl px-4 py-3 hover:bg-[#262626] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{getIcon(doc.tipo)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{doc.nombre}</span>
                      <span className="text-[10px] text-[#A1A1AA] bg-[#141414] px-2 py-0.5 rounded-full border border-[#333333] shrink-0">
                        {getTipoLabel(doc.tipo)}
                      </span>
                    </div>
                    <div className="text-xs text-[#A1A1AA] mt-0.5">
                      {formatDate(doc.created_at)}
                      {doc.notas && <span className="ml-2 text-[#71717A]">· {doc.notas}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <a href={documentos.descargarUrl(doc.id)}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[#71717A] hover:text-[#2E8B57] transition-colors text-sm px-2 py-1 rounded-lg hover:bg-[#141414]"
                    title="Descargar">
                    ↓
                  </a>
                  <button onClick={() => eliminar(doc)}
                    className="text-[#71717A] hover:text-red-400 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-[#141414]"
                    title="Eliminar">
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
