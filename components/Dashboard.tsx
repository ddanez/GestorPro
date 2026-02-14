
import React from 'react';
import { 
  TrendingUp, 
  CreditCard, 
  Coins, 
  Users as UsersIcon, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { Sale, Customer, Product, AppSettings } from '../types';

interface Props {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  settings: AppSettings;
}

const Dashboard: React.FC<Props> = ({ sales, customers, products, settings }) => {
  const today = new Date().toISOString().split('T')[0];
  const salesToday = sales.filter(s => s.date.startsWith(today));
  const totalSalesToday = salesToday.reduce((sum, s) => sum + s.totalUSD, 0);
  const totalCreditsToday = salesToday.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.totalUSD, 0);
  
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last30Days.map(date => {
    const daySales = sales.filter(s => s.date.startsWith(date));
    return {
      name: new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short' }),
      ventas: daySales.reduce((sum, s) => sum + s.totalUSD, 0),
      fullDate: date
    };
  });

  const getBarColor = (value: number) => {
    if (value === 0) return '#334155';
    if (value < 50) return '#fb923c';
    if (value < 200) return '#f97316';
    if (value < 500) return '#ea580c';
    if (value < 1000) return '#c2410c';
    return '#9a3412';
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-lg transition-transform hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-xl ${color} shadow-lg shadow-inherit/20`}>
          <Icon className="text-white" size={18} />
        </div>
        {trend && (
          <div className={`flex items-center text-[10px] font-black ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-0.5">{title}</h3>
      <p className="text-xl font-black text-white leading-tight">${value.toFixed(2)}</p>
      <p className="text-[9px] text-slate-500 font-bold">{(value * settings.exchangeRate).toLocaleString()} Bs</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventas Hoy" value={totalSalesToday} icon={TrendingUp} color="bg-orange-500" />
        <StatCard title="Créditos Hoy" value={totalCreditsToday} icon={CreditCard} color="bg-amber-500" />
        <StatCard title="Bajo Stock" value={lowStockProducts.length} icon={AlertTriangle} color="bg-rose-500" />
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-lg">
           <div className="flex justify-between items-start mb-2">
             <div className="p-2 rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/20">
               <UsersIcon className="text-white" size={18} />
             </div>
           </div>
           <h3 className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-0.5">Clientes</h3>
           <p className="text-xl font-black text-white">{customers.length}</p>
        </div>
      </div>

      <div className="bg-[#1e293b] p-5 rounded-[2rem] border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
           <div>
             <h2 className="text-sm font-black text-white uppercase tracking-widest">Rendimiento 30D</h2>
             <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Ventas en Dólares (USD)</p>
           </div>
           <span className="px-3 py-1 text-[8px] font-black rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase">HISTÓRICO</span>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} interval={2} />
              <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                cursor={{ fill: '#ffffff05' }}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '8px' }}
                itemStyle={{ color: '#f97316', fontWeight: 'bold', fontSize: '10px' }}
                labelStyle={{ color: '#94a3b8', fontSize: '8px', marginBottom: '2px', textTransform: 'uppercase', fontWeight: '900' }}
              />
              <Bar dataKey="ventas" radius={[4, 4, 0, 0]} barSize={8}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.ventas)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
