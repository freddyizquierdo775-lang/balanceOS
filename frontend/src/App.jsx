import { useState, useEffect } from 'react';
import Login from './Login';
import Clientes from './Clientes';
import Dashboard from './Dashboard';
import Usuarios from './Usuarios';
import IMSS from './IMSS';
import NOMINA from './NOMINA';
import REPSE from './REPSE';
import PLD from './PLD';
import FINIQUITOS from './FINIQUITOS';
import CFDI from './CFDI';
import Empleados from './Empleados';
import Tesoreria from './Tesoreria';
import EstadosFinancieros from './EstadosFinancieros';
import AlertasEfos from './AlertasEfos';
import ApiPublica from './ApiPublica';
import PortalCliente from './PortalCliente';
import Contabilidad from './Contabilidad';
import Impuestos from './Impuestos';
import Facturacion from './Facturacion';
import CRM from './CRM';
import Pricing from './Pricing';
import MobileBottomNav from './components/MobileBottomNav';
import MobileDrawer from './components/MobileDrawer';
import NavRail from './components/NavRail';
import SidePanel from './components/SidePanel';
import { setOnUnauthorized } from './api';

// ─── Responsive hook ──────────────────────────────
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = e => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// ─── Desktop nav button config ────────────────────
const DESKTOP_NAV = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'imss', label: 'IMSS' },
  { key: 'nomina', label: 'Nómina' },
  { key: 'repse', label: 'REPSE' },
  { key: 'pld', label: 'PLD' },
  { key: 'finiquitos', label: 'Finiquitos' },
  { key: 'cfdi', label: 'CFDI' },
  { key: 'contabilidad', label: 'Contabilidad' },
  { key: 'impuestos', label: 'Impuestos' },
  { key: 'facturacion', label: 'Facturación' },
  { key: 'empleados', label: 'Empleados' },
  { key: 'tesoreria', label: 'Tesorería' },
  { key: 'estados-financieros', label: 'Estados Fin.' },
  { key: 'alertas-efos', label: 'Alertas EFOS' },
  { key: 'api-publica', label: 'API Pública' },
];

// ─── Page titles for desktop header ────────────────
const PAGE_TITLES = {
  'dashboard': 'Dashboard',
  'clientes': 'Clientes',
  'contabilidad': 'Contabilidad',
  'facturacion': 'Facturación',
  'nomina': 'Nómina',
  'imss': 'Motor IMSS',
  'repse': 'REPSE',
  'pld': 'PLD',
  'finiquitos': 'Finiquitos',
  'cfdi': 'CFDI',
  'impuestos': 'Impuestos',
  'empleados': 'Empleados',
  'tesoreria': 'Tesorería',
  'estados-financieros': 'Estados Financieros',
  'alertas-efos': 'Alertas EFOS',
  'api-publica': 'API Pública',
  'crm': 'CRM',
  'usuarios': 'Usuarios',
  'module-settings': 'Módulos',
  'pricing': 'Planes',
};

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('usuario');
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState('clientes');
  const [subPage, setSubPage] = useState(null);

  // Reset subPage when module changes
  useEffect(() => {
    setSubPage(null);
  }, [page]);

  // ─── Responsive state ─────────────────────────
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // ─── Apply theme class to <html> ──────────────
  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  useEffect(() => {
    setOnUnauthorized(cerrarSesion);
  }, []);

  const navigate = (p) => {
    setPage(p);
    setDrawerOpen(false);
  };

  if (!usuario) return <Login onLogin={(u) => { setUsuario(u); setPage('clientes'); }} />;

  if (usuario.rol === 'cliente') {
    return <PortalCliente usuario={usuario} cerrarSesion={cerrarSesion} />;
  }

  const rolLabel = { admin: 'Admin', asesor: 'Asesor', juridico: 'Jurídico' };

  // ─── Page renderer ────────────────────────────
  const renderPage = () => {
    const contentClass = isMobile
      ? 'px-0 mobile-pb'   // padding bottom for bottom nav
      : 'px-0';

    const wrap = (el) => <div className={contentClass}>{el}</div>;

    switch (page) {
      case 'clientes': return wrap(<Clientes usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'dashboard': return wrap(<Dashboard usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'usuarios': return wrap(<Usuarios usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'imss': return wrap(<IMSS usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'nomina': return wrap(<NOMINA usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'repse': return wrap(<REPSE usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'pld': return wrap(<PLD usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'finiquitos': return wrap(<FINIQUITOS usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'cfdi': return wrap(<CFDI usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'empleados': return wrap(<Empleados usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'tesoreria': return wrap(<Tesoreria usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'estados-financieros': return wrap(<EstadosFinancieros usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'alertas-efos': return wrap(<AlertasEfos usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'api-publica': return wrap(<ApiPublica usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'contabilidad': return wrap(<Contabilidad usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'impuestos': return wrap(<Impuestos usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'facturacion': return wrap(<Facturacion usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'crm': return wrap(<CRM usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
      case 'pricing': return wrap(<Pricing usuario={usuario} />);
      default: return wrap(<Clientes usuario={usuario} subPage={subPage} setSubPage={setSubPage} />);
    }
  };

  // ─── Logo SVG ──────────────────────────────────
  const LogoIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
      <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
      <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
      <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
    </svg>
  );

  // ─── MOBILE LAYOUT ─────────────────────────────
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
        {/* Mobile header — clean, compact */}
        <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-xl border-b border-[#262626] safe-top">
          <div className="flex items-center justify-between h-12 px-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-[#A1A1AA] hover:bg-[#262626] hover:text-[#D4D4D8] transition-all touch-manipulation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-white tracking-tight">
                {PAGE_TITLES[page] || 'Balance OS'}
              </span>
            </div>
            <span className="text-[9px] font-medium text-[#A1A1AA] bg-[#262626] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {rolLabel[usuario.rol] || usuario.rol}
            </span>
          </div>
        </header>

        {/* Main content — with bottom padding for nav */}
        <main className="flex-1 overflow-y-auto pb-20">
          {renderPage()}
        </main>

        {/* Bottom nav */}
        <MobileBottomNav
          currentPage={page}
          onNavigate={navigate}
          onMore={() => setDrawerOpen(true)}
        />

        {/* Drawer */}
        <MobileDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          currentPage={page}
          usuario={usuario}
          theme={theme}
          onToggleTheme={toggleTheme}
          onNavigate={navigate}
          onLogout={cerrarSesion}
        />
      </div>
    );
  }

  // ─── DESKTOP LAYOUT (>=768px) ────────────────────
  // Glassmorphism 3-column premium layout
  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A]">
      {/* Columna 1: Rail izquierdo — 56px */}
      <NavRail
        usuario={usuario}
        page={page}
        setPage={navigate}
        cerrarSesion={cerrarSesion}
      />

      {/* Columna 2: Panel medio glass — 260px */}
      <SidePanel
        usuario={usuario}
        page={page}
        setPage={navigate}
        subPage={subPage}
        setSubPage={setSubPage}
      />

      {/* Columna 3: Contenido principal — flex-1 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header superior glass */}
        <header className="sticky top-0 z-20 bg-[#141414]/90 backdrop-blur-md border-b border-[#262626] px-6 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <LogoIcon />
              <span className="text-[13px] font-semibold text-[#A1A1AA] tracking-wide hidden lg:inline">Balance OS</span>
            </div>
            <div className="w-px h-5 bg-[#333333] hidden lg:block" />
            <h1 className="text-sm font-semibold text-white">
              {PAGE_TITLES[page] || 'Clientes'}
            </h1>
            <span className="text-[10px] text-[#A1A1AA] bg-[#262626] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {rolLabel[usuario.rol] || usuario.rol}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Module settings button */}
            <button
              onClick={() => navigate('module-settings')}
              className="w-8 h-8 rounded-lg hover:bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors"
              title="Configurar módulos"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg hover:bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-[#F59E0B] transition-colors"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span className="text-base leading-none">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
            {/* Notifications */}
            <button className="w-8 h-8 rounded-lg hover:bg-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            {/* User pill */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#333333] flex items-center justify-center text-[10px] font-semibold text-[#D4D4D8]">
                {usuario.nombre?.charAt(0) || 'U'}
              </div>
              <span className="text-xs text-[#A1A1AA] hidden lg:inline">{usuario.nombre}</span>
            </div>
            {/* Logout */}
            <button onClick={cerrarSesion} className="text-xs text-[#A1A1AA] hover:text-red-400 transition-colors ml-1">
              Salir
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
