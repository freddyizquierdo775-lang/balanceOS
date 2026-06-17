import { useState, useEffect } from 'react';
import { clientes, empleados, nomina } from './api';

const STEPS = [
  {
    key: 'welcome',
    title: '¡Bienvenido a Balance OS!',
    subtitle: 'Tu ERP contable premium. Vamos a configurarlo en 4 pasos.',
    icon: '🏢',
  },
  {
    key: 'clientes',
    title: 'Tu primer cliente',
    subtitle: 'Agrega al menos un cliente para empezar a facturar y timbrar.',
    icon: '👥',
  },
  {
    key: 'empleados',
    title: 'Tu primer empleado',
    subtitle: 'Registra un empleado para procesar nóminas y calcular IMSS.',
    icon: '👤',
  },
  {
    key: 'nomina',
    title: 'Tu primera nómina',
    subtitle: 'Crea un período y calcula la nómina de tus empleados.',
    icon: '💰',
  },
  {
    key: 'done',
    title: '¡Listo para operar!',
    subtitle: 'Ya puedes usar Balance OS al 100%.',
    icon: '🚀',
  },
];

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-1 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i <= current ? 'bg-[#10B981] w-8' : 'bg-[#333333] w-4'
          }`}
        />
      ))}
    </div>
  );
}

export default function Onboarding({ onComplete, theme = 'dark' }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cliente: { rfc: '', razon_social: '', regimen_fiscal: '607', email: '' },
    empleado: { rfc: '', curp: '', nombre: '', apellidos: '', salario_diario: '500' },
    periodo: { nombre: 'Primera Quincena', tipo: 'quincenal', fecha_inicio: '', fecha_fin: '' },
  });
  const [error, setError] = useState('');
  const [created, setCreated] = useState({ cliente: null, empleado: null, periodo: null });

  const bg = theme === 'dark' ? '#0A0A0A' : '#F5F5F5';
  const cardBg = theme === 'dark' ? '#141414' : '#FFFFFF';
  const text = theme === 'dark' ? '#E5E7EB' : '#1A1A2E';
  const muted = theme === 'dark' ? '#A1A1AA' : '#6B7280';
  const border = theme === 'dark' ? '#262626' : '#E5E7EB';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#F9FAFB';
  const accent = '#10B981';
  const danger = '#EF4444';

  async function handleClientCreate() {
    setLoading(true);
    setError('');
    try {
      const c = await clientes.crear(formData.cliente);
      setCreated(prev => ({ ...prev, cliente: c }));
      setStep(2);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleEmpleadoCreate() {
    setLoading(true);
    setError('');
    try {
      const e = await empleados.crear({
        ...formData.empleado,
        salario_diario: parseFloat(formData.empleado.salario_diario),
        tipo_contrato: 'base',
        tipo_jornada: 'diurna',
      });
      setCreated(prev => ({ ...prev, empleado: e }));
      setStep(3);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleNominaCreate() {
    setLoading(true);
    setError('');
    try {
      const p = await nomina.crearPeriodo({
        ...formData.periodo,
        fecha_inicio: formData.periodo.fecha_inicio || new Date().toISOString().split('T')[0] + 'T00:00:00',
        fecha_fin: formData.periodo.fecha_fin || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0] + 'T00:00:00',
      });
      setCreated(prev => ({ ...prev, periodo: p }));
      setStep(4);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleFinish() {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  }

  function handleSkip() {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  }

  const stepData = STEPS[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: bg }}>
      <div
        className="w-full max-w-lg rounded-2xl p-8 shadow-2xl"
        style={{
          background: cardBg,
          border: `1px solid ${border}`,
          boxShadow: '0 4px 24px -8px rgba(0,0,0,0.4), 0 2px 12px -4px rgba(16,185,129,0.1)',
        }}
      >
        <StepIndicator current={step} total={STEPS.length - 1} />

        {/* Icon + Title */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">{stepData.icon}</div>
          <h2 className="text-xl font-bold mb-1" style={{ color: text }}>
            {stepData.title}
          </h2>
          <p style={{ color: muted, fontSize: '14px' }}>{stepData.subtitle}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: danger, border: `1px solid rgba(239,68,68,0.3)` }}>
            {error}
          </div>
        )}

        {/* Step 1: Welcome */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-lg" style={{ background: inputBg, border: `1px solid ${border}` }}>
              <p style={{ color: muted, fontSize: '13px', lineHeight: '1.6' }}>
                Balance OS es el ERP más moderno para contadores en México.  
                Dark mode · CFDI 4.0 · IMSS real · REPSE/PLD · CRM · PDFs profesionales.
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90"
              style={{ background: accent, color: '#fff' }}
            >
              Comenzar configuración →
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-2 text-sm underline cursor-pointer"
              style={{ color: muted, background: 'transparent', border: 'none' }}
            >
              Omitir — ir al dashboard
            </button>
          </div>
        )}

        {/* Step 2: Cliente */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            {['rfc', 'razon_social', 'email'].map(field => (
              <input
                key={field}
                type="text"
                placeholder={field === 'rfc' ? 'RFC del cliente' : field === 'razon_social' ? 'Razón Social' : 'Email (opcional)'}
                value={formData.cliente[field]}
                onChange={e => setFormData(prev => ({ ...prev, cliente: { ...prev.cliente, [field]: e.target.value } }))}
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-colors"
                style={{
                  background: inputBg,
                  border: `1px solid ${border}`,
                  color: text,
                }}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = border}
              />
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleClientCreate}
                disabled={loading || !formData.cliente.rfc || !formData.cliente.razon_social}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40"
                style={{ background: accent, color: '#fff' }}
              >
                {loading ? 'Creando...' : 'Crear Cliente'}
              </button>
              <button
                onClick={() => setStep(2)}
                className="px-4 py-3 rounded-xl text-sm transition-colors"
                style={{ background: 'transparent', color: muted, border: `1px solid ${border}` }}
              >
                Saltar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Empleado */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            {[
              { key: 'rfc', placeholder: 'RFC del empleado' },
              { key: 'nombre', placeholder: 'Nombre' },
              { key: 'apellidos', placeholder: 'Apellidos' },
              { key: 'salario_diario', placeholder: 'Salario Diario (ej: 500)' },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                type="text"
                placeholder={placeholder}
                value={formData.empleado[key]}
                onChange={e => setFormData(prev => ({ ...prev, empleado: { ...prev.empleado, [key]: e.target.value } }))}
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-colors"
                style={{
                  background: inputBg,
                  border: `1px solid ${border}`,
                  color: text,
                }}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = border}
              />
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleEmpleadoCreate}
                disabled={loading || !formData.empleado.rfc || !formData.empleado.nombre || !formData.empleado.salario_diario}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40"
                style={{ background: accent, color: '#fff' }}
              >
                {loading ? 'Creando...' : 'Crear Empleado'}
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-3 rounded-xl text-sm transition-colors"
                style={{ background: 'transparent', color: muted, border: `1px solid ${border}` }}
              >
                Saltar
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Nómina */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nombre del período (ej: Quincena 1)"
              value={formData.periodo.nombre}
              onChange={e => setFormData(prev => ({ ...prev, periodo: { ...prev.periodo, nombre: e.target.value } }))}
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-colors"
              style={{ background: inputBg, border: `1px solid ${border}`, color: text }}
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e => e.target.style.borderColor = border}
            />
            <button
              onClick={handleNominaCreate}
              disabled={loading || !formData.periodo.nombre}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40"
              style={{ background: accent, color: '#fff' }}
            >
              {loading ? 'Creando...' : 'Crear Período de Nómina'}
            </button>
            <button
              onClick={() => setStep(4)}
              className="w-full py-2 text-sm underline cursor-pointer"
              style={{ color: muted, background: 'transparent', border: 'none' }}
            >
              Lo haré después
            </button>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 4 && (
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-lg mb-2" style={{ background: 'rgba(16,185,129,0.08)', border: `1px solid rgba(16,185,129,0.2)` }}>
              <p style={{ color: accent, fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>✅ Configuración completada</p>
              <p style={{ color: muted, fontSize: '12px' }}>
                {created.cliente ? '✓ Cliente creado' : '○ Cliente pendiente'}  
                {' · '}
                {created.empleado ? '✓ Empleado creado' : '○ Empleado pendiente'}  
                {' · '}
                {created.periodo ? '✓ Período creado' : '○ Período pendiente'}
              </p>
            </div>
            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90"
              style={{ background: accent, color: '#fff' }}
            >
              Ir al Dashboard 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
