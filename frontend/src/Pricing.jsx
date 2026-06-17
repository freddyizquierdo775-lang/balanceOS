import { useState, useEffect } from 'react';
import { stripe as stripeApi } from './api';

// ─── Plan Icons ──────────────────────────────────────
const PLAN_ICONS = {
  starter: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  pro: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  enterprise: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
    </svg>
  ),
};

// ─── Feature Checkmark ──────────────────────────────
function CheckIcon() {
  return (
    <svg className="w-4 h-4 mt-0.5 text-[#10B981] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Spinner ─────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Main Pricing Component ─────────────────────────
export default function Pricing({ usuario }) {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    async function fetchPlanes() {
      try {
        const data = await stripeApi.plans();
        setPlanes(data);
      } catch (err) {
        setError(err.message || 'Error al cargar planes');
      } finally {
        setLoading(false);
        setTimeout(() => setAnimar(true), 50);
      }
    }
    fetchPlanes();
  }, []);

  const handleCheckout = async (planId) => {
    if (planId === 'enterprise') {
      window.location.href = '/contacto-ventas';
      return;
    }
    try {
      setLoadingPlan(planId);
      const data = await stripeApi.createCheckout(planId);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-6 md:px-10 py-8">
        {/* Header */}
        <div
          className={`mb-8 transition-all duration-500 ${animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <h1 className="text-2xl font-extrabold tracking-tighter text-white">
            Planes y Precios
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Elige el plan que mejor se adapte a tu despacho. Todos los precios en MXN.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 underline hover:text-red-300"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
          {planes.map((plan, i) => {
            const isEnterprise = plan.id === 'enterprise';
            const isPro = plan.id === 'pro';

            return (
              <div
                key={plan.id}
                className={`relative group transition-all duration-500 ${
                  animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Highlighted card (Pro) */}
                {isPro && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A] bg-[#10B981] px-3 py-1 rounded-full">
                      Más Popular
                    </span>
                  </div>
                )}

                {/* Glass card */}
                <div
                  className={`relative bg-[#141414]/70 backdrop-blur-xl rounded-2xl border p-6 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] h-full flex flex-col ${
                    isPro
                      ? 'border-[#10B981]/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                      : 'border-[#262626]'
                  }`}
                >
                  {/* Icon + Plan Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isEnterprise ? 'bg-purple-500/10 text-purple-400' :
                      isPro ? 'bg-[#10B981]/10 text-[#10B981]' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {PLAN_ICONS[plan.id] || PLAN_ICONS.starter}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{plan.nombre}</h3>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-1">
                    {plan.precio_mxn ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-white">
                          ${plan.precio_mxn}
                        </span>
                        <span className="text-sm text-[#A1A1AA]">USD/mes</span>
                      </div>
                    ) : (
                      <div className="text-2xl font-extrabold text-white">
                        Contactar
                      </div>
                    )}
                    {plan.precio_mxn_aprox && (
                      <p className="text-xs text-[#71717A] mt-0.5">
                        ~${plan.precio_mxn_aprox} MXN/mes
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#A1A1AA] leading-relaxed mt-3 mb-5">
                    {plan.descripcion}
                  </p>

                  {/* Specs */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="text-[10px] font-medium text-[#D4D4D8] bg-[#1A1A1A] px-2.5 py-1 rounded-full">
                      {typeof plan.clientes === 'number' ? `${plan.clientes} clientes` : plan.clientes}
                    </span>
                    <span className="text-[10px] font-medium text-[#D4D4D8] bg-[#1A1A1A] px-2.5 py-1 rounded-full">
                      {typeof plan.nominas_mes === 'number' ? `${plan.nominas_mes} nóminas/mes` : plan.nominas_mes}
                    </span>
                    <span className="text-[10px] font-medium text-[#D4D4D8] bg-[#1A1A1A] px-2.5 py-1 rounded-full">
                      {plan.soporte}
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[#D4D4D8]">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 ${
                      isEnterprise
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : isPro
                        ? 'bg-[#10B981] hover:bg-[#059669] text-[#0A0A0A]'
                        : 'bg-white/[0.08] hover:bg-white/[0.12] text-white border border-[#333333]'
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Cargando...
                      </span>
                    ) : isEnterprise ? (
                      'Contactar Ventas'
                    ) : (
                      'Comenzar Ahora'
                    )}
                  </button>

                  {!isEnterprise && (
                    <p className="text-center text-[10px] text-[#71717A] mt-2">
                      Sin compromiso · Cancela cuando quieras
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Additional info */}
        <div
          className={`mt-12 max-w-3xl transition-all duration-500 delay-500 ${
            animar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h2 className="text-lg font-bold text-white mb-4">Preguntas Frecuentes</h2>
          <div className="space-y-3">
            <div className="bg-[#141414] rounded-xl p-4 border border-[#262626]">
              <p className="text-sm font-medium text-white mb-1">¿Puedo cambiar de plan después?</p>
              <p className="text-xs text-[#A1A1AA]">Sí, puedes hacer upgrade o downgrade en cualquier momento desde el panel de suscripción.</p>
            </div>
            <div className="bg-[#141414] rounded-xl p-4 border border-[#262626]">
              <p className="text-sm font-medium text-white mb-1">¿Hay periodo de prueba?</p>
              <p className="text-xs text-[#A1A1AA]">Sí, ofrecemos 14 días de prueba gratuita en todos los planes pagos.</p>
            </div>
            <div className="bg-[#141414] rounded-xl p-4 border border-[#262626]">
              <p className="text-sm font-medium text-white mb-1">¿Qué métodos de pago aceptan?</p>
              <p className="text-xs text-[#A1A1AA]">Aceptamos tarjetas de crédito/débito (Visa, Mastercard, AMEX) a través de Stripe.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
