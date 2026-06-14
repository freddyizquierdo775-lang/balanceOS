import { useEffect, useRef } from 'react';

const ALL_SECTIONS = [
  { key: 'clientes',            label: 'Clientes',            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { key: 'dashboard',           label: 'Dashboard',           icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'imss',                label: 'IMSS',                icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { key: 'nomina',              label: 'Nomina',              icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { key: 'empleados',           label: 'Empleados',           icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { key: 'contabilidad',        label: 'Contabilidad',        icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { key: 'facturacion',         label: 'Facturacion',         icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'impuestos',           label: 'Impuestos',           icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'tesoreria',           label: 'Tesorería',           icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { key: 'repse',               label: 'REPSE',               icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'pld',                 label: 'PLD',                 icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { key: 'finiquitos',          label: 'Finiquitos',          icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { key: 'cfdi',                label: 'CFDI',                icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'estados-financieros', label: 'Estados Fin.',        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'alertas-efos',        label: 'Alertas EFOS',        icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z' },
  { key: 'api-publica',         label: 'API Publica',         icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
];

export default function MobileDrawer({ isOpen, onClose, currentPage, usuario, theme, onToggleTheme, onNavigate, onLogout }) {
  const startX = useRef(0);
  const dragging = useRef(false);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Swipe to close
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!dragging.current) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff < -60) {
      onClose();
      dragging.current = false;
    }
  };

  const handleTouchEnd = () => {
    dragging.current = false;
  };

  const rolLabel = { admin: 'Admin', asesor: 'Asesor', juridico: 'Juridico' };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-[#141414] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
              <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
              <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tighter text-white">Balance</span>
              <span className="text-[10px] text-[#A1A1AA] tracking-wide -mt-0.5">OS</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[#A1A1AA] hover:text-[#F59E0B] hover:bg-[#262626] transition-all duration-200"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span className="text-lg leading-none">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[#A1A1AA] hover:text-[#D4D4D8] hover:bg-[#262626] transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-[#1F1F1F] bg-[#1A1A1A]/50">
          <p className="text-sm font-medium text-white">{usuario?.nombre}</p>
          <span className="text-[10px] font-medium text-white bg-[#52525B] px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mt-1">
            {rolLabel[usuario?.rol] || usuario?.rol}
          </span>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto mobile-scroll py-2">
          {ALL_SECTIONS.filter(s => s.key !== 'usuarios' || usuario?.rol === 'admin').map(section => (
            <button
              key={section.key}
              onClick={() => { onNavigate(section.key); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 touch-manipulation min-h-[44px] ${
                currentPage === section.key
                  ? 'bg-[#262626] text-white'
                  : 'text-[#D4D4D8] hover:bg-[#1A1A1A] hover:text-white'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d={section.icon} />
              </svg>
              <span>{section.label}</span>
              {currentPage === section.key && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" />
              )}
            </button>
          ))}
        </div>

        {/* Footer: Logout */}
        <div className="p-3 border-t border-[#262626]">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 touch-manipulation min-h-[44px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesion
          </button>
        </div>
      </div>
    </>
  );
}
