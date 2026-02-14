
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
  Loader2 
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
    alert('Configuración de empresa guardada.');
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
      alert("Error al exportar.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Se sobrescribirán los datos. ¿Continuar?")) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await dbService.importBackup(json);
        alert("Restauración completa.");
        window.location.reload();
      } catch (err) {
        alert("Archivo inválido.");
      }
    };
    reader.readAsText(file);
  };

  /**
   * REINICIO SEGURO: Vacía las tablas una por una.
   * Este método es mucho más fiable que intentar borrar la base de datos completa.
   */
  const handleReset = async () => {
    if (!confirm("¡ADVERTENCIA!\n\nSe eliminarán todos los registros pero se mantendrá la estructura del sistema.\n\n¿Desea continuar?")) return;
    
    const check = prompt("Escriba ELIMINAR para confirmar:");
    if (check !== "ELIMINAR") return;

    try {
      setIsResetting(true);
      
      // 1. Limpiar todas las tablas de IndexedDB
      await dbService.clearAllData();
      
      // 2. Limpiar Storages del navegador
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Forzar reinicio de la página a la raíz
      setTimeout(() => {
        window.location.replace(window.location.origin);
      }, 1000);

    } catch (error) {
      console.error(error);
      alert("Error al limpiar datos. Intente borrar la caché del navegador.");
      setIsResetting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {isResetting && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[9999] flex flex-col items-center justify-center text-white text-center">
           <Loader2 size={64} className="text-orange-500 animate-spin mb-6" />
           <h2 className="text-3xl font-black uppercase tracking-[0.4em] mb-4">Limpiando Sistema</h2>
           <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest max-w-xs leading-loose">
             Vaciando registros de inventario y ventas...
           </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Datos de Empresa */}
        <section className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 shadow-xl space-y-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
            <Building2 size={16} /> Perfil Jurídico y Fiscal
          </h2>
          <form onSubmit={saveCompany} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Nombre Comercial</label>
                 <input name="name" defaultValue={company.name} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none focus:border-orange-500/50" required />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Eslogan</label>
                 <input name="slogan" defaultValue={company.slogan} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none focus:border-orange-500/50" />
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">RIF</label>
                 <input name="rif" defaultValue={company.rif} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none" required />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Cédula</label>
                 <input name="dni" defaultValue={company.dni} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none" />
               </div>
               <div className="space-y-1 col-span-2 md:col-span-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Teléfono</label>
                 <input name="phone" defaultValue={company.phone} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none" />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Email</label>
                 <input name="email" type="email" defaultValue={company.email} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none" />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Dirección</label>
                 <input name="address" defaultValue={company.address} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none" />
               </div>
            </div>

            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all text-xs uppercase tracking-widest mt-4">
              <Save size={18} /> GUARDAR CAMBIOS
            </button>
          </form>
        </section>

        <div className="space-y-4">
           {/* Logo Section */}
           <section className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 shadow-xl flex flex-col items-center justify-center gap-5 text-center">
             <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400">Branding Corporativo</h2>
             <div className="w-36 h-36 bg-slate-900 rounded-[2.5rem] flex items-center justify-center overflow-hidden relative border-2 border-dashed border-slate-700 group shadow-inner">
                {company.logo ? <img src={company.logo} className="w-full h-full object-contain p-2" alt="Logo" /> : <ImageIcon className="text-slate-700" size={40} />}
                <label className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 backdrop-blur-sm">
                   <Upload size={24} className="text-white mb-1" />
                   <p className="text-[9px] font-black text-white uppercase">Actualizar</p>
                   <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
             </div>
             <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tight">Formato: PNG/JPG (Máx 2MB)</p>
           </section>

           {/* Maintenance Section */}
           <section className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 shadow-xl space-y-5">
             <h2 className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
               <Database size={16} /> Mantenimiento y Backups
             </h2>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={handleExport} className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-4 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg">
                   <Download size={22} className="text-emerald-500" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Respaldar</span>
                </button>
                <label className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-4 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg cursor-pointer">
                   <Upload size={22} className="text-indigo-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Restaurar</span>
                   <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>
             </div>

             <div className="pt-4 border-t border-slate-700/50">
                <button 
                  onClick={handleReset} 
                  disabled={isResetting}
                  className="w-full bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/30 p-5 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                >
                   <Trash2 size={20} /> REINICIAR TODO EL SISTEMA
                </button>
                <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 mt-4 flex items-center gap-3">
                   <AlertTriangle size={24} className="text-rose-500/50 shrink-0" />
                   <p className="text-[9px] font-bold text-rose-500/70 uppercase leading-relaxed">
                     Esta acción vaciará todas las tablas de datos. Es irreversible.
                   </p>
                </div>
             </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
