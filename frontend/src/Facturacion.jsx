import { useState, useEffect } from 'react';
import { facturacion, clientes } from './api';

const USOS_CFDI = [
  { value: 'G01', label: 'Adquisición de mercancías' },
  { value: 'G02', label: 'Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'Gastos en general' },
  { value: 'I01', label: 'Construcciones' },
  { value: 'I02', label: 'Mobiliario y equipo' },
  { value: 'I03', label: 'Equipo de transporte' },
  { value: 'I04', label: 'Equipo de cómputo' },
  { value: 'I05', label: 'Dados, troqueles, moldes, matrices' },
  { value: 'I06', label: 'Comunicaciones telefónicas' },
  { value: 'I07', label: 'Comunicaciones satelitales' },
  { value: 'I08', label: 'Otra maquinaria' },
  { value: 'D01', label: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { value: 'D02', label: 'Gastos médicos por incapacidad o discapacidad' },
  { value: 'D03', label: 'Gastos funerales' },
  { value: 'D04', label: 'Donativos' },
  { value: 'D05', label: 'Intereses reales' },
  { value: 'D06', label: 'Aportaciones voluntarias al SAR' },
  { value: 'D07', label: 'Primas por seguros de gastos médicos' },
  { value: 'D08', label: 'Gastos de transportación escolar' },
  { value: 'D09', label: 'Depósitos en cuentas para el ahorro' },
  { value: 'D10', label: 'Pagos por servicios educativos' },
  { value: 'P01', label: 'Por definir' },
];

const FORMAS_PAGO = [
  { value: '01', label: 'Efectivo' },
  { value: '02', label: 'Cheque nominativo' },
  { value: '03', label: 'Transferencia electrónica' },
  { value: '04', label: 'Tarjeta de crédito' },
  { value: '05', label: 'Monedero electrónico' },
  { value: '06', label: 'Dinero electrónico' },
  { value: '08', label: 'Vales de despensa' },
  { value: '12', label: 'Dación en pago' },
  { value: '15', label: 'Condiciones de pago (PPD)' },
  { value: '17', label: 'Compensación' },
  { value: '23', label: 'Novación' },
  { value: '24', label: 'Consignación' },
  { value: '25', label: 'Cancelación' },
  { value: '26', label: 'Subrogación' },
  { value: '27', label: 'Condiciones de pago (PPD)' },
  { value: '28', label: 'Tarjeta de débito' },
  { value: '29', label: 'Tarjeta de servicios' },
  { value: '31', label: 'Intermediación de pagos' },
  { value: '99', label: 'Otros' },
];

const METODOS_PAGO = [
  { value: 'PUE', label: 'Pago en una sola exhibición' },
  { value: 'PPD', label: 'Pago en parcialidades o diferido' },
];

const ESTATUS_FACTURA = {
  activa: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
  pendiente: 'bg-amber-100 text-amber-700',
};

const ESTATUS_LABEL = {
  activa: 'Activa', cancelada: 'Cancelada', pendiente: 'Pendiente',
};

export default function Facturacion({ usuario }) {
  const [tab, setTab] = useState('facturas');
  const tabs = [
    { key: 'facturas', label: 'Facturas' },
    { key: 'complementos', label: 'Complementos de Pago' },
  ];

  // ─── Facturas ─────────────────────────────────
  const [clienteList, setClienteList] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [facturas, setFacturas] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(true);
  const [showFacturaForm, setShowFacturaForm] = useState(false);
  const [facturaSaving, setFacturaSaving] = useState(false);
  const [facturaErrors, setFacturaErrors] = useState({});
  const [facturaForm, setFacturaForm] = useState({
    cliente_id: '', receptor_rfc: '', receptor_nombre: '', uso_cfdi: 'G03',
    forma_pago: '03', metodo_pago: 'PUE', serie: '', conceptos: [],
  });
  const [facturaConcInput, setFacturaConcInput] = useState({
    clave_prod_serv: '84111506', descripcion: '', cantidad: 1, unidad: 'Actividad',
    clave_unidad: 'ACT', valor_unitario: '', iva: 0.16,
  });
  const [cancelingId, setCancelingId] = useState(null);

  const now = new Date();

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await clientes.listar();
        setClienteList(data);
      } catch (_) {}
    };
    loadClientes();
  }, []);

  const loadFacturas = async () => {
    setLoadingFacturas(true);
    try {
      const params = new URLSearchParams();
      if (filtroCliente) params.set('cliente_id', filtroCliente);
      if (filtroEstatus) params.set('estatus', filtroEstatus);
      const qs = params.toString();
      const data = await facturacion.listarFacturas(qs ? `?${qs}` : '');
      setFacturas(data);
    } catch (err) {
      console.error('Error al cargar facturas:', err);
    } finally {
      setLoadingFacturas(false);
    }
  };

  useEffect(() => { loadFacturas(); }, [filtroCliente, filtroEstatus]);

  const addFacturaConcepto = () => {
    const c = facturaConcInput;
    if (!c.clave_prod_serv || !c.descripcion || !c.valor_unitario) return;
    const importe = parseFloat(c.cantidad) * parseFloat(c.valor_unitario);
    const ivaCalc = importe * parseFloat(c.iva || 0.16);
    setFacturaForm(prev => ({
      ...prev,
      conceptos: [...prev.conceptos, {
        ...c,
        cantidad: parseFloat(c.cantidad),
        valor_unitario: parseFloat(c.valor_unitario),
        importe: importe,
        iva: ivaCalc,
        objeto_imp: (parseFloat(c.iva || 0.16) > 0) ? '02' : '01',
      }],
    }));
    setFacturaConcInput({
      clave_prod_serv: '84111506', descripcion: '', cantidad: 1, unidad: 'Actividad',
      clave_unidad: 'ACT', valor_unitario: '', iva: 0.16,
    });
  };

  const removeFacturaConcepto = (idx) => {
    setFacturaForm(prev => ({
      ...prev,
      conceptos: prev.conceptos.filter((_, i) => i !== idx),
    }));
  };

  const subtotal = facturaForm.conceptos.reduce((s, c) => s + c.importe, 0);
  const ivaTotal = facturaForm.conceptos.reduce((s, c) => s + c.iva, 0);
  const total = subtotal + ivaTotal;

  const fmt = (n) => {
    if (n === null || n === undefined) return '$0.00';
    return '$' + parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const validateFactura = () => {
    const errs = {};
    if (!facturaForm.receptor_rfc || !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(facturaForm.receptor_rfc.trim())) {
      errs.receptor_rfc = 'RFC inválido';
    }
    if (!facturaForm.receptor_nombre || facturaForm.receptor_nombre.trim().length < 2) {
      errs.receptor_nombre = 'Nombre del receptor requerido';
    }
    if (facturaForm.conceptos.length === 0) {
      errs.conceptos = 'Agrega al menos un concepto';
    }
    setFacturaErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFacturaSubmit = async (e) => {
    e.preventDefault();
    if (!validateFactura()) return;
    setFacturaSaving(true);
    try {
      await facturacion.crearFactura({
        cliente_id: facturaForm.cliente_id ? parseInt(facturaForm.cliente_id) : null,
        receptor_rfc: facturaForm.receptor_rfc.trim().toUpperCase(),
        receptor_nombre: facturaForm.receptor_nombre.trim(),
        uso_cfdi: facturaForm.uso_cfdi,
        forma_pago: facturaForm.forma_pago,
        metodo_pago: facturaForm.metodo_pago,
        serie: facturaForm.serie || null,
        conceptos: facturaForm.conceptos.map(c => ({
          clave_prod_serv: c.clave_prod_serv,
          descripcion: c.descripcion,
          cantidad: c.cantidad,
          unidad: c.unidad,
          clave_unidad: c.clave_unidad || 'ACT',
          valor_unitario: c.valor_unitario,
          importe: c.importe,
          iva: c.iva,
          objeto_imp: c.objeto_imp || (c.iva > 0 ? '02' : '01'),
        })),
      });
      setShowFacturaForm(false);
      setFacturaForm({
        cliente_id: '', receptor_rfc: '', receptor_nombre: '', uso_cfdi: 'G03',
        forma_pago: '03', metodo_pago: 'PUE', serie: '', conceptos: [],
      });
      setFacturaErrors({});
      loadFacturas();
    } catch (err) {
      setFacturaErrors({ general: err.message });
    } finally {
      setFacturaSaving(false);
    }
  };

  const cancelarFactura = async (id) => {
    if (!window.confirm('¿Cancelar esta factura? Esta acción no se puede deshacer.')) return;
    setCancelingId(id);
    try {
      await facturacion.cancelarFactura(id);
      loadFacturas();
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelingId(null);
    }
  };

  // ─── Complementos de Pago ────────────────────
  const [complementos, setComplementos] = useState([]);
  const [loadingComplementos, setLoadingComplementos] = useState(true);
  const [showCompForm, setShowCompForm] = useState(false);
  const [compSaving, setCompSaving] = useState(false);
  const [compErrors, setCompErrors] = useState({});
  const [compForm, setCompForm] = useState({
    receptor_rfc: '', receptor_nombre: '', forma_pago: '03', pagos: [],
  });
  const [compPagoInput, setCompPagoInput] = useState({ uuid_factura: '', importe_pagado: '' });

  const loadComplementos = async () => {
    setLoadingComplementos(true);
    try {
      const data = await facturacion.listarComplementos();
      setComplementos(data);
    } catch (err) {
      console.error('Error al cargar complementos:', err);
    } finally {
      setLoadingComplementos(false);
    }
  };

  useEffect(() => { loadComplementos(); }, []);

  const addCompPago = () => {
    const p = compPagoInput;
    if (!p.uuid_factura || !p.importe_pagado) return;
    setCompForm(prev => ({
      ...prev,
      pagos: [...prev.pagos, { ...p, importe_pagado: parseFloat(p.importe_pagado) }],
    }));
    setCompPagoInput({ uuid_factura: '', importe_pagado: '' });
  };

  const removeCompPago = (idx) => {
    setCompForm(prev => ({
      ...prev,
      pagos: prev.pagos.filter((_, i) => i !== idx),
    }));
  };

  const validateComp = () => {
    const errs = {};
    if (!compForm.receptor_rfc || !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(compForm.receptor_rfc.trim())) {
      errs.receptor_rfc = 'RFC inválido';
    }
    if (!compForm.receptor_nombre || compForm.receptor_nombre.trim().length < 2) {
      errs.receptor_nombre = 'Nombre del receptor requerido';
    }
    if (compForm.pagos.length === 0) {
      errs.pagos = 'Agrega al menos un pago';
    }
    setCompErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCompSubmit = async (e) => {
    e.preventDefault();
    if (!validateComp()) return;
    setCompSaving(true);
    try {
      await facturacion.crearComplemento({
        receptor_rfc: compForm.receptor_rfc.trim().toUpperCase(),
        receptor_nombre: compForm.receptor_nombre.trim(),
        forma_pago: compForm.forma_pago,
        pagos: compForm.pagos,
      });
      setShowCompForm(false);
      setCompForm({ receptor_rfc: '', receptor_nombre: '', forma_pago: '03', pagos: [] });
      setCompErrors({});
      loadComplementos();
    } catch (err) {
      setCompErrors({ general: err.message });
    } finally {
      setCompSaving(false);
    }
  };

  const Logo = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-slate-300 shrink-0">
      <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
      <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
      <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
    </svg>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Logo />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900">Facturación</h1>
          <p className="text-sm text-slate-500 mt-1">Facturas CFDI y complementos de pago</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-900/5 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              tab === t.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── FACTURAS ──────────────────────────── */}
      {tab === 'facturas' && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-slate-400 min-w-[200px]">
              <option value="">Todos los clientes</option>
              {clienteList.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-slate-400">
              <option value="">Todos los estatus</option>
              {Object.entries(ESTATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={() => { setShowFacturaForm(!showFacturaForm); setFacturaErrors({}); }}
              className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-slate-800 transition-all duration-200 ml-auto">
              {showFacturaForm ? 'Cancelar' : '+ Nueva Factura'}
            </button>
          </div>

          {facturaErrors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{facturaErrors.general}</div>
          )}

          {/* New factura form */}
          {showFacturaForm && (
            <form onSubmit={handleFacturaSubmit} className="bg-white rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Nueva Factura</h2>

              {/* Receptor */}
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Receptor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <input placeholder="RFC del receptor *" value={facturaForm.receptor_rfc} onChange={e => setFacturaForm({...facturaForm, receptor_rfc: e.target.value.toUpperCase()})} required
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none transition-all duration-200 focus:ring-2 placeholder:text-slate-400 ${
                      facturaErrors.receptor_rfc ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'
                    }`}/>
                  {facturaErrors.receptor_rfc && <p className="text-xs text-red-500 mt-1">{facturaErrors.receptor_rfc}</p>}
                </div>
                <div>
                  <input placeholder="Nombre del receptor *" value={facturaForm.receptor_nombre} onChange={e => setFacturaForm({...facturaForm, receptor_nombre: e.target.value})} required
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none transition-all duration-200 focus:ring-2 placeholder:text-slate-400 ${
                      facturaErrors.receptor_nombre ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'
                    }`}/>
                  {facturaErrors.receptor_nombre && <p className="text-xs text-red-500 mt-1">{facturaErrors.receptor_nombre}</p>}
                </div>
              </div>

              {/* CFDI options */}
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Datos CFDI</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <select value={facturaForm.uso_cfdi} onChange={e => setFacturaForm({...facturaForm, uso_cfdi: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  <optgroup label="Uso CFDI">
                    {USOS_CFDI.map(u => <option key={u.value} value={u.value}>{u.value} — {u.label}</option>)}
                  </optgroup>
                </select>
                <select value={facturaForm.forma_pago} onChange={e => setFacturaForm({...facturaForm, forma_pago: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  {FORMAS_PAGO.map(f => <option key={f.value} value={f.value}>{f.value} — {f.label}</option>)}
                </select>
                <select value={facturaForm.metodo_pago} onChange={e => setFacturaForm({...facturaForm, metodo_pago: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <div>
                  <input placeholder="Serie (opcional)" value={facturaForm.serie} onChange={e => setFacturaForm({...facturaForm, serie: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-slate-400"/>
                </div>
              </div>

              {/* Conceptos */}
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Conceptos</h3>
              {facturaForm.conceptos.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 pr-2 text-slate-400 font-medium">Clave</th>
                        <th className="text-left py-2 px-2 text-slate-400 font-medium">Descripción</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Cant.</th>
                        <th className="text-left py-2 px-2 text-slate-400 font-medium">Unidad</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">V. Unit.</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Importe</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">IVA</th>
                        <th className="py-2 pl-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturaForm.conceptos.map((c, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-2 pr-2 font-mono text-slate-500">{c.clave_prod_serv}</td>
                          <td className="py-2 px-2 text-slate-900">{c.descripcion}</td>
                          <td className="text-right py-2 px-2 text-slate-600">{c.cantidad}</td>
                          <td className="py-2 px-2 text-slate-400">{c.unidad}</td>
                          <td className="text-right py-2 px-2 text-slate-600">{fmt(c.valor_unitario)}</td>
                          <td className="text-right py-2 px-2 text-slate-600">{fmt(c.importe)}</td>
                          <td className="text-right py-2 px-2 text-slate-600">{fmt(c.iva)}</td>
                          <td className="py-2 pl-2">
                            <button type="button" onClick={() => removeFacturaConcepto(i)}
                              className="text-slate-300 hover:text-red-500 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {facturaErrors.conceptos && <p className="text-xs text-red-500 mb-2">{facturaErrors.conceptos}</p>}

              {/* Summary */}
              {facturaForm.conceptos.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-slate-900 font-semibold">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">IVA</span>
                    <span className="text-slate-900 font-semibold">{fmt(ivaTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-slate-200 mt-1 pt-2">
                    <span className="text-slate-900 font-bold">Total</span>
                    <span className="text-slate-900 font-extrabold text-base">{fmt(total)}</span>
                  </div>
                </div>
              )}

              {/* Add concept */}
              <div className="flex items-end gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 flex-wrap">
                <div className="w-24">
                  <input placeholder="Clave" value={facturaConcInput.clave_prod_serv} onChange={e => setFacturaConcInput({...facturaConcInput, clave_prod_serv: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <input placeholder="Descripción" value={facturaConcInput.descripcion} onChange={e => setFacturaConcInput({...facturaConcInput, descripcion: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <div className="w-16">
                  <input type="number" step="0.01" min="0.01" placeholder="Cant" value={facturaConcInput.cantidad} onChange={e => setFacturaConcInput({...facturaConcInput, cantidad: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <div className="w-20">
                  <input placeholder="Unidad" value={facturaConcInput.unidad} onChange={e => setFacturaConcInput({...facturaConcInput, unidad: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <div className="w-20">
                  <input type="number" step="0.01" min="0" placeholder="V.U." value={facturaConcInput.valor_unitario} onChange={e => setFacturaConcInput({...facturaConcInput, valor_unitario: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <div className="w-16">
                  <select value={facturaConcInput.iva} onChange={e => setFacturaConcInput({...facturaConcInput, iva: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400">
                    <option value={0.16}>16%</option>
                    <option value={0}>0% (exento)</option>
                    <option value={0.08}>8%</option>
                  </select>
                </div>
                <button type="button" onClick={addFacturaConcepto}
                  className="bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg px-3 py-2 hover:bg-slate-300 transition-colors shrink-0">+</button>
              </div>

              <div className="mt-4 flex gap-3">
                <button type="submit" disabled={facturaSaving}
                  className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
                  {facturaSaving ? 'Facturando...' : 'Emitir factura'}
                </button>
              </div>
            </form>
          )}

          {/* Facturas list */}
          {loadingFacturas ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
          ) : facturas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No hay facturas registradas</div>
          ) : (
            <div className="bg-white rounded-2xl shadow-[0_6px_16px_rgba(0,0,0,0.03)] border border-slate-900/5 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-4 text-slate-500 font-semibold">UUID</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-semibold">Receptor</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-semibold">RFC</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-semibold">Fecha</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-semibold">Total</th>
                    <th className="text-center py-3 px-4 text-slate-500 font-semibold">Estatus</th>
                    <th className="py-3 px-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map(f => (
                    <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] max-w-[180px] truncate">{f.uuid || '—'}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{f.receptor_nombre}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{f.receptor_rfc}</td>
                      <td className="py-3 px-4 text-slate-600">{f.fecha ? new Date(f.fecha).toLocaleDateString('es-MX') : '—'}</td>
                      <td className="text-right py-3 px-4 text-slate-900 font-semibold font-mono">{fmt(f.total)}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${ESTATUS_FACTURA[f.estatus] || 'bg-slate-100 text-slate-500'}`}>
                          {ESTATUS_LABEL[f.estatus] || f.estatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {f.estatus === 'activa' && (
                          <button onClick={() => cancelarFactura(f.id)} disabled={cancelingId === f.id}
                            className="text-[10px] text-red-500 hover:text-red-700 font-medium bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                            {cancelingId === f.id ? '...' : 'Cancelar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── COMPLEMENTOS DE PAGO ──────────────── */}
      {tab === 'complementos' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{complementos.length} complementos</p>
            <button onClick={() => { setShowCompForm(!showCompForm); setCompErrors({}); }}
              className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-slate-800 transition-all duration-200">
              {showCompForm ? 'Cancelar' : '+ Nuevo Complemento'}
            </button>
          </div>

          {compErrors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{compErrors.general}</div>
          )}

          {/* New complemento form */}
          {showCompForm && (
            <form onSubmit={handleCompSubmit} className="bg-white rounded-2xl p-6 mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-900/5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Nuevo Complemento de Pago</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">RFC del receptor *</label>
                  <input placeholder="RFC" value={compForm.receptor_rfc} onChange={e => setCompForm({...compForm, receptor_rfc: e.target.value.toUpperCase()})} required
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none focus:ring-2 ${
                      compErrors.receptor_rfc ? 'border-red-300' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'
                    }`}/>
                  {compErrors.receptor_rfc && <p className="text-xs text-red-500 mt-1">{compErrors.receptor_rfc}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Nombre del receptor *</label>
                  <input placeholder="Nombre" value={compForm.receptor_nombre} onChange={e => setCompForm({...compForm, receptor_nombre: e.target.value})} required
                    className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none focus:ring-2 ${
                      compErrors.receptor_nombre ? 'border-red-300' : 'border-slate-100 focus:border-[#2E8B57] focus:ring-[#2E8B57]/15'
                    }`}/>
                  {compErrors.receptor_nombre && <p className="text-xs text-red-500 mt-1">{compErrors.receptor_nombre}</p>}
                </div>
                <select value={compForm.forma_pago} onChange={e => setCompForm({...compForm, forma_pago: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15">
                  {FORMAS_PAGO.map(f => <option key={f.value} value={f.value}>{f.value} — {f.label}</option>)}
                </select>
              </div>

              {/* Pagos */}
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pagos</h3>
              {compForm.pagos.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 pr-2 text-slate-400 font-medium">UUID Factura</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-medium">Importe pagado</th>
                        <th className="py-2 pl-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {compForm.pagos.map((p, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-2 pr-2 font-mono text-slate-600 text-[11px]">{p.uuid_factura}</td>
                          <td className="text-right py-2 px-2 text-slate-900 font-semibold">{fmt(p.importe_pagado)}</td>
                          <td className="py-2 pl-2">
                            <button type="button" onClick={() => removeCompPago(i)}
                              className="text-slate-300 hover:text-red-500 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td className="py-2 pr-2 text-slate-900 font-bold">Total pagado</td>
                        <td className="text-right py-2 px-2 text-slate-900 font-bold">{fmt(compForm.pagos.reduce((s, p) => s + p.importe_pagado, 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {compErrors.pagos && <p className="text-xs text-red-500 mb-2">{compErrors.pagos}</p>}

              {/* Add payment */}
              <div className="flex items-end gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex-1">
                  <input placeholder="UUID de la factura" value={compPagoInput.uuid_factura} onChange={e => setCompPagoInput({...compPagoInput, uuid_factura: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <div className="w-28">
                  <input type="number" step="0.01" min="0" placeholder="Importe" value={compPagoInput.importe_pagado} onChange={e => setCompPagoInput({...compPagoInput, importe_pagado: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-400 placeholder:text-slate-300"/>
                </div>
                <button type="button" onClick={addCompPago}
                  className="bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg px-3 py-2 hover:bg-slate-300 transition-colors shrink-0">+</button>
              </div>

              <div className="mt-4 flex gap-3">
                <button type="submit" disabled={compSaving}
                  className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-slate-800 transition-all duration-200 disabled:opacity-50">
                  {compSaving ? 'Guardando...' : 'Guardar complemento'}
                </button>
              </div>
            </form>
          )}

          {/* Complementos list */}
          {loadingComplementos ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
          ) : complementos.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No hay complementos de pago registrados</div>
          ) : (
            <div className="space-y-3">
              {complementos.map(c => (
                <div key={c.id} className="bg-white rounded-2xl p-5 shadow-[0_6px_16px_rgba(0,0,0,0.03)] border border-slate-900/5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">{c.receptor_nombre}</span>
                      <span className="text-xs text-slate-400 font-mono">{c.receptor_rfc}</span>
                    </div>
                  </div>
                  {c.pagos && c.pagos.length > 0 && (
                    <div className="text-xs text-slate-400">
                      {c.pagos.length} pago(s) · Total: {fmt(c.pagos.reduce((s, p) => s + parseFloat(p.importe_pagado || 0), 0))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
