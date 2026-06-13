import ModuleToggle from './components/ModuleToggle';
import PricingCard from './components/PricingCard';

export default function ModuleSettings({ className = '' }) {
  const handleActivate = (moduleId) => {
    const saved = localStorage.getItem('modulos_activos');
    const activos = saved ? JSON.parse(saved) : ['contabilidad', 'facturacion', 'nomina'];
    if (!activos.includes(moduleId)) {
      const updated = [...activos, moduleId];
      localStorage.setItem('modulos_activos', JSON.stringify(updated));
      window.dispatchEvent(new Event('modulos-updated'));
    }
  };

  return (
    <div className={`mobile-scroll overflow-y-auto h-full ${className}`}>
      <div className="px-6 md:px-10 py-8 max-w-4xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">Módulos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona los módulos activos de tu cuenta</p>
        </div>

        {/* Toggle section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-900/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] mb-8">
          <ModuleToggle />
        </div>

        {/* Pricing cards para módulos no comprados */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">Módulos disponibles</h2>
          <p className="text-xs text-slate-500 mb-4">Explora todos los módulos de Balance OS</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['contabilidad', 'facturacion', 'nomina', 'repse', 'pld', 'tesoreria', 'estados-financieros', 'alertas-efos'].map(id => (
              <PricingCard key={id} moduleId={id} onActivate={handleActivate} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
