import React, { useState } from 'react';

// ─── Mock data ──────────────────────────────────────────────────────

const recentClients = [
  { id: 1, name: 'Corporativo Sosa S.A.', rfc: 'SOS230501ABC', status: 'activo', type: 'empresa' },
  { id: 2, name: 'Juan Pérez López', rfc: 'PELJ850312XYZ', status: 'pendiente', type: 'persona' },
  { id: 3, name: 'Distribuidora del Norte', rfc: 'DNO120405DEF', status: 'activo', type: 'empresa' },
  { id: 4, name: 'María Hernández Ruiz', rfc: 'HERM780920GHI', status: 'revision', type: 'persona' },
  { id: 5, name: 'TechSolutions México', rfc: 'TSM990101JKL', status: 'activo', type: 'empresa' },
];

const catalogoCuentas = [
  { clave: '1000', nombre: 'Activo', tipo: 'activo' },
  { clave: '2000', nombre: 'Pasivo', tipo: 'pasivo' },
  { clave: '3000', nombre: 'Capital', tipo: 'capital' },
  { clave: '4000', nombre: 'Ingresos', tipo: 'ingresos' },
  { clave: '5000', nombre: 'Gastos', tipo: 'gastos' },
];

const facturasRecientes = [
  { folio: 'F-4582', cliente: 'Corporativo Sosa', monto: '$48,200.00', fecha: '12/06/2026' },
  { folio: 'F-4581', cliente: 'Juan Pérez López', monto: '$3,850.00', fecha: '11/06/2026' },
  { folio: 'F-4580', cliente: 'Distribuidora del Norte', monto: '$127,500.00', fecha: '10/06/2026' },
];

const periodosNomina = [
  { id: 'Q-12', nombre: 'Quincenal 12', estado: 'activo', inicio: '01/06/2026', fin: '15/06/2026' },
  { id: 'S-24', nombre: 'Semanal 24', estado: 'activo', inicio: '08/06/2026', fin: '14/06/2026' },
];

const trabajadoresIMSS = [
  { nombre: 'Carlos Mendoza Ruiz', nss: '1234 85 6789 0', alta: '2023-01-15' },
  { nombre: 'Ana Laura Sánchez', nss: '5678 92 0123 5', alta: '2023-03-01' },
  { nombre: 'Roberto Díaz Gómez', nss: '9012 78 3456 2', alta: '2024-06-10' },
  { nombre: 'Patricia López V.', nss: '3456 01 7890 8', alta: '2025-02-20' },
];

const registrosREPSE = [
  { folio: 'REP-2026-0142', empresa: 'Corporativo Sosa', estatus: 'vigente', vence: '2027-04-15' },
  { folio: 'REP-2026-0089', empresa: 'Distribuidora del Norte', estatus: 'vigente', vence: '2026-08-22' },
  { folio: 'REP-2025-0345', empresa: 'TechSolutions México', estatus: 'por-renovar', vence: '2026-07-30' },
];

const evaluacionesPLD = [
  { cliente: 'Corporativo Sosa', riesgo: 'Medio', score: 62 },
  { cliente: 'Juan Pérez López', riesgo: 'Bajo', score: 28 },
  { cliente: 'Distribuidora del Norte', riesgo: 'Alto', score: 81 },
  { cliente: 'Proveedor Externo XYZ', riesgo: 'Medio', score: 55 },
];

const finiquitosRecientes = [
  { empleado: 'Luis Fernando Torres', fecha: '05/06/2026', monto: '$32,500.00', motivo: 'Renuncia voluntaria' },
  { empleado: 'María José Rivera', fecha: '01/06/2026', monto: '$58,200.00', motivo: 'Despido justificado' },
  { empleado: 'Oscar Daniel Cruz', fecha: '28/05/2026', monto: '$21,800.00', motivo: 'Término de contrato' },
];

const cfdisRecientes = [
  { uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', fecha: '13/06/2026', tipo: 'Ingreso', monto: '$48,200.00' },
  { uuid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', fecha: '12/06/2026', tipo: 'Ingreso', monto: '$127,500.00' },
  { uuid: 'c3d4e5f6-a7b8-9012-cdef-123456789012', fecha: '11/06/2026', tipo: 'Egreso', monto: '$15,300.00' },
];

const vencimientosImpuestos = [
  { declaracion: 'IVA Mensual', periodo: 'Mayo 2026', vence: '17/06/2026', diasRestantes: 3 },
  { declaracion: 'ISR Retenciones', periodo: 'Mayo 2026', vence: '17/06/2026', diasRestantes: 3 },
  { declaracion: 'DIOT', periodo: 'Mayo 2026', vence: '30/06/2026', diasRestantes: 16 },
];

const empleadosActivos = [
  { nombre: 'Carlos Mendoza Ruiz', puesto: 'Contador General', area: 'Contabilidad' },
  { nombre: 'Ana Laura Sánchez', puesto: 'Auxiliar Nómina', area: 'RH' },
  { nombre: 'Roberto Díaz Gómez', puesto: 'Desarrollador Sr.', area: 'TI' },
  { nombre: 'Patricia López V.', puesto: 'Gestor Fiscal', area: 'Impuestos' },
];

const cuentasTesoreria = [
  { banco: 'BBVA', cuenta: '****7823', saldo: '$1,245,600.00', tipo: 'Inversión' },
  { banco: 'Santander', cuenta: '****4512', saldo: '$328,900.00', tipo: 'Corriente' },
  { banco: 'Banorte', cuenta: '****1098', saldo: '$87,300.00', tipo: 'Nómina' },
];

const periodosFinancieros = [
  { tipo: 'Mensual', periodo: 'Junio 2026', estado: 'abierto' },
  { tipo: 'Trimestral', periodo: 'Q2 2026', estado: 'abierto' },
  { tipo: 'Anual', periodo: 'Ejercicio 2026', estado: 'abierto' },
];

const alertasEFOS = [
  { tipo: 'Coincidencia', descripcion: 'EFOS detectado en proveedores', proveedores: 2, severidad: 'alta' },
  { tipo: 'Alerta', descripcion: 'Revisión pendiente Q1 2026', proveedores: 0, severidad: 'media' },
  { tipo: 'Coincidencia', descripcion: 'Socio vinculado a lista negra', proveedores: 1, severidad: 'alta' },
];

const endpointsAPI = [
  { metodo: 'GET', ruta: '/api/v1/clientes', descripcion: 'Listar clientes' },
  { metodo: 'POST', ruta: '/api/v1/facturas', descripcion: 'Crear factura' },
  { metodo: 'GET', ruta: '/api/v1/contabilidad/polizas', descripcion: 'Listar pólizas' },
  { metodo: 'POST', ruta: '/api/v1/nomina/calcular', descripcion: 'Calcular nómina' },
  { metodo: 'GET', ruta: '/api/v1/cfdi/status', descripcion: 'Estado CFDI' },
];

const accesosRapidos = [
  { id: 'clientes', label: 'Clientes', icon: 'users' },
  { id: 'contabilidad', label: 'Contabilidad', icon: 'book' },
  { id: 'facturacion', label: 'Facturación', icon: 'receipt' },
  { id: 'nomina', label: 'Nómina', icon: 'dollar' },
  { id: 'impuestos', label: 'Impuestos', icon: 'calc' },
  { id: 'cfdi', label: 'CFDI', icon: 'file-check' },
];

// ─── Status indicator dot colors ────────────────────────────────────
const statusDot = {
  activo: 'bg-emerald-500',
  pendiente: 'bg-amber-500',
  revision: 'bg-[#52525B]',
};

// ─── Type icons ─────────────────────────────────────────────────────
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

// ─── Section title component ────────────────────────────────────────
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

// ─── Quick action icon component (for dashboard) ───────────────────
function QuickIcon({ icon }) {
  const icons = {
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/></>,
    dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    calc: <><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></>,
    'file-check': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></>,
  };
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[icon] || icons.users}
    </svg>
  );
}

// ─── Risk badge color ───────────────────────────────────────────────
function riskBadge(riesgo) {
  const colors = {
    'Bajo': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'Medio': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'Alto': 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return colors[riesgo] || 'bg-[#52525B] text-[#A1A1AA]';
}

// ─── Severity dot ───────────────────────────────────────────────────
function severityDot(severidad) {
  const colors = {
    alta: 'bg-red-500',
    media: 'bg-amber-500',
    baja: 'bg-emerald-500',
  };
  return colors[severidad] || 'bg-[#71717A]';
}

// ─── Contextual content per module ──────────────────────────────────
function ContextualContent({ page, searchQuery, setPage }) {
  // ── Clientes ──────────────────────────────────────
  if (page === 'clientes') {
    const filtered = recentClients.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.rfc.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <div>
        <SectionTitle title="Clientes recientes" badge={filtered.length} />
        <div className="flex flex-col gap-0.5">
          {filtered.map((client, i) => (
            <button
              key={client.id}
              onClick={() => setPage?.('clientes')}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-all duration-150 cursor-pointer hover:bg-[#1A1A1A] ${page === 'clientes' && i === 0 ? 'bg-[#1A1A1A]' : ''}`}
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
    );
  }

  // ── Contabilidad ──────────────────────────────────
  if (page === 'contabilidad') {
    return (
      <div>
        <SectionTitle title="Catálogo rápido" badge={catalogoCuentas.length} />
        <div className="flex flex-col gap-0.5">
          {catalogoCuentas.map((cuenta) => (
            <div
              key={cuenta.clave}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <span className="text-[10px] font-mono font-semibold text-[#A1A1AA] bg-[#262626] px-1.5 py-0.5 rounded w-12 text-center flex-shrink-0">
                {cuenta.clave}
              </span>
              <span className="text-[12px] font-medium text-white truncate">{cuenta.nombre}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Facturación ───────────────────────────────────
  if (page === 'facturacion') {
    return (
      <div>
        <SectionTitle title="Facturas recientes" badge={facturasRecientes.length} />
        <div className="flex flex-col gap-0.5">
          {facturasRecientes.map((fac) => (
            <div
              key={fac.folio}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{fac.folio}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5 truncate">{fac.cliente}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[12px] font-semibold text-white">{fac.monto}</p>
                <p className="text-[10px] text-[#A1A1AA]">{fac.fecha}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Nómina ────────────────────────────────────────
  if (page === 'nomina') {
    return (
      <div>
        <SectionTitle title="Períodos activos" badge={periodosNomina.length} />
        <div className="flex flex-col gap-0.5">
          {periodosNomina.map((per) => (
            <div
              key={per.id}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${per.estado === 'activo' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{per.nombre}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">{per.inicio} → {per.fin}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── IMSS ──────────────────────────────────────────
  if (page === 'imss') {
    return (
      <div>
        <SectionTitle title="Trabajadores" badge={trabajadoresIMSS.length} />
        <div className="flex flex-col gap-0.5">
          {trabajadoresIMSS.map((t) => (
            <div
              key={t.nss}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className="w-7 h-7 rounded-full bg-[#262626] flex items-center justify-center text-[10px] font-semibold text-[#D4D4D8] flex-shrink-0">
                {t.nombre.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{t.nombre}</p>
                <p className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">NSS {t.nss}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── REPSE ─────────────────────────────────────────
  if (page === 'repse') {
    return (
      <div>
        <SectionTitle title="Registros REPSE" badge={registrosREPSE.length} />
        <div className="flex flex-col gap-0.5">
          {registrosREPSE.map((r) => (
            <div
              key={r.folio}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{r.folio}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5 truncate">{r.empresa}</p>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.estatus === 'vigente' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {r.estatus === 'vigente' ? 'Vigente' : 'Por renovar'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── PLD ───────────────────────────────────────────
  if (page === 'pld') {
    return (
      <div>
        <SectionTitle title="Evaluaciones PLD" badge={evaluacionesPLD.length} />
        <div className="flex flex-col gap-0.5">
          {evaluacionesPLD.map((e) => (
            <div
              key={e.cliente}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <span className="text-[12px] font-medium text-white truncate">{e.cliente}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${riskBadge(e.riesgo)}`}>
                {e.riesgo} • {e.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Finiquitos ────────────────────────────────────
  if (page === 'finiquitos') {
    return (
      <div>
        <SectionTitle title="Recientes" badge={finiquitosRecientes.length} />
        <div className="flex flex-col gap-0.5">
          {finiquitosRecientes.map((f) => (
            <div
              key={f.empleado}
              className="px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-white truncate">{f.empleado}</p>
                <span className="text-[11px] font-semibold text-white flex-shrink-0 ml-2">{f.monto}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-[#A1A1AA] truncate">{f.motivo}</p>
                <span className="text-[10px] text-[#A1A1AA] flex-shrink-0 ml-2">{f.fecha}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── CFDI ──────────────────────────────────────────
  if (page === 'cfdi') {
    return (
      <div>
        <SectionTitle title="CFDI recientes" badge={cfdisRecientes.length} />
        <div className="flex flex-col gap-0.5">
          {cfdisRecientes.map((c) => (
            <div
              key={c.uuid}
              className="px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${c.tipo === 'Ingreso' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {c.tipo}
                </span>
                <span className="text-[11px] font-semibold text-white">{c.monto}</span>
              </div>
              <p className="text-[9px] text-[#A1A1AA] font-mono mt-1 truncate">{c.uuid.substring(0, 20)}...</p>
              <p className="text-[10px] text-[#A1A1AA] mt-0.5">{c.fecha}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Impuestos ─────────────────────────────────────
  if (page === 'impuestos') {
    return (
      <div>
        <SectionTitle title="Próximos vencimientos" badge={vencimientosImpuestos.length} />
        <div className="flex flex-col gap-0.5">
          {vencimientosImpuestos.map((v) => (
            <div
              key={v.declaracion}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{v.declaracion}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">{v.periodo} → {v.vence}</p>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${v.diasRestantes <= 3 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {v.diasRestantes}d
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empleados ─────────────────────────────────────
  if (page === 'empleados') {
    return (
      <div>
        <SectionTitle title="Empleados activos" badge={empleadosActivos.length} />
        <div className="flex flex-col gap-0.5">
          {empleadosActivos.map((e) => (
            <div
              key={e.nombre}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className="w-7 h-7 rounded-full bg-[#262626] flex items-center justify-center text-[10px] font-semibold text-[#D4D4D8] flex-shrink-0">
                {e.nombre.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{e.nombre}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">{e.puesto} · {e.area}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Tesorería ─────────────────────────────────────
  if (page === 'tesoreria') {
    return (
      <div>
        <SectionTitle title="Cuentas bancarias" badge={cuentasTesoreria.length} />
        <div className="flex flex-col gap-0.5">
          {cuentasTesoreria.map((c) => (
            <div
              key={c.cuenta}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{c.banco}</p>
                <p className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">{c.cuenta} · {c.tipo}</p>
              </div>
              <span className="text-[12px] font-semibold text-white flex-shrink-0 ml-2">{c.saldo}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Estados Financieros ───────────────────────────
  if (page === 'estados-financieros') {
    return (
      <div>
        <SectionTitle title="Períodos" badge={periodosFinancieros.length} />
        <div className="flex flex-col gap-0.5">
          {periodosFinancieros.map((p) => (
            <div
              key={p.tipo}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-[12px] font-medium text-white truncate">{p.periodo}</span>
              </div>
              <span className="text-[10px] text-[#A1A1AA] flex-shrink-0 ml-2">{p.tipo}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Alertas EFOS ──────────────────────────────────
  if (page === 'alertas-efos') {
    return (
      <div>
        <SectionTitle title="Alertas activas" badge={alertasEFOS.length} />
        <div className="flex flex-col gap-0.5">
          {alertasEFOS.map((a) => (
            <div
              key={a.descripcion}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${severityDot(a.severidad)}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{a.descripcion}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                  {a.proveedores > 0 ? `${a.proveedores} proveedor(es) afectado(s)` : 'Sin proveedores aún'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── API Pública ───────────────────────────────────
  if (page === 'api-publica') {
    return (
      <div>
        <SectionTitle title="Endpoints" badge={endpointsAPI.length} />
        <div className="flex flex-col gap-0.5">
          {endpointsAPI.map((ep) => (
            <div
              key={ep.ruta}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-all duration-150"
            >
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${ep.metodo === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {ep.metodo}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-mono text-[#D4D4D8] truncate">{ep.ruta}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">{ep.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── CRM ────────────────────────────────────────────
  if (page === 'crm') {
    return (
      <div>
        <SectionTitle title="CRM" />
        <p className="text-[11px] text-[#A1A1AA]">Seguimientos, notas y timeline</p>
        <button onClick={() => setPage?.('crm')} className="mt-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#1A1A1A] text-[11px] text-[#D4D4D8] transition-colors">
          Ver timeline completo →
        </button>
      </div>
    );
  }

  // ── Dashboard (default) ──────────────────────────
  return (
    <div>
      <SectionTitle title="Accesos rápidos" badge={accesosRapidos.length} />
      <div className="flex flex-wrap gap-1.5">
        {accesosRapidos.map((acc) => (
          <button
            key={acc.id}
            onClick={() => setPage?.(acc.id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-[11px] font-medium text-[#D4D4D8] transition-all duration-150 cursor-pointer"
          >
            <span className="text-[#A1A1AA] flex-shrink-0">
              <QuickIcon icon={acc.icon} />
            </span>
            {acc.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-menu navigation maps ───────────────────────────────────────
const subMenuMap = {
  'clientes': ['Todos', 'Activos', 'Prospectos', 'Vencimientos'],
  'contabilidad': ['Catálogo', 'Pólizas', 'Balanza'],
  'facturacion': ['Facturas', 'Complementos', 'Canceladas'],
  'nomina': ['Períodos', 'Recibos', 'Cálculo'],
  'imss': ['Calculadora', 'Altas', 'Bajas', 'Trámites', 'Riesgos', 'Resumen'],
  'repse': ['Registros', 'Personal', 'Avisos'],
  'pld': ['Cuestionarios', 'Documentos', 'Verificaciones'],
  'finiquitos': ['Buscador', 'Cálculo', 'Historial'],
  'cfdi': ['Timbrado', 'Historial', 'CSD'],
  'impuestos': ['Calculadora', 'Declaraciones', 'DIOT', 'Estímulos'],
  'empleados': ['Activos', 'Historial', 'Altas/Bajas'],
  'tesoreria': ['Cuentas', 'Movimientos', 'Conciliación'],
  'estados-financieros': ['Balance', 'Resultados', 'Flujo Efectivo'],
  'alertas-efos': ['Panel', 'Verificar', 'Carga CSV'],
  'api-publica': ['Endpoints', 'Documentación'],
  'crm': ['Timeline', 'Seguimientos', 'Notas'],
  'dashboard': ['Resumen', 'KPIs', 'Actividad'],
};

// ─── Badges for sub-menu items (pending counts, etc.) ─────────────
const subMenuBadges = {
  'imss': { 'Altas': 3, 'Bajas': 1 },
};

// ─── Page display labels for sub-menu header ─────────────────────
const pageLabels = {
  'clientes': 'Clientes',
  'contabilidad': 'Contabilidad',
  'facturacion': 'Facturación',
  'nomina': 'Nómina',
  'imss': 'IMSS',
  'repse': 'REPSE',
  'pld': 'PLD',
  'finiquitos': 'Finiquitos',
  'cfdi': 'CFDI',
  'impuestos': 'Impuestos',
  'empleados': 'Empleados',
  'tesoreria': 'Tesorería',
  'estados-financieros': 'Estados Fin.',
  'alertas-efos': 'Alertas EFOS',
  'api-publica': 'API Pública',
  'crm': 'CRM',
  'dashboard': 'Dashboard',
};

// ─── Module chips (shared across all pages) ─────────────────────────
const allModules = [
  { id: 'clientes', label: 'Clientes', active: true },
  { id: 'contabilidad', label: 'Contabilidad', active: true },
  { id: 'facturacion', label: 'Facturación', active: true },
  { id: 'nomina', label: 'Nómina', active: true },
  { id: 'imss', label: 'IMSS', active: true },
  { id: 'impuestos', label: 'Impuestos', active: true },
  { id: 'repse', label: 'REPSE', active: false },
  { id: 'pld', label: 'PLD', active: false },
  { id: 'cfdi', label: 'CFDI', active: true },
  { id: 'tesoreria', label: 'Tesorería', active: true },
  { id: 'empleados', label: 'Empleados', active: false },
  { id: 'finiquitos', label: 'Finiquitos', active: false },
  { id: 'api-publica', label: 'API', active: false },
  { id: 'crm', label: 'CRM', active: true },
];

// ─── Sub-menu navigation component ──────────────────────────────────
function SubMenu({ page, subPage, setSubPage, collapsed }) {
  const items = subMenuMap[page];
  if (!items || items.length <= 1) return null;

  const badges = subMenuBadges[page] || {};

  // ── Collapsed: icon-only mode ──────────────────
  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 items-center w-full">
        {items.map((item) => {
          const isActive = subPage === item;
          return (
            <button
              key={item}
              onClick={() => setSubPage?.(item)}
              className={`
                w-7 h-7 rounded-md flex items-center justify-center
                transition-all duration-150
                ${isActive
                  ? 'bg-[#1A1A1A] text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'text-[#71717A] hover:text-[#D4D4D8] hover:bg-[#1A1A1A]'
                }
              `}
              title={item}
            >
              <span className="text-[9px] font-bold leading-none">{item.charAt(0)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Expanded: full text with green left bar ───
  return (
    <div>
      <h3 className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-[0.08em] mb-2 px-1">
        {pageLabels[page] || page}
      </h3>
      <div className="flex flex-col">
        {items.map((item) => {
          const isActive = subPage === item;
          const badge = badges[item];
          return (
            <button
              key={item}
              onClick={() => setSubPage?.(item)}
              className={`
                flex items-center gap-2 px-3 py-1.5
                text-left transition-all duration-150 cursor-pointer
                border-l-2
                ${isActive
                  ? 'border-emerald-400 bg-[#1A1A1A] text-white'
                  : 'border-transparent text-[#A1A1AA] hover:bg-[#1A1A1A] hover:text-[#D4D4D8]'
                }
              `}
            >
              <span className="text-[12px] font-medium flex-1">{item}</span>
              {badge != null && (
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {badge} pendiente{badge !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main SidePanel component ───────────────────────────────────────
export default function SidePanel({ usuario, page, setPage, subPage, setSubPage, sidebarCollapsed, onToggleSidebar }) {
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

  // Effective subPage: defaults to first item in the current module's sub-menu
  const defaultSubPage = subMenuMap[page]?.[0] || null;
  const effectiveSubPage = subPage || defaultSubPage;

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

        {/* ─── Global search — always visible ──── */}
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
              placeholder="Buscar..."
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

        {/* ─── Sub-menu navigation (always visible) ── */}
        <SubMenu
          page={page}
          subPage={effectiveSubPage}
          setSubPage={setSubPage}
          collapsed={collapsed}
        />

        {/* ─── Contextual content per module ───── */}
        {!collapsed && (
          <ContextualContent page={page} searchQuery={searchQuery} setPage={setPage} />
        )}

        {/* ─── All modules (shared, bottom) ────── */}
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
              {allModules
                .filter((m) => m.active)
                .map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => setPage?.(mod.id)}
                    className={`
                      inline-flex items-center gap-1
                      px-2.5 py-1 rounded-full text-[11px] font-medium
                      transition-all duration-150 cursor-pointer
                      ${page === mod.id
                        ? 'bg-[#0A0A0A] text-white ring-1 ring-[#404040]'
                        : 'bg-[#1A1A1A] text-[#D4D4D8] hover:bg-[#262626]'
                      }
                    `}
                  >
                    {mod.label}
                  </button>
                ))}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
