
import React, { useState, useMemo } from 'react';
import { Plus, ShoppingCart, Truck, Search, Box, Trash2, X, Tag, UserPlus, ArrowLeft, CheckCircle2, DollarSign, Wallet, PlusCircle, Edit3 } from 'lucide-react';
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

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    
    const newPurchase: Purchase = {
      id: editingPurchase?.id || crypto.randomUUID(),
      date: editingPurchase?.date || new Date().toISOString(),
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Proveedor',
      items: cart,
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
        // En compras, los decimales son fundamentales (ej: pesar pacas de granos)
        updatedProducts[idx] = { ...updatedProducts[idx], stock: updatedProducts[idx].stock + item.quantity, costUSD: item.costUSD, priceUSD: item.newSalePriceUSD };
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
    setIsCredit(false);
    setIsDiscount(false);
    setDiscountVal(0);
    setInitialPayment(0);
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
             <p className="text-slate-400 text-sm">Entrada de stock y gestión de proveedores</p>
          </div>
          <button onClick={() => { setEditingPurchase(null); setIsRegisterMode(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-black py-4 px-8 rounded-2xl flex items-center gap-2 shadow-lg active:scale-95 transition-all">
            <Plus size={24} /> NUEVA COMPRA
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
           {purchases.map(p => {
             const balance = p.totalUSD - (p.paidAmountUSD || 0);
             return (
               <div key={p.id} className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-orange-500/30 transition-all">
                  <div className="flex items-center gap-4 flex-1">
                     <div className="p-4 bg-slate-800 rounded-2xl text-orange-500"><Truck size={28} /></div>
                     <div>
                        <p className="font-bold text-lg text-white leading-tight">{p.supplierName}</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{new Date(p.date).toLocaleString()} • {p.items.length} productos</p>
                     </div>
                  </div>
                  <div className="text-center md:text-right px-8">
                     <p className="text-2xl font-black text-white leading-none">${p.totalUSD.toFixed(2)}</p>
                     <p className="text-xs font-bold text-orange-500 mt-1">{(p.totalUSD * settings.exchangeRate).toLocaleString()} Bs</p>
                     {p.status === 'pending' && (
                        <p className="text-[10px] font-black text-rose-500 uppercase mt-2">Saldo Deudor: ${balance.toFixed(2)}</p>
                     )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                       {p.status === 'paid' ? 'Liquidado' : 'Pendiente'}
                    </span>
                    <button onClick={() => handleEdit(p)} className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-all">
                       <Edit3 size={18}/>
                    </button>
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0f172a] z-[120] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="p-6 border-b border-slate-700 bg-[#1e293b] flex justify-between items-center sticky top-0 z-[130]">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsRegisterMode(false)} className="p-2 hover:bg-slate-700 rounded-full text-white transition-colors"><ArrowLeft size={28}/></button>
              <div>
                 <h2 className="text-xl font-black uppercase tracking-tighter text-white">{editingPurchase ? 'Modificar' : 'Nueva'} Carga de Inventario</h2>
                 <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Soporte para Pesaje Decimal</p>
              </div>
           </div>
        </div>

        <div className="max-w-6xl mx-auto p-6 space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 shadow-xl">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Proveedor Principal</label>
                 <div className="flex gap-2">
                    <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="flex-1 bg-[#0f172a] border border-slate-700 rounded-2xl p-4 font-bold outline-none text-white">
                       <option value="">ELIJA PROVEEDOR...</option>
                       {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={() => setIsSupplierModalOpen(true)} className="p-4 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20"><UserPlus size={24} /></button>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Agregar Producto</label>
                 <div className="flex gap-2">
                    <div className="relative flex-1">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                       <input type="text" placeholder="SKU o Nombre..." className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 pl-12 font-bold outline-none text-white focus:border-orange-500" value={productSearch} onChange={(e) => {
                          setProductSearch(e.target.value);
                          const f = products.find(x => x.name.toLowerCase() === e.target.value.toLowerCase() || x.sku === e.target.value);
                          if (f) addToCart(f);
                       }} list="products-list-purch-v2" />
                       <datalist id="products-list-purch-v2">{products.map(p => <option key={p.id} value={p.name}>{p.sku}</option>)}</datalist>
                    </div>
                    <button onClick={() => setIsProductModalOpen(true)} className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20"><PlusCircle size={24} /></button>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              {cart.map(item => (
                <div key={item.productId} className="bg-[#1e293b] p-6 rounded-[2rem] border border-slate-700 flex flex-col md:flex-row gap-6 animate-in zoom-in-95 items-center">
                   <div className="flex-1 w-full text-left">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Artículo</p>
                      <h4 className="font-black text-white text-sm">{item.name}</h4>
                   </div>
                   <div className="grid grid-cols-3 gap-3 w-full md:w-[450px]">
                      <div className="text-center"><label className="text-[8px] font-black text-slate-500 uppercase">Cantidad</label><input type="number" step="any" value={item.quantity} onChange={(e) => updateCartItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-center text-xs font-black text-orange-500"/></div>
                      <div className="text-center"><label className="text-[8px] font-black text-slate-500 uppercase">Costo USD</label><input type="number" step="0.01" value={item.costUSD} onChange={(e) => updateCartItem(item.productId, 'costUSD', parseFloat(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-center text-xs font-black text-white"/></div>
                      <div className="text-center"><label className="text-[8px] font-black text-slate-500 uppercase">Nuevo PVP</label><input type="number" step="0.01" value={item.newSalePriceUSD} onChange={(e) => updateCartItem(item.productId, 'newSalePriceUSD', parseFloat(e.target.value) || 0)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-center text-xs font-black text-emerald-500"/></div>
                   </div>
                   <button onClick={() => updateCartItem(item.productId, 'quantity', 0)} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-full transition-colors"><Trash2 size={20}/></button>
                </div>
              ))}
              
              <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl">
                 <div className={`p-6 rounded-3xl border transition-all ${isDiscount ? 'bg-orange-500/10 border-orange-500' : 'bg-[#0f172a] border-slate-700'} space-y-4`}>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-black uppercase tracking-widest text-slate-300">Descuento del Proveedor</span>
                       <input type="checkbox" checked={isDiscount} onChange={(e) => setIsDiscount(e.target.checked)} className="w-5 h-5 accent-orange-500" />
                    </div>
                    {isDiscount && <input type="number" step="0.01" value={discountVal} onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)} className="w-full bg-[#1e293b] border border-orange-500/30 rounded-2xl p-4 font-black text-orange-500 outline-none" placeholder="Monto total ($)" />}
                 </div>
                 <div className={`p-6 rounded-3xl border transition-all ${isCredit ? 'bg-rose-500/10 border-rose-500' : 'bg-[#0f172a] border-slate-700'} space-y-4`}>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-black uppercase tracking-widest text-slate-300">Compra por Pagar (Crédito)</span>
                       <input type="checkbox" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} className="w-5 h-5 accent-rose-500" />
                    </div>
                    {isCredit && <input type="number" step="0.01" value={initialPayment} onChange={(e) => setInitialPayment(parseFloat(e.target.value) || 0)} className="w-full bg-[#1e293b] border border-rose-500/30 rounded-2xl p-4 font-black text-rose-500 outline-none" placeholder="Pago anticipado ($)" />}
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-700 p-4 md:px-12 flex flex-row items-center justify-between h-24 md:h-28 z-[140] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
         <div className="flex gap-4 md:gap-10 items-center">
            <div>
               <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Compra USD</p>
               <p className="text-3xl font-black text-white leading-none">${finalTotal.toFixed(2)}</p>
            </div>
            <div className="bg-[#0f172a] px-6 py-3 rounded-2xl border border-slate-700 hidden sm:block">
               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 text-right">Inversión en Bs</p>
               <p className="text-xl font-black text-white leading-none text-right">{(finalTotal * settings.exchangeRate).toLocaleString()} Bs</p>
            </div>
         </div>
         <button onClick={finishPurchase} disabled={cart.length === 0 || !selectedSupplierId} className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 text-white px-8 md:px-14 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center gap-3 shadow-2xl transition-all">
            <CheckCircle2 size={24} /> {editingPurchase ? 'ACTUALIZAR CARGA' : 'REGISTRAR INGRESO'}
         </button>
      </div>

      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-4">
           <div className="bg-[#1e293b] w-full max-w-md rounded-[3rem] p-10 border border-slate-700 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-black text-orange-500 mb-6 uppercase tracking-widest">Nuevo Proveedor</h3>
              <form onSubmit={async (e) => {
                 e.preventDefault();
                 const fd = new FormData(e.currentTarget);
                 const s = { id: crypto.randomUUID(), name: fd.get('name') as string, rif: fd.get('rif') as string, phone: fd.get('phone') as string };
                 await dbService.put('suppliers', s);
                 setSuppliers(prev => [...prev, s]);
                 setSelectedSupplierId(s.id);
                 setIsSupplierModalOpen(false);
              }} className="space-y-4">
                 <input name="name" placeholder="Razón Comercial" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 font-bold outline-none text-white" required />
                 <input name="rif" placeholder="RIF" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 font-bold outline-none text-white" required />
                 <input name="phone" placeholder="WhatsApp" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 font-bold outline-none text-white" required />
                 <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="flex-1 font-black text-slate-500 uppercase text-[10px]">Cerrar</button>
                   <button type="submit" className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Guardar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-4">
           <div className="bg-[#1e293b] w-full max-w-md rounded-[3rem] p-10 border border-slate-700 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-black text-emerald-500 mb-6 uppercase tracking-widest">Crear Ficha</h3>
              <form onSubmit={async (e) => {
                 e.preventDefault();
                 const fd = new FormData(e.currentTarget);
                 const p = { id: crypto.randomUUID(), name: fd.get('name') as string, sku: fd.get('sku') as string, priceUSD: parseFloat(fd.get('p') as string) || 0, costUSD: parseFloat(fd.get('c') as string) || 0, stock: 0, minStock: 5 };
                 await dbService.put('products', p);
                 setProducts(prev => [...prev, p]);
                 addToCart(p);
                 setIsProductModalOpen(false);
              }} className="space-y-4">
                 <input name="name" placeholder="Descripción del producto" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 font-bold outline-none text-white" required />
                 <input name="sku" placeholder="Cód. Interno" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 font-bold outline-none text-white" required />
                 <div className="grid grid-cols-2 gap-4">
                   <input name="c" type="number" step="0.01" placeholder="Costo $" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 font-bold outline-none text-white" required />
                   <input name="p" type="number" step="0.01" placeholder="PVP $" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 font-bold outline-none text-white" required />
                 </div>
                 <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 font-black text-slate-500 uppercase text-[10px]">Cerrar</button>
                   <button type="submit" className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Agregar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default Purchases;
