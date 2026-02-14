
import React, { useRef, useState } from 'react';
import { 
  Building2, Save, Download, Upload, RefreshCw, Image as ImageIcon, DollarSign, Printer, Smartphone, User, Building, Mail, MapPin, Trash2, Database, AlertTriangle
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
    const backup = await dbService.exportBackup();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Respaldo_DDanez_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!confirm("Esta acción sobrescribirá o fusionará los datos actuales. ¿Desea continuar?")) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await dbService.importBackup(json);
        alert("Restauración exitosa. La aplicación se reiniciará.");
        window.location.reload();
      } catch (err) {
        alert("Error: Archivo de respaldo inválido.");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (!confirm("ADVERTENCIA CRÍTICA: Se eliminarán TODOS los productos, ventas, compras y clientes permanentemente. Esta acción NO se puede deshacer. ¿Está absolutamente seguro?")) return;
    
    const confirmText = prompt("Escriba 'ELIMINAR TODO' para confirmar el borrado total:");
    if (confirmText !== 'ELIMINAR TODO') return;

    setIsResetting(true);
    await dbService.clearAllData();
    window.location.reload();
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Perfil de Empresa Completo */}
        <section className="bg-[#1e293b] p-5 rounded-[2rem] border border-slate-700 shadow-xl space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
            <Building2 size={14} /> Identidad y Datos Fiscales
          </h2>
          <form onSubmit={saveCompany} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Nombre Comercial</label>
                 <input name="name" defaultValue={company.name} placeholder="Nombre Empresa" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" required />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Eslogan / Lema</label>
                 <input name="slogan" defaultValue={company.slogan} placeholder="Slogan Publicitario" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" />
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">RIF Jurídico</label>
                 <input name="rif" defaultValue={company.rif} placeholder="J-00000000-0" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" required />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Cédula Titular</label>
                 <input name="dni" defaultValue={company.dni} placeholder="V-00.000.000" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" />
               </div>
               <div className="space-y-1 col-span-2 md:col-span-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Teléfono Contacto</label>
                 <input name="phone" defaultValue={company.phone} placeholder="0412-0000000" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Correo Electrónico</label>
                 <input name="email" type="email" defaultValue={company.email} placeholder="empresa@correo.com" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Dirección Fiscal</label>
                 <input name="address" defaultValue={company.address} placeholder="Dirección Completa" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" />
               </div>
            </div>

            <div className="border-t border-slate-700/50 pt-3 mt-4">
              <h3 className="text-[9px] font-black uppercase text-indigo-400 mb-3 ml-2">Datos de Pago Móvil</h3>
              <div className="grid grid-cols-2 gap-3">
                <input name="bank" defaultValue={company.bank} placeholder="Banco Recept." className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" />
                <input name="mobilePhone" defaultValue={company.mobilePhone} placeholder="Tel. Pago Móvil" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" />
              </div>
            </div>

            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg transition-all text-[11px] uppercase tracking-widest mt-4">
              <Save size={18} /> ACTUALIZAR PERFIL
            </button>
          </form>
        </section>

        <div className="space-y-4">
           {/* Branding Logo */}
           <section className="bg-[#1e293b] p-5 rounded-[2rem] border border-slate-700 shadow-xl flex flex-col items-center justify-center gap-4">
             <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400">Logotipo Institucional</h2>
             <div className="w-32 h-32 bg-slate-800 rounded-3xl flex items-center justify-center overflow-hidden relative shadow-inner border-2 border-dashed border-slate-700 group">
                {company.logo ? <img src={company.logo} className="w-full h-full object-contain p-2" /> : <ImageIcon className="text-slate-600" size={32} />}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                   <div className="text-center">
                      <Upload size={20} className="text-white mx-auto" />
                      <p className="text-[8px] font-black text-white mt-1">SUBIR</p>
                   </div>
                   <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
             </div>
             <p className="text-[9px] text-slate-500 font-bold uppercase">Formato recomendado: PNG Transparente</p>
           </section>

           {/* Gestión de Base de Datos */}
           <section className="bg-[#1e293b] p-5 rounded-[2rem] border border-slate-700 shadow-xl space-y-4">
             <h2 className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
               <Database size={14} /> Mantenimiento de Sistema
             </h2>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExport} className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-4 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 transition-all active:scale-95">
                   <Download size={20} className="text-emerald-500" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-center">Exportar Respaldo</span>
                </button>
                <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-4 rounded-2xl border border-slate-700 flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer">
                   <Upload size={20} className="text-indigo-400" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-center">Restaurar Datos</span>
                   <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>
             </div>

             <div className="pt-4 border-t border-slate-700/50">
                <button onClick={handleReset} className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 font-black text-[10px] uppercase tracking-[0.2em]">
                   <Trash2 size={18} /> Reiniciar Aplicación
                </button>
                <p className="text-[8px] font-bold text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
                   <AlertTriangle size={10} className="text-amber-500" /> PELIGRO: Borrará todo el historial local.
                </p>
             </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
