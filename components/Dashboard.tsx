
import React from 'react';
import { 
  TrendingUp, 
  CreditCard, 
  AlertTriangle,
  Users,
  PlusCircle,
  Package,
  ShoppingCart,
  ArrowRight,
  // Added missing Tag and HandCoins imports
  Tag,
  HandCoins
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
import { Sale, Customer, Product, AppSettings, AppTab } from '../types';

interface Props {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  settings: AppSettings;
  onNavigate: (tab: AppTab) => void;
}

const Dashboard: React.FC<Props> = ({ sales, customers, products, settings, onNavigate }) => {
  const today = new Date().toISOString().split('T')[0];
  const salesToday = sales.filter(s => s.date.startsWith(today));
  const totalSalesToday = salesToday.reduce((sum, s) => sum + s.totalUSD, 0);
  const totalCreditsToday = salesToday.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.totalUSD, 0);
  
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const daySales = sales.filter(s => s.date.startsWith(dateStr));
    return {
      name: d.toLocaleDateString('es', { weekday: 'short' }),
      ventas: daySales.reduce((sum, s) => sum + s.totalUSD, 0),
    };
  }).reverse();

  const QuickAction = ({ icon: Icon, label, color, tab }: any) => (
    <button 
      onClick={() => onNavigate(tab)}
      className="flex flex-col items-center justify-center p-4 bg-[#1e293b] border border-slate-700 rounded-[2rem] hover:border-orange-500/50 hover:bg-slate-800 transition-all group"
    >
      <div className={`p-4 rounded-2xl ${color} text-white mb-2 shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Saludo y Accesos Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction icon={Tag} label="Nueva Venta" color="bg-orange-500" tab={AppTab.SALES} />
        <QuickAction icon={ShoppingCart} label="Cargar Compra" color="bg-indigo-500" tab={AppTab.PURCHASES} />
        <QuickAction icon={Package} label="Inventario" color="bg-emerald-500" tab={AppTab.INVENTORY} />
        <QuickAction icon={HandCoins} label="Ver Deudas" color="bg-rose-500" tab={AppTab.CXC} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-orange-500/20">
           <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Ingresos Hoy</p>
           <h2 className="text-4xl font-black mt-1 tracking-tighter">${totalSalesToday.toFixed(2)}</h2>
           <p className="text-xs font-bold mt-2 opacity-90">{(totalSalesToday * settings.exchangeRate).toLocaleString()} Bs</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 flex flex-col justify-between">
           <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl"><AlertTriangle size={24}/></div>
              <span className="text-[9px] font-black text-rose-500 uppercase">Prioridad</span>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-500 uppercase">Productos Críticos</p>
              <h3 className="text-2xl font-black text-white">{lowStockProducts.length} items</h3>
           </div>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 flex flex-col justify-between">
           <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl"><CreditCard size={24}/></div>
              <span className="text-[9px] font-black text-amber-500 uppercase">Créditos</span>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-500 uppercase">Ventas Pendientes</p>
              <h3 className="text-2xl font-black text-white">${totalCreditsToday.toFixed(2)}</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Tendencia 7 Días</h3>
           <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#475569'}} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff'}} 
                      cursor={{fill: '#ffffff05'}}
                    />
                    <Bar dataKey="ventas" radius={[8, 8, 0, 0]} barSize={20} fill="#f97316" />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Ventas Recientes</h3>
           <div className="space-y-3">
              {sales.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-[#0f172a] rounded-2xl">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                         <TrendingUp size={16}/>
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase truncate max-w-[120px]">{s.customerName}</span>
                   </div>
                   <span className="text-xs font-black text-white">${s.totalUSD.toFixed(2)}</span>
                </div>
              ))}
           </div>
           <button onClick={() => onNavigate(AppTab.SALES)} className="w-full mt-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all">
              Ver Historial <ArrowRight size={14}/>
           </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
