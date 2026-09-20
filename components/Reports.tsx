import React, { useState } from 'react';
import { Download, FileSpreadsheet, PieChart, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { Sale, Purchase, AppSettings } from '../types';

interface Props {
  sales: Sale[];
  purchases: Purchase[];
  settings: AppSettings;
}

export const Reports: React.FC<Props> = ({ sales, purchases, settings }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Filtrado de Ventas por Fecha
  const filteredSales = sales.filter(s => {
    const saleDate = s.date.split('T')[0];
    return saleDate >= startDate && saleDate <= endDate;
  });

  // Filtrado de Compras por Fecha
  const filteredPurchases = purchases.filter(p => {
    const purchDate = p.date.split('T')[0];
    return purchDate >= startDate && purchDate <= endDate;
  });

  // Totales
  const totalGrossSalesUSD = filteredSales.reduce((sum, s) => sum + s.totalUSD, 0);
  const totalPurchasesUSD = filteredPurchases.reduce((sum, p) => sum + p.totalUSD, 0);
  const totalGrossProfitUSD = totalGrossSalesUSD - totalPurchasesUSD;

  // Exportación CSV
  const exportSalesCSV = () => {
    if (filteredSales.length === 0) {
      alert("No hay ventas registradas en el rango de fechas seleccionado.");
      return;
    }

    const headers = ["ID Folio", "Fecha", "Cliente", "Vendedor", "Estatus", "Total USD", "Total BS"];
    const rows = filteredSales.map(s => [
      s.id.slice(0, 8).toUpperCase(),
      new Date(s.date).toLocaleDateString('es-VE'),
      `"${(s.customerName || 'Contado').replace(/"/g, '""')}"`,
      `"${(s.sellerName || 'Sistema').replace(/"/g, '""')}"`,
      s.status === 'paid' ? 'Pagado' : 'Pendiente/Crédito',
      s.totalUSD.toFixed(2),
      (s.totalUSD * (s.exchangeRate || settings.exchangeRate)).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Ventas_${startDate}_al_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-black uppercase text-white">Reportes y Métricas</h1>
        <p className="text-slate-400 text-xs">Análisis financiero y exportación de datos</p>
      </header>

      {/* Bar de selección de fechas */}
      <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="flex items-center gap-3 text-orange-500 font-black text-xs uppercase tracking-widest">
           <Calendar size={20} />
           <span>Período de Análisis</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-[#0f172a] px-4 py-2.5 rounded-2xl border border-slate-700">
             <span className="text-[9px] font-black uppercase text-slate-500">Desde:</span>
             <input
               type="date"
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
               className="bg-transparent text-xs font-bold text-white outline-none"
             />
          </div>
          <div className="flex items-center gap-2 bg-[#0f172a] px-4 py-2.5 rounded-2xl border border-slate-700">
             <span className="text-[9px] font-black uppercase text-slate-500">Hasta:</span>
             <input
               type="date"
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
               className="bg-transparent text-xs font-bold text-white outline-none"
             />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportación Reportes CSV */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 shadow-xl space-y-6 flex flex-col justify-between">
           <div>
             <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 flex items-center gap-2 mb-2">
                <FileSpreadsheet size={20} /> Exportar Reportes de Ventas
             </h2>
             <p className="text-xs text-slate-400 font-medium leading-relaxed">
               Descargue el archivo detallado en formato CSV compatible con Excel para su gestión contable.
             </p>
           </div>

           <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-700/50 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                 <span>Transacciones en Período:</span>
                 <span className="text-orange-500">{filteredSales.length} ventas</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-300">
                 <span>Monto Bruto Total:</span>
                 <span className="text-emerald-400">${totalGrossSalesUSD.toFixed(2)}</span>
              </div>
           </div>

           <button
             onClick={exportSalesCSV}
             className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all text-xs uppercase tracking-widest"
           >
              <Download size={18} /> Descargar Reporte CSV
           </button>
        </div>

        {/* Resumen Financiero de Utilidades */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 shadow-xl space-y-6">
           <h2 className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
              <PieChart size={20} /> Balance Financiero del Período
           </h2>

           <div className="space-y-4 py-2">
              <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-400 font-bold uppercase">Total Ventas Brutas:</span>
                 <span className="font-black text-white text-base">${totalGrossSalesUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-400 font-bold uppercase">Total Compras e Inversiones:</span>
                 <span className="font-black text-rose-400 text-base">-${totalPurchasesUSD.toFixed(2)}</span>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex justify-between items-center">
                 <div>
                    <span className="text-xs font-black uppercase text-slate-300 block">Diferencia Operativa</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">
                      {(totalGrossProfitUSD * settings.exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                    </span>
                 </div>
                 <span className={`text-2xl font-black ${totalGrossProfitUSD >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                   ${totalGrossProfitUSD.toFixed(2)}
                 </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
