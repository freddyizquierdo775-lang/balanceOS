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
  'usuarios': 'Usuarios',
  'module-settings': 'Módulos',
};

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('usuario');
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState('clientes');

  // ─── Responsive state ─────────────────────────
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      case 'clientes': return wrap(<Clientes usuario={usuario} />);
      case 'dashboard': return wrap(<Dashboard usuario={usuario} />);
      case 'usuarios': return wrap(<Usuarios usuario={usuario} />);
      case 'imss': return wrap(<IMSS usuario={usuario} />);
      case 'nomina': return wrap(<NOMINA usuario={usuario} />);
      case 'repse': return wrap(<REPSE usuario={usuario} />);
      case 'pld': return wrap(<PLD usuario={usuario} />);
      case 'finiquitos': return wrap(<FINIQUITOS usuario={usuario} />);
      case 'cfdi': return wrap(<CFDI usuario={usuario} />);
      case 'empleados': return wrap(<Empleados usuario={usuario} />);
      case 'tesoreria': return wrap(<Tesoreria usuario={usuario} />);
      case 'estados-financieros': return wrap(<EstadosFinancieros usuario={usuario} />);
      case 'alertas-efos': return wrap(<AlertasEfos usuario={usuario} />);
      case 'api-publica': return wrap(<ApiPublica usuario={usuario} />);
      case 'contabilidad': return wrap(<Contabilidad usuario={usuario} />);
      case 'impuestos': return wrap(<Impuestos usuario={usuario} />);
      case 'facturacion': return wrap(<Facturacion usuario={usuario} />);
      default: return wrap(<Clientes usuario={usuario} />);
    }
  };

  // ─── Logo SVG ──────────────────────────────────
  const LogoIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-slate-900">
      <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
      <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
      <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
    </svg>
  );

  // ─── MOBILE LAYOUT ─────────────────────────────
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-900/5 safe-top">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-all duration-200 touch-manipulation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2.5">
              <LogoIcon />
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold tracking-tighter text-slate-900">Balance</span>
                <span className="text-[10px] text-slate-400 tracking-wide -mt-0.5">OS</span>
              </div>
            </div>
            <span className="text-[10px] font-medium text-white bg-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {rolLabel[usuario.rol] || usuario.rol}
            </span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">
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
          onNavigate={navigate}
          onLogout={cerrarSesion}
        />
      </div>
    );
  }

  // ─── DESKTOP LAYOUT (>=768px) ────────────────────
  // Glassmorphism 3-column premium layout
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f5]">
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
      />

      {/* Columna 3: Contenido principal — flex-1 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header superior glass */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-900/5 px-6 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <LogoIcon />
              <span className="text-[13px] font-semibold text-slate-400 tracking-wide hidden lg:inline">Balance OS</span>
            </div>
            <div className="w-px h-5 bg-slate-200 hidden lg:block" />
            <h1 className="text-sm font-semibold text-slate-900">
              {PAGE_TITLES[page] || 'Clientes'}
            </h1>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {rolLabel[usuario.rol] || usuario.rol}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Module settings button */}
            <button
              onClick={() => navigate('module-settings')}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              title="Configurar módulos"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>
            {/* Notifications */}
            <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            {/* User pill */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                {usuario.nombre?.charAt(0) || 'U'}
              </div>
              <span className="text-xs text-slate-500 hidden lg:inline">{usuario.nombre}</span>
            </div>
            {/* Logout */}
            <button onClick={cerrarSesion} className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-1">
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
