import KpiCard from './components/KpiCard';
import BarChart from './components/BarChart';
import PieChart from './components/PieChart';
import RecentActivity from './components/RecentActivity';
import VencimientosProximos from './components/VencimientosProximos';

export default function Dashboard({ usuario }) {
  return (
    <div className="mobile-scroll overflow-y-auto h-full">
      <div className="px-6 md:px-10 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tighter text-white">Dashboard</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Resumen del período actual{usuario && ` · ${usuario.rol === 'admin' ? 'Todos los asesores' : 'Mis clientes'}`}
          </p>
        </div>

        {/* KPI Row — 4 cards en grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard titulo="Ingresos del Mes" valor="$156,400" cambio="+12.5%" positivo={true} />
          <KpiCard titulo="Gastos" valor="$98,200" cambio="+5.2%" positivo={false} />
          <KpiCard titulo="Utilidad Neta" valor="$58,200" cambio="+18.3%" positivo={true} />
          <KpiCard titulo="IVA por Pagar" valor="$14,380" cambio="-2.1%" positivo={true} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <BarChart />
          <PieChart />
        </div>

        {/* Recent activity + Vencimientos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentActivity />
          <VencimientosProximos />
        </div>

      </div>
    </div>
  );
}
