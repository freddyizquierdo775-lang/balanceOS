import React, { useState } from 'react';

// ─── Nav items with SVG icons (Heroicons outline style) ───
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'clientes', label: 'Clientes', icon: 'clientes' },
  { id: 'contabilidad', label: 'Contabilidad', icon: 'contabilidad' },
  { id: 'facturacion', label: 'Facturación', icon: 'facturacion' },
  { id: 'nomina', label: 'Nómina', icon: 'nomina' },
  { id: 'tesoreria', label: 'Tesorería', icon: 'tesoreria' },
  { id: 'estados-financieros', label: 'Financieros', icon: 'financieros' },
  { id: 'alertas-efos', label: 'Alertas', icon: 'alertas' },
];

const bottomItems = [
  { id: 'usuarios', label: 'Ajustes', icon: 'settings' },
  { id: 'logout', label: 'Salir', icon: 'logout' },
];

// ─── Inline SVG icons ───
const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  clientes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  contabilidad: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
    </svg>
  ),
  facturacion: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
      <line x1="8" y1="15" x2="12" y2="15"/>
    </svg>
  ),
  nomina: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  ),
  tesoreria: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  financieros: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  alertas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

export default function NavRail({ usuario, page, setPage, cerrarSesion, alertCount = 0 }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const handleClick = (id) => {
    if (id === 'logout') {
      cerrarSesion?.();
      return;
    }
    setPage?.(id);
  };

  const NavButton = ({ item, isBottom = false }) => {
    const isActive = page === item.id;
    const isHovered = hoveredItem === item.id;

    return (
      <div className="relative flex justify-center">
        <button
          onClick={() => handleClick(item.id)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          className={`
            w-[42px] h-[42px] rounded-xl flex flex-col items-center justify-center gap-0.5
            transition-all duration-150 ease-out cursor-pointer border-0 outline-none
            ${isActive
              ? 'bg-white/[0.06] text-white'
              : 'text-white/45 hover:bg-white/[0.06] hover:text-white/75'
            }
          `}
          aria-label={item.label}
        >
          {icons[item.icon]}
          {!isBottom && (
            <span className={`text-[9px] font-medium leading-none ${isActive ? 'opacity-100' : 'opacity-80'}`}>
              {item.label.slice(0, 3)}
            </span>
          )}
        </button>

        {/* Active indicator bar */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-white rounded-r-full" />
        )}

        {/* Badge for alerts */}
        {item.id === 'alertas-efos' && alertCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {alertCount > 9 ? '9+' : alertCount}
          </div>
        )}

        {/* CSS-only tooltip on hover (desktop) */}
        {isHovered && !isActive && (
          <div className="
            absolute left-full ml-3 top-1/2 -translate-y-1/2
            bg-[#1A1A1A] text-white text-[11px] font-medium
            px-2.5 py-1.5 rounded-lg whitespace-nowrap
            shadow-lg z-[200] pointer-events-none
            animate-slideInLeft
          ">
            {item.label}
            {/* Arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-r-[5px] border-r-[#1A1A1A] border-b-[5px] border-b-transparent" />
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="
      w-14 min-w-[56px] h-screen
      flex flex-col items-center justify-between
      py-3
      bg-[#0A0A0A]/90 backdrop-blur-xl
      border-r border-white/[0.06]
      z-[100]
    ">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </div>

      {/* Main nav items */}
      <div className="flex flex-col items-center gap-1 flex-1 pt-1">
        {navItems.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </div>

      {/* Subtle separator */}
      <div className="w-6 h-px bg-white/[0.04] my-2" />

      {/* Bottom items */}
      <div className="flex flex-col items-center gap-1">
        {bottomItems.map((item) => (
          <NavButton key={item.id} item={item} isBottom />
        ))}
      </div>
    </nav>
  );
}
