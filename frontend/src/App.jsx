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
import { setOnUnauthorized } from './api';

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('usuario');
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState('clientes');

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  // Hook de sesión expirada para api.js
  useEffect(() => {
    setOnUnauthorized(cerrarSesion);
  }, []);

  if (!usuario) return <Login onLogin={(u) => { setUsuario(u); setPage('clientes'); }} />;

  // Portal Cliente: vista simplificada para clientes
  if (usuario.rol === 'cliente') {
    return <PortalCliente usuario={usuario} cerrarSesion={cerrarSesion} />;
  }

  const rolLabel = { admin: 'Admin', asesor: 'Asesor', juridico: 'Jurídico' };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-900/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-slate-900">
                <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
                <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
                <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
              </svg>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold tracking-tighter text-slate-900">Balance</span>
                <span className="text-[10px] text-slate-400 tracking-wide -mt-0.5">OS</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage('clientes')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'clientes' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Clientes
              </button>
              <button
                onClick={() => setPage('dashboard')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setPage('imss')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'imss' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                IMSS
              </button>
              <button
                onClick={() => setPage('nomina')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'nomina' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Nómina
              </button>
              <button
                onClick={() => setPage('repse')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'repse' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                REPSE
              </button>
              <button
                onClick={() => setPage('pld')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'pld' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                PLD
              </button>
              <button
                onClick={() => setPage('finiquitos')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'finiquitos' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Finiquitos
              </button>
              <button
                onClick={() => setPage('cfdi')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'cfdi' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                CFDI
              </button>
              <button
                onClick={() => setPage('contabilidad')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'contabilidad' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Contabilidad
              </button>
              <button
                onClick={() => setPage('impuestos')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'impuestos' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Impuestos
              </button>
              <button
                onClick={() => setPage('facturacion')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'facturacion' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Facturación
              </button>
              <button
                onClick={() => setPage('empleados')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'empleados' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Empleados
              </button>
              <button
                onClick={() => setPage('tesoreria')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'tesoreria' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Tesorería
              </button>
              <button
                onClick={() => setPage('estados-financieros')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'estados-financieros' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Estados Fin.
              </button>
              <button
                onClick={() => setPage('alertas-efos')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'alertas-efos' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Alertas EFOS
              </button>
              <button
                onClick={() => setPage('api-publica')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  page === 'api-publica' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                API Pública
              </button>
              {usuario.rol === 'admin' && (
                <button
                  onClick={() => setPage('usuarios')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    page === 'usuarios' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Usuarios
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium text-white bg-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {rolLabel[usuario.rol] || usuario.rol}
            </span>
            <span className="text-xs text-slate-500">{usuario.nombre}</span>
            <button onClick={cerrarSesion} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Salir</button>
          </div>
        </div>
      </nav>

      {/* Main */}
      {page === 'clientes' && <Clientes usuario={usuario} />}
      {page === 'dashboard' && <Dashboard usuario={usuario} />}
      {page === 'usuarios' && <Usuarios usuario={usuario} />}
      {page === 'imss' && <IMSS usuario={usuario} />}
      {page === 'nomina' && <NOMINA usuario={usuario} />}
      {page === 'repse' && <REPSE usuario={usuario} />}
      {page === 'pld' && <PLD usuario={usuario} />}
      {page === 'finiquitos' && <FINIQUITOS usuario={usuario} />}
      {page === 'cfdi' && <CFDI usuario={usuario} />}
      {page === 'empleados' && <Empleados usuario={usuario} />}
      {page === 'tesoreria' && <Tesoreria usuario={usuario} />}
      {page === 'estados-financieros' && <EstadosFinancieros usuario={usuario} />}
      {page === 'alertas-efos' && <AlertasEfos usuario={usuario} />}
      {page === 'api-publica' && <ApiPublica usuario={usuario} />}
      {page === 'contabilidad' && <Contabilidad usuario={usuario} />}
      {page === 'impuestos' && <Impuestos usuario={usuario} />}
      {page === 'facturacion' && <Facturacion usuario={usuario} />}
    </div>
  );
}
