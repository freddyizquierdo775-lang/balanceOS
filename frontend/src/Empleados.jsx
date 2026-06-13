import { useState, useEffect } from 'react';
import { empleados } from './api';

const TIPO_CONTRATO = ['base', 'sindicalizado', 'honorarios', 'temporal', 'outsourcing'];
const TIPO_JORNADA = ['diurna', 'nocturna', 'mixta', 'reducida'];
const RIESGO_LABEL = {1: 'I — Mínimo', 2: 'II — Bajo', 3: 'III — Medio', 4: 'IV — Alto', 5: 'V — Máximo'};

const formFields = [
  { key: 'rfc', label: 'RFC', type: 'text', required: true, placeholder: 'XAXX010101000' },
  { key: 'curp', label: 'CURP', type: 'text', required: true, placeholder: 'XAXX010101HDFXXX00' },
  { key: 'nombre', label: 'Nombre(s)', type: 'text', required: true },
  { key: 'apellidos', label: 'Apellidos', type: 'text', required: true },
  { key: 'salario_diario', label: 'Salario Diario ($)', type: 'number', required: true, step: '0.01' },
  { key: 'fecha_nacimiento', label: 'Fecha Nacimiento', type: 'date' },
  { key: 'fecha_ingreso', label: 'Fecha Ingreso', type: 'date' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'telefono', label: 'Teléfono', type: 'text' },
  { key: 'banco', label: 'Banco', type: 'text' },
  { key: 'cuenta_bancaria', label: 'Cuenta Bancaria', type: 'text' },
  { key: 'clabe', label: 'CLABE', type: 'text' },
];

const emptyForm = () => ({
  rfc: '', curp: '', nombre: '', apellidos: '', salario_diario: '',
  fecha_nacimiento: '', fecha_ingreso: '', email: '', telefono: '',
  banco: '', cuenta_bancaria: '', clabe: '',
  tipo_contrato: 'base', tipo_jornada: 'diurna', clase_riesgo: 1,
});

export default function Empleados({ usuario }) {
  const [lista, setLista] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const cargar = async () => {
    try {
      const data = await empleados.listar();
      setLista(data);
    } catch (e) {
      setFeedback({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const resetForm = () => { setForm(emptyForm()); setEditId(null); setFeedback(null); };

  const guardar = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload = {
        ...form,
        salario_diario: parseFloat(form.salario_diario),
        fecha_nacimiento: form.fecha_nacimiento ? new Date(form.fecha_nacimiento).toISOString() : null,
        fecha_ingreso: form.fecha_ingreso ? new Date(form.fecha_ingreso).toISOString() : null,
      };
      if (editId) {
        // Only send changed fields
        const orig = lista.find(e => e.id === editId);
        const diff = {};
        Object.entries(payload).forEach(([k, v]) => {
          const origV = k === 'salario_diario' ? parseFloat(orig[k]) : orig[k];
          if (k === 'fecha_nacimiento' || k === 'fecha_ingreso') {
            const origDate = orig[k] ? orig[k].split('T')[0] : '';
            const newDate = v ? v.split('T')[0] : '';
            if (newDate !== origDate) diff[k] = v;
          } else if (String(v) !== String(origV)) {
            diff[k] = v;
          }
        });
        await empleados.actualizar(editId, diff);
        setFeedback({ type: 'success', text: 'Empleado actualizado' });
      } else {
        await empleados.crear(payload);
        setFeedback({ type: 'success', text: 'Empleado creado' });
      }
      resetForm();
      setShowForm(false);
      cargar();
    } catch (e) {
      setFeedback({ type: 'error', text: e.message });
    }
  };

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    try {
      await empleados.eliminar(id);
      cargar();
    } catch (e) {
      setFeedback({ type: 'error', text: e.message });
    }
  };

  const abrirEdicion = (e) => {
    setForm({
      rfc: e.rfc, curp: e.curp, nombre: e.nombre, apellidos: e.apellidos,
      salario_diario: e.salario_diario,
      fecha_nacimiento: e.fecha_nacimiento ? e.fecha_nacimiento.split('T')[0] : '',
      fecha_ingreso: e.fecha_ingreso ? e.fecha_ingreso.split('T')[0] : '',
      email: e.email || '', telefono: e.telefono || '',
      banco: e.banco || '', cuenta_bancaria: e.cuenta_bancaria || '', clabe: e.clabe || '',
      tipo_contrato: e.tipo_contrato, tipo_jornada: e.tipo_jornada, clase_riesgo: e.clase_riesgo,
    });
    setEditId(e.id);
    setShowForm(true);
    setFeedback(null);
  };

  const filtered = lista.filter(e =>
    !search || e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.rfc.toLowerCase().includes(search.toLowerCase()) ||
    e.apellidos.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-sm text-slate-400">Cargando...</div>;

  return (
    <main className="mobile-scroll overflow-y-auto h-full">
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">Empleados</h1>
          <p className="text-sm text-slate-500 mt-1">{lista.length} registros</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all">
          {showForm ? '✕ Cerrar' : '+ Nuevo'}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-xs font-medium ${
          feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.text}
        </div>
      )}

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre, RFC o apellidos..."
        className="w-full mb-4 bg-white border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />

      {/* Form */}
      {showForm && (
        <form onSubmit={guardar} className="bg-white rounded-2xl p-6 mb-6 border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">{editId ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
          <div className="grid grid-cols-3 gap-4">
            {formFields.map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  {f.label}{f.required ? ' *' : ''}
                </label>
                <input type={f.type} value={form[f.key]} step={f.step}
                  onChange={e => setForm({...form, [f.key]: e.target.value})}
                  required={f.required} placeholder={f.placeholder}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15" />
              </div>
            ))}
            {/* Selects */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Contrato</label>
              <select value={form.tipo_contrato} onChange={e => setForm({...form, tipo_contrato: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                {TIPO_CONTRATO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Jornada</label>
              <select value={form.tipo_jornada} onChange={e => setForm({...form, tipo_jornada: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                {TIPO_JORNADA.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Clase de Riesgo</label>
              <select value={form.clase_riesgo} onChange={e => setForm({...form, clase_riesgo: parseInt(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                {[1,2,3,4,5].map(r => <option key={r} value={r}>{RIESGO_LABEL[r]}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="px-6 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all">
              {editId ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">
            {search ? 'Sin resultados' : 'No hay empleados registrados'}
          </div>
        ) : filtered.map(e => (
          <div key={e.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between hover:border-slate-200 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{e.nombre} {e.apellidos}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{e.tipo_contrato}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  e.estatus === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>{e.estatus}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 space-x-3">
                <span>RFC: {e.rfc}</span>
                <span>Salario: ${parseFloat(e.salario_diario).toFixed(2)}/día</span>
                <span>Riesgo: {RIESGO_LABEL[e.clase_riesgo]}</span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0 ml-4">
              <button onClick={() => abrirEdicion(e)}
                className="text-slate-300 hover:text-slate-600 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-slate-100">✎</button>
              <button onClick={() => eliminar(e.id, `${e.nombre} ${e.apellidos}`)}
                className="text-slate-300 hover:text-red-500 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-slate-100">✕</button>
            </div>
          </div>
        ))}
      </div>
      </div>
    </main>
  );
}
