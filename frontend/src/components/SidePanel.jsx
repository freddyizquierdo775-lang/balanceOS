import React, { useState } from 'react';

// ─── Mock data ──────────────────────────────────────
const recentClients = [
  { id: 1, name: 'Corporativo Sosa S.A.', rfc: 'SOS230501ABC', status: 'activo', type: 'empresa' },
  { id: 2, name: 'Juan Pérez López', rfc: 'PELJ850312XYZ', status: 'pendiente', type: 'persona' },
  { id: 3, name: 'Distribuidora del Norte', rfc: 'DNO120405DEF', status: 'activo', type: 'empresa' },
  { id: 4, name: 'María Hernández Ruiz', rfc: 'HERM780920GHI', status: 'revision', type: 'persona' },
  { id: 5, name: 'TechSolutions México', rfc: 'TSM990101JKL', status: 'activo', type: 'empresa' },
];

const recentDocs = [
  { id: 1, name: 'Declaración Mensual Mayo', type: 'declaracion', date: 'Hace 2h' },
  { id: 2, name: 'Nómina Quincenal 12', type: 'nomina', date: 'Hace 5h' },
  { id: 3, name: 'Factura CFDI A-4582', type: 'factura', date: 'Ayer' },
  { id: 4, name: 'Póliza Contable #89', type: 'poliza', date: 'Ayer' },
];

const modulos = [
  { id: 'contabilidad', label: 'Contabilidad', active: true },
  { id: 'nomina', label: 'Nómina', active: true },
  { id: 'facturacion', label: 'Facturación', active: true },
  { id: 'impuestos', label: 'Impuestos', active: true },
  { id: 'repse', label: 'REPSE', active: false },
  { id: 'pld', label: 'PLD', active: false },
];

// ─── Status indicator dot colors ───────────────────
const statusDot = {
  activo: 'bg-emerald-500',
  pendiente: 'bg-amber-500',
  revision: 'bg-[#52525B]',
};

// ─── Type icons ─────────────────────────────────────
const typeIcons = {
  empresa: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
      <line x1="9" y1="6" x2="15" y2="6"/>
      <line x1="9" y1="10" x2="15" y2="10"/>
      <line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  ),
  persona: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

// ─── Document icons ─────────────────────────────────
const docIcons = {
  declaracion: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  nomina: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  ),
  factura: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
    </svg>
  ),
  poliza: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  ),
};

// ─── Section title component ───────────────────────
function SectionTitle({ title, badge }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-[0.08em]">{title}</h3>
      {badge != null && (
        <span className="text-[10px] font-semibold text-[#A1A1AA] bg-[#262626] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

export default function SidePanel({ usuario, page, setPage, sidebarCollapsed, onToggleSidebar }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localCollapsed, setLocalCollapsed] = useState(sidebarCollapsed ?? false);

  // Controlled prop takes precedence over local state
  const collapsed = sidebarCollapsed !== undefined ? sidebarCollapsed : localCollapsed;
  const handleToggle = () => {
    if (onToggleSidebar) {
      onToggleSidebar(!collapsed);
    } else {
      setLocalCollapsed(!collapsed);
    }
  };

  const filteredClients = recentClients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.rfc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={`
      h-screen
      flex flex-col
      bg-[#141414]/80 backdrop-blur-xl
      border-r border-[#262626]
      overflow-hidden
      z-[50]
      transition-all duration-300 ease-in-out
      ${collapsed ? 'w-[40px] min-w-[40px]' : 'w-[260px] min-w-[260px]'}
    `}>
      {/* ─── Toggle button ─────────────────────── */}
      <div className="flex justify-end px-1.5 pt-3 pb-1">
        <button
          onClick={handleToggle}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[#71717A] hover:text-[#D4D4D8] hover:bg-[#262626] transition-all duration-150 flex-shrink-0"
          title={collapsed ? 'Expandir panel' : 'Colapsar panel'}
        >
          {collapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>

      {/* ─── Scrollable content ─────────────────── */}
      <div className={`flex-1 overflow-y-auto flex flex-col gap-5 transition-all duration-300 ${collapsed ? 'px-1 py-2 items-center' : 'px-3 py-4'}`}>

        {/* ─── Profile compact ─────────────────── */}
        {collapsed ? (
          <button
            onClick={handleToggle}
            className="flex justify-center w-full"
            title="Expandir panel"
          >
            <div className="w-8 h-8 rounded-full bg-[#333333] flex items-center justify-center text-xs font-semibold text-[#D4D4D8] flex-shrink-0">
              {usuario?.nombre?.charAt(0) || 'U'}
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-[#333333] flex items-center justify-center text-xs font-semibold text-[#D4D4D8] flex-shrink-0">
              {usuario?.nombre?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{usuario?.nombre || 'Usuario'}</p>
              <p className="text-[10px] text-[#A1A1AA] truncate">{usuario?.email || usuario?.rol || ''}</p>
            </div>
          </div>
        )}

        {/* ─── Global search ────────────────────── */}
        {collapsed ? (
          <button
            onClick={handleToggle}
            className="flex justify-center w-full text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors"
            title="Buscar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        ) : (
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA] pointer-events-none"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar cliente, factura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full bg-[#1A1A1A] border border-[#262626]
                rounded-lg py-1.5 pl-8 pr-3
                text-xs text-white placeholder:text-[#71717A]
                outline-none focus:border-[#404040] focus:bg-[#1A1A1A]
                transition-colors duration-150
              "
            />
          </div>
        )}

        {/* ─── Recent clients ───────────────────── */}
        {collapsed ? (
          <button
            onClick={handleToggle}
            className="flex justify-center w-full text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors"
            title="Clientes"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
              <line x1="9" y1="6" x2="15" y2="6"/>
              <line x1="9" y1="10" x2="15" y2="10"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
        ) : (
          <div>
            <SectionTitle title="Clientes" badge={recentClients.length} />
            <div className="flex flex-col gap-0.5">
              {filteredClients.map((client, i) => (
                <button
                  key={client.id}
                  onClick={() => setPage?.('clientes')}
                  className={`
                    flex items-center gap-2.5 px-2 py-1.5 rounded-lg
                    text-left transition-all duration-150 cursor-pointer
                    hover:bg-[#1A1A1A]
                    ${page === 'clientes' && i === 0 ? 'bg-[#1A1A1A]' : ''}
                  `}
                >
                  <div className="text-[#A1A1AA] flex-shrink-0">
                    {typeIcons[client.type] || typeIcons.empresa}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-white truncate">{client.name}</p>
                    <p className="text-[10px] text-[#A1A1AA] mt-0.5">{client.rfc}</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[client.status] || 'bg-[#71717A]'}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Recent documents ─────────────────── */}
        {collapsed ? (
          <button
            onClick={handleToggle}
            className="flex justify-center w-full text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors"
            title="Documentos recientes"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </button>
        ) : (
          <div>
            <SectionTitle title="Recientes" />
            <div className="flex flex-col gap-0.5">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
                >
                  <div className="text-[#A1A1AA] flex-shrink-0">
                    {docIcons[doc.type] || docIcons.declaracion}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-white truncate">{doc.name}</p>
                  </div>
                  <span className="text-[10px] text-[#A1A1AA] flex-shrink-0">{doc.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Active modules ───────────────────── */}
        {collapsed ? (
          <button
            onClick={handleToggle}
            className="flex justify-center w-full text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors"
            title="Módulos"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-[0.08em]">Módulos</h3>
              <button
                onClick={() => setPage?.('module-settings')}
                className="w-5 h-5 rounded-md flex items-center justify-center text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#262626] transition-all duration-150"
                title="Configurar módulos"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {modulos.map((mod) => (
                <span
                  key={mod.id}
                  className={`
                    inline-flex items-center gap-1
                    px-2.5 py-1 rounded-full text-[11px] font-medium
                    transition-all duration-150 cursor-pointer
                    ${mod.active
                      ? 'bg-[#0A0A0A] text-white'
                      : 'bg-[#262626] text-[#A1A1AA]'
                    }
                  `}
                >
                  {mod.active ? mod.label : (
                    <>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                      {mod.label}
                    </>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
