import React, { useState } from 'react';
import { Plus, ShoppingCart, Truck, Search, Trash2, ArrowLeft, CheckCircle2, PlusCircle, Edit3, Loader2, UserPlus } from 'lucide-react';
import { Purchase, Supplier, Product, AppSettings, PurchaseItem } from '../types';
import { dbService } from '../db';

interface ExtendedPurchaseItem extends PurchaseItem {
  newSalePriceUSD: number;
}

interface Props {
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: AppSettings;
}

const Purchases: React.FC<Props> = ({ purchases, setPurchases, suppliers, setSuppliers, products, setProducts, settings }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [cart, setCart] = useState<ExtendedPurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isCredit, setIsCredit] = useState(false);
  const [isDiscount, setIsDiscount] = useState(false);
  const [discountVal, setDiscountVal] = useState(0);
  const [initialPayment, setInitialPayment] = useState(0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      if (prev.find(item => item.productId === product.id)) return prev;
      return [...prev, { productId: product.id, name: product.name, quantity: 1, costUSD: product.costUSD, newSalePriceUSD: product.priceUSD }];
    });
    setProductSearch('');
  };

  const updateCartItem = (productId: string, field: keyof ExtendedPurchaseItem, value: any) => {
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, [field]: value } : item).filter(i => i.quantity > 0 || field !== 'quantity'));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.costUSD), 0);
  const finalTotal = subtotal - (isDiscount ? discountVal : 0);

  const finishPurchase = async () => {
    if (!selectedSupplierId || cart.length === 0) return alert('Complete los datos');
    setIsSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      
      const newPurchase: Purchase = {
        id: editingPurchase?.id || crypto.randomUUID(),
        date: editingPurchase?.date || new Date().toISOString(),
        supplierId: selectedSupplierId,
        supplierName: supplier?.name || 'Proveedor',
        items: cart.map(({ newSalePriceUSD, ...rest }) => rest),
        totalUSD: finalTotal,
        totalBS: finalTotal * settings.exchangeRate,
        exchangeRate: settings.exchangeRate,
        status: isCredit ? 'pending' : 'paid',
        discountUSD: isDiscount ? discountVal : 0,
        initialPaymentUSD: isCredit ? initialPayment : finalTotal,
        paidAmountUSD: isCredit ? initialPayment : finalTotal
      };

      const updatedProducts = [...products];
      for (const item of cart) {
        const idx = updatedProducts.findIndex(p => p.id === item.productId);
        if (idx !== -1) {
          updatedProducts[idx] = { 
            ...updatedProducts[idx], 
            stock: updatedProducts[idx].stock + item.quantity, 
            costUSD: item.costUSD, 
            priceUSD: item.newSalePriceUSD 
          };
          await dbService.put('products', updatedProducts[idx]);
        }
      }

      await dbService.put('purchases', newPurchase);
      
      setPurchases(prev => {
         const filtered = prev.filter(p => p.id !== newPurchase.id);
         return [newPurchase, ...filtered].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      setProducts(updatedProducts);
      
      setIsRegisterMode(false);
      setEditingPurchase(null);
      setCart([]);
      setSelectedSupplierId('');
    } catch (err) {
      alert("❌ ERROR AL PROCESAR COMPRA:\n\nNo se pudo conectar con el servidor de base de datos.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (p: Purchase) => {
    setEditingPurchase(p);
    setSelectedSupplierId(p.supplierId);
    setCart(p.items.map(i => {
       const prod = products.find(x => x.id === i.productId);
       return { ...i, newSalePriceUSD: prod?.priceUSD || i.costUSD * 1.3 };
    }));
    setIsDiscount((p.discountUSD || 0) > 0);
    setDiscountVal(p.discountUSD || 0);
    setIsCredit(p.status === 'pending');
    setInitialPayment(p.initialPaymentUSD || 0);
    setIsRegisterMode(true);
  };

  if (!isRegisterMode) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div>
             <h1 className="text-2xl font-black uppercase text-white">Compras</h1>
             <p className="text-slate-400 text-sm">Carga de mercancía y costos</p>
          </div>
          <button onClick={() => { setEditingPurchase(null); setIsRegisterMode(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-black py-4 px-8 rounded-2xl flex items-center gap-2 shadow-lg active:scale-95 transition-all text-xs">
            <Plus size={24} /> NUEVA COMPRA
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
           {purchases.map(p => (
             <div key={p.id} className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                   <div className="p-4 bg-slate-800 rounded-2xl text-orange-500"><Truck size={28} /></div>
                   <div>
                      <p className="font-bold text-lg text-white leading-tight uppercase">{p.supplierName}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase mt-1">{new Date(p.date).toLocaleString()}</p>
                   </div>
                </div>
                <div className="text-right px-8">
                   <p className="text-2xl font-black text-white leading-none">${p.totalUSD.toFixed(2)}</p>
                   <p className="text-xs font-bold text-orange-500 mt-1">{(p.totalUSD * settings.exchangeRate).toLocaleString()} Bs</p>
                </div>
                <button onClick={() => handleEdit(p)} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><Edit3 size={18}/></button>
             </div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0f172a] z-[120] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="p-6 border-b border-slate-700 bg-[#1e293b] flex justify-between items-center sticky top-0 z-[130]">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsRegisterMode(false)} className="p-2 hover:bg-slate-700 rounded-full text-white"><ArrowLeft size={28}/></button>
              <h2 className="text-xl font-black uppercase text-white">Carga de Inventario</h2>
           </div>
        </div>

        <div className="max-w-6xl mx-auto p-6 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Proveedor</label>
                 <div className="flex gap-2">
                    <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="flex-1 bg-[#0f172a] border border-slate-700 rounded-2xl p-4 font-bold text-white outline-none">
                       <option value="">ELIJA PROVEEDOR...</option>
                       {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={() => setIsSupplierModalOpen(true)} className="p-4 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20"><UserPlus size={24} /></button>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Producto</label>
                 <div className="flex gap-2">
                    <div className="relative flex-1">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                       <input type="text" placeholder="Buscar..." className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 pl-12 font-bold text-white outline-none" value={productSearch} onChange={(e) => {
                          setProductSearch(e.target.value);
                          const f = products.find(x => x.name.toLowerCase() === e.target.value.toLowerCase() || x.sku === e.target.value);
                          if (f) addToCart(f);
                       }} list="products-list-purch-final" />
                       <datalist id="products-list-purch-final">{products.map(p => <option key={p.id} value={p.name}>{p.sku}</option>)}</datalist>
                    </div>
                    <button onClick={() => setIsProductModalOpen(true)} className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20"><PlusCircle size={24} /></button>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              {cart.map(item => (
                <div key={item.productId} className="bg-[#1e293b] p-6 rounded-[2rem] border border-slate-700 flex flex-col md:flex-row gap-6 items-center">
                   <div className="flex-1 w-full"><h4 className="font-black text-white text-sm uppercase">{item.name}</h4></div>
                   <div className="grid grid-cols-3 gap-3 w-full md:w-[450px]">
                      <div><label className="text-[8px] font-black text-slate-500 uppercase block text-center">Cant</label><input type="number" value={item.quantity} onChange={(e) => updateCartItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-center text-xs font-black text-orange-500"/></div>
                      <div><label className="text-[8px] font-black text-slate-500 uppercase block text-center">Costo $</label><input type="number" value={item.costUSD} onChange={(e) => updateCartItem(item.productId, 'costUSD', parseFloat(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-center text-xs font-black text-white"/></div>
                      <div><label className="text-[8px] font-black text-slate-500 uppercase block text-center">PVP $</label><input type="number" value={item.newSalePriceUSD} onChange={(e) => updateCartItem(item.productId, 'newSalePriceUSD', parseFloat(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-center text-xs font-black text-emerald-500"/></div>
                   </div>
                   <button onClick={() => updateCartItem(item.productId, 'quantity', 0)} className="text-rose-500 p-2"><Trash2 size={20}/></button>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-700 p-4 md:px-12 flex items-center justify-between h-24 z-[140]">
         <div>
            <p className="text-[10px] font-black text-slate-500 uppercase">Total Inversión</p>
            <p className="text-3xl font-black text-white">${finalTotal.toFixed(2)}</p>
         </div>
         <button onClick={finishPurchase} disabled={cart.length === 0 || !selectedSupplierId || isSaving} className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs flex items-center gap-3 shadow-2xl transition-all">
            {isSaving ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
            {isSaving ? 'GUARDANDO...' : 'REGISTRAR ENTRADA'}
         </button>
      </div>

      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-4">
           <div className="bg-[#1e293b] w-full max-w-md rounded-[3rem] p-10 border border-slate-700">
              <h3 className="text-xl font-black text-orange-500 mb-6 uppercase">Nuevo Proveedor</h3>
              <form onSubmit={async (e) => {
                 e.preventDefault();
                 setIsSaving(true);
                 try {
                   const fd = new FormData(e.currentTarget);
                   const s = { id: crypto.randomUUID(), name: fd.get('name') as string, rif: fd.get('rif') as string, phone: fd.get('phone') as string };
                   await dbService.put('suppliers', s);
                   setSuppliers(prev => [...prev, s]);
                   setSelectedSupplierId(s.id);
                   setIsSupplierModalOpen(false);
                 } catch (err) { alert("Error al guardar proveedor"); } finally { setIsSaving(false); }
              }} className="space-y-4">
                 <input name="name" placeholder="Razón Comercial" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 text-white" required />
                 <input name="rif" placeholder="RIF" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 text-white" />
                 <input name="phone" placeholder="WhatsApp" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 text-white" />
                 <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="flex-1 font-black text-slate-500 uppercase text-[10px]">Cerrar</button>
                   <button type="submit" disabled={isSaving} className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-[10px]">
                     {isSaving ? '...' : 'Guardar'}
                   </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;