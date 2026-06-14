import { useState } from 'react';

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'Inicio',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'clientes',    label: 'Clientes',     icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { key: 'contabilidad',label: 'Contab.',      icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { key: 'facturacion', label: 'Factur.',      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

export default function MobileBottomNav({ currentPage, onNavigate, onMore }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#141414]/95 backdrop-blur-2xl border-t border-[#1F1F1F] safe-bottom">
      <div className="flex items-center justify-around h-[3.75rem] max-w-lg mx-auto px-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[3.25rem] min-w-[3.25rem] px-1 py-0.5 rounded-xl transition-all duration-200 touch-manipulation ${
              currentPage === item.key
                ? 'text-white'
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            <span className="text-[10px] font-medium leading-none">
              {item.label}
            </span>
            {currentPage === item.key && (
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#10B981] rounded-full" />
            )}
          </button>
        ))}
        <button
          onClick={onMore}
          className="relative flex flex-col items-center justify-center gap-0.5 min-h-[3.25rem] min-w-[3.25rem] px-1 py-0.5 rounded-xl text-[#71717A] hover:text-[#A1A1AA] transition-all duration-200 touch-manipulation"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span className="text-[10px] font-medium leading-none">Más</span>
        </button>
      </div>
    </nav>
  );
}
