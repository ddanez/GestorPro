
import React, { useState } from 'react';
import { Plus, Search, User, Phone, FileText, Trash2, Edit2, History, X, Receipt, CreditCard, ArrowRightCircle } from 'lucide-react';
import { Customer, Supplier, Sale, Purchase, AppSettings } from '../types';
import { dbService } from '../db';

interface Props {
  type: 'customers' | 'suppliers';
  items: (Customer | Supplier)[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  relatedData: (Sale | Purchase)[];
  settings: AppSettings;
}

export const Contacts: React.FC<Props> = ({ type, items, setItems, relatedData, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyItem, setHistoryItem] = useState<Customer | Supplier | null>(null);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.rif.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem = {
      id: editingItem?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      rif: formData.get('rif') as string,
      phone: formData.get('phone') as string,
      ...(type === 'customers' ? { email: formData.get('email') as string } : {})
    };
    await dbService.put(type, newItem);
    setItems(prev => [...prev.filter(i => i.id !== newItem.id), newItem].sort((a, b) => a.name.localeCompare(b.name)));
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const getItemStats = (id: string) => {
    const itemTransactions = relatedData.filter(t => type === 'customers' ? (t as Sale).customerId === id : (t as Purchase).supplierId === id);
    const totalVolume = itemTransactions.reduce((sum, t) => sum + t.totalUSD, 0);
    const totalPending = itemTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.totalUSD - (t.paidAmountUSD || 0)), 0);
    const totalPaid = itemTransactions.reduce((sum, t) => sum + (t.paidAmountUSD || 0), 0);
    return { itemTransactions, totalVolume, totalPending, totalPaid };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
          <input 
            type="text" placeholder="Nombre o RIF..." 
            className="w-full bg-[#1e293b] border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold outline-none transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-black p-3 rounded-2xl shadow-lg active:scale-95 transition-all">
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-lg relative group transition-all hover:scale-[1.02]">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1.5 bg-slate-800 rounded-lg text-slate-400"><Edit2 size={12} /></button>
              <button onClick={() => setHistoryItem(item)} className="p-1.5 bg-orange-500 rounded-lg text-white"><History size={12} /></button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-orange-500">
                <User size={20} />
              </div>
              <div className="max-w-[70%]">
                <h3 className="font-black truncate text-xs text-white leading-tight uppercase">{item.name}</h3>
                <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest">{item.rif}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
               <Phone size={10} className="text-orange-500" /> {item.phone}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-md rounded-[2.5rem] p-8 border border-slate-700 animate-in zoom-in-95">
            <h2 className="text-xl font-black mb-6 uppercase tracking-tighter text-orange-500">Ficha de Contacto</h2>
            <form onSubmit={saveItem} className="space-y-4">
              <input name="name" defaultValue={editingItem?.name} placeholder="Nombre / Empresa" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" required />
              <input name="rif" defaultValue={editingItem?.rif} placeholder="RIF / Cédula" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" required />
              <input name="phone" defaultValue={editingItem?.phone} placeholder="Teléfono" className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold outline-none" required />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Cerrar</button>
                <button type="submit" className="flex-[2] bg-orange-500 text-white font-black py-3 rounded-xl shadow-lg uppercase text-[10px] tracking-widest">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
