import React, { useState } from 'react';
import { Plus, Search, User, Phone, Trash2, Edit2, X, UserCheck, Mail, Loader2 } from 'lucide-react';
import { Customer, Supplier, Seller, AppSettings } from '../types';
import { dbService } from '../db';

interface Props {
  type: 'customers' | 'suppliers' | 'sellers';
  items: any[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  relatedData: any[];
  settings: AppSettings;
}

export const Contacts: React.FC<Props> = ({ type, items, setItems, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredItems = items.filter(i => 
    (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.rif || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.phone || '').includes(searchTerm)
  );

  const saveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const newItem = {
        id: editingItem?.id || crypto.randomUUID(),
        name: formData.get('name') as string,
        rif: formData.get('rif') as string || '',
        phone: formData.get('phone') as string,
        ...(type === 'customers' ? { email: formData.get('email') as string } : {}),
        ...(type === 'sellers' ? { status: 'active' } : {})
      };
      
      await dbService.put(type, newItem);
      
      setItems(prev => {
        const filtered = prev.filter(i => i.id !== newItem.id);
        return [...filtered, newItem].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      });
      
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      alert("⚠️ ERROR DE CONEXIÓN:\n\nNo se pudo guardar el registro. Asegúrate de que el servidor esté corriendo en Termux con 'node server.js'.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('¿Seguro que desea eliminar este contacto?')) return;
    try {
      await dbService.delete(type, id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      alert("No se pudo eliminar el contacto. Verifique la conexión.");
    }
  };

  const labels = {
    customers: { title: 'Clientes', icon: User, color: 'text-orange-500' },
    suppliers: { title: 'Proveedores', icon: User, color: 'text-indigo-500' },
    sellers: { title: 'Vendedores', icon: UserCheck, color: 'text-emerald-500' }
  };

  const currentLabel = labels[type];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
          <input 
            type="text" placeholder={`Buscar en ${currentLabel.title}...`} 
            className="w-full bg-[#1e293b] border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold outline-none transition-all text-white focus:border-orange-500/50"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-black p-3 rounded-2xl shadow-lg active:scale-95 transition-all">
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-[#1e293b] p-5 rounded-[1.5rem] border border-slate-700 shadow-lg relative group transition-all hover:scale-[1.02] hover:border-slate-500">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Edit2 size={14} /></button>
              <button onClick={() => deleteItem(item.id)} className="p-2 bg-rose-500/10 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white"><Trash2 size={14} /></button>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center ${currentLabel.color}`}>
                <currentLabel.icon size={24} />
              </div>
              <div className="max-w-[70%]">
                <h3 className="font-black truncate text-sm text-white leading-tight uppercase">{item.name}</h3>
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                  {type === 'sellers' ? 'Personal de Ventas' : (item.rif || 'Sin RIF')}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                 <Phone size={12} className="text-orange-500" /> {item.phone || 'Sin teléfono'}
              </div>
              {item.email && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                   <Mail size={12} className="text-orange-500" /> {item.email}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-md rounded-[2.5rem] p-8 border border-slate-700 animate-in zoom-in-95">
            <h2 className="text-xl font-black mb-6 uppercase tracking-tighter text-orange-500">
              {editingItem ? 'Editar' : 'Nuevo'} {currentLabel.title.slice(0, -1)}
            </h2>
            <form onSubmit={saveItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Nombre Completo / Razón</label>
                <input name="name" defaultValue={editingItem?.name} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/50" required />
              </div>
              
              {type !== 'sellers' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">RIF / Cédula</label>
                  <input name="rif" defaultValue={editingItem?.rif} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/50" />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Teléfono de Contacto</label>
                <input name="phone" defaultValue={editingItem?.phone} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/50" required />
              </div>

              {type === 'customers' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Correo Electrónico</label>
                  <input name="email" type="email" defaultValue={editingItem?.email} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/50" />
                </div>
              )}

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="flex-1 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-[2] bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg uppercase text-[10px] tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;