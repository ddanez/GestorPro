import React, { useState } from 'react';
import { 
  Building2, 
  Save, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Database, 
  AlertTriangle, 
  Loader2,
  Sliders
} from 'lucide-react';
import { CompanyInfo, AppSettings } from '../types';
import { dbService } from '../db';

interface Props {
  company: CompanyInfo;
  setCompany: React.Dispatch<React.SetStateAction<CompanyInfo>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const Settings: React.FC<Props> = ({ company, setCompany, settings, setSettings }) => {
  const [isResetting, setIsResetting] = useState(false);

  const saveCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCompany = { 
      ...company, 
      name: formData.get('name') as string, 
      ownerName: formData.get('ownerName') as string, 
      phone: formData.get('phone') as string,
      bank: formData.get('bank') as string, 
      mobilePhone: formData.get('mobilePhone') as string, 
      dni: formData.get('dni') as string,
      rif: formData.get('rif') as string,
      slogan: formData.get('slogan') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
    };
    setCompany(newCompany);
    await dbService.put('settings', { ...newCompany, id: 'company_info' });
    alert('Configuración de empresa guardada correctamente.');
  };

  const saveAppSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSettings: AppSettings = {
      ...settings,
      exchangeRate: parseFloat(formData.get('exchangeRate') as string) || settings.exchangeRate,
      showLogoOnTicket: formData.get('showLogoOnTicket') === 'on',
      showIvaOnTicket: formData.get('showIvaOnTicket') === 'on',
      includeQr: formData.get('includeQr') === 'on',
      ticketFooter: formData.get('ticketFooter') as string,
    };
    setSettings(newSettings);
    await dbService.put('settings', { ...newSettings, id: 'app_settings' });
    alert('Preferencias del sistema guardadas.');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const newCompany = { ...company, logo: base64 };
        setCompany(newCompany);
        await dbService.put('settings', { ...newCompany, id: 'company_info' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = async () => {
    try {
      const backup = await dbService.exportBackup();
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Respaldo_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error al exportar respaldo.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Se sobrescribirán todos los datos del sistema con este respaldo. ¿Desea continuar?")) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await dbService.importBackup(json);
        alert("Restauración de datos completada.");
        window.location.reload();
      } catch (err) {
        alert("Archivo de respaldo inválido o corrupto.");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (!confirm("¡ADVERTENCIA DE SEGURIDAD!\n\nSe eliminarán permanentemente todos los productos, ventas, compras y clientes.\n\n¿Desea borrar todos los registros?")) return;
    
    const check = prompt("Escriba ELIMINAR para confirmar la acción:");
    if (check !== "ELIMINAR") return;

    try {
      setIsResetting(true);
      
      await dbService.clearAllData();
      localStorage.clear();
      sessionStorage.clear();
      
      setTimeout(() => {
        window.location.replace(window.location.origin);
      }, 1000);

    } catch (error) {
      console.error(error);
      alert("Error al limpiar datos. Por favor borre la caché del navegador.");
      setIsResetting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 space-y-6">
      {isResetting && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[9999] flex flex-col items-center justify-center text-white text-center">
           <Loader2 size={64} className="text-orange-500 animate-spin mb-6" />
           <h2 className="text-3xl font-black uppercase tracking-[0.4em] mb-4">Limpiando Sistema</h2>
           <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest max-w-xs leading-loose">
             Vaciando registros de inventario y ventas...
           </p>
        </div>
      )}

      <header>
        <h1 className="text-2xl font-black uppercase text-white">Ajustes y Configuración</h1>
        <p className="text-slate-400 text-xs">Información fiscal, tickets y administración de base de datos</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos de Empresa */}
        <section className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 shadow-xl space-y-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
            <Building2 size={16} /> Perfil Jurídico y Fiscal
          </h2>
          <form onSubmit={saveCompany} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Nombre Comercial</label>
                 <input name="name" defaultValue={company.name} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none focus:border-orange-500/50" required />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Eslogan</label>
                 <input name="slogan" defaultValue={company.slogan} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none focus:border-orange-500/50" />
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">RIF / NIF</label>
                 <input name="rif" defaultValue={company.rif} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none" required />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Cédula Titular</label>
                 <input name="dni" defaultValue={company.dni} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none" />
               </div>
               <div className="space-y-1 col-span-2 md:col-span-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Teléfono Principal</label>
                 <input name="phone" defaultValue={company.phone} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none" />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Banco Pago Móvil</label>
                 <input name="bank" defaultValue={company.bank} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none" placeholder="BANCO DE VENEZUELA" />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Teléfono Pago Móvil</label>
                 <input name="mobilePhone" defaultValue={company.mobilePhone} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none" placeholder="0412-0000000" />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Email</label>
                 <input name="email" type="email" defaultValue={company.email} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none" />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Dirección Fiscal</label>
                 <input name="address" defaultValue={company.address} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none" />
               </div>
            </div>

            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all text-xs uppercase tracking-widest mt-4">
              <Save size={18} /> GUARDAR PERFIL
            </button>
          </form>
        </section>

        {/* Preferencias del Sistema y Opciones de Ticket */}
        <div className="space-y-6">
           <section className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 shadow-xl space-y-5">
             <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
               <Sliders size={16} /> Opciones de Sistema y Tickets
             </h2>
             <form onSubmit={saveAppSettings} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Tasa de Cambio Oficial (Bs/USD)</label>
                   <input name="exchangeRate" type="number" step="0.01" defaultValue={settings.exchangeRate} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-black text-orange-500 outline-none" required />
                </div>

                <div className="space-y-2 pt-2">
                   <label className="flex items-center gap-3 bg-[#0f172a] p-3 rounded-2xl border border-slate-700/50 cursor-pointer">
                      <input type="checkbox" name="showLogoOnTicket" defaultChecked={settings.showLogoOnTicket} className="w-4 h-4 accent-orange-500 rounded" />
                      <span className="text-xs font-bold text-slate-300 uppercase">Mostrar Logo en Ticket de Venta</span>
                   </label>
                </div>

                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Pie de Página del Ticket</label>
                   <textarea name="ticketFooter" defaultValue={settings.ticketFooter} rows={2} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-xs font-bold text-white outline-none resize-none" />
                </div>

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all text-xs uppercase tracking-widest">
                  <Save size={18} /> GUARDAR PREFERENCIAS
                </button>
             </form>
           </section>

           {/* Branding Corporativo y Logotipo */}
           <section className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 shadow-xl flex flex-col items-center justify-center gap-4 text-center">
             <h2 className="text-xs font-black uppercase tracking-widest text-emerald-400">Branding Corporativo (Logo)</h2>
             <div className="w-32 h-32 bg-slate-900 rounded-[2rem] flex items-center justify-center overflow-hidden relative border-2 border-dashed border-slate-700 group shadow-inner">
                {company.logo ? <img src={company.logo} className="w-full h-full object-contain p-2" alt="Logo" /> : <ImageIcon className="text-slate-700" size={36} />}
                <label className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 backdrop-blur-sm">
                   <Upload size={20} className="text-white mb-1" />
                   <p className="text-[8px] font-black text-white uppercase">Cambiar Logo</p>
                   <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
             </div>
             <p className="text-[8px] text-slate-500 font-bold uppercase">Formato recomendado: PNG/JPG (Transparente)</p>
           </section>

           {/* Mantenimiento y Respaldos */}
           <section className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 shadow-xl space-y-5">
             <h2 className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
               <Database size={16} /> Mantenimiento y Base de Datos
             </h2>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={handleExport} className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-4 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg">
                   <Download size={20} className="text-emerald-500" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Descargar Respaldo</span>
                </button>
                <label className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-4 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg cursor-pointer">
                   <Upload size={20} className="text-indigo-400" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Restaurar Respaldo</span>
                   <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>
             </div>

             <div className="pt-4 border-t border-slate-700/50">
                <button 
                  onClick={handleReset} 
                  disabled={isResetting}
                  className="w-full bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/30 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 font-black text-xs uppercase tracking-widest disabled:opacity-50"
                >
                   <Trash2 size={18} /> REINICIAR TODO EL SISTEMA
                </button>
             </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
