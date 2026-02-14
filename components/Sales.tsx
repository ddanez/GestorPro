
import React, { useState, useMemo } from 'react';
import { Plus, Search, Tag, UserPlus, ShoppingCart, Trash2, X, Box, CheckCircle2, MessageCircle, DollarSign, Wallet, PlusCircle } from 'lucide-react';
import { Sale, Customer, Product, AppSettings, SaleItem, CompanyInfo } from '../types';
import { dbService } from '../db';
import { TicketModal } from './TicketModal';

interface Props {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: AppSettings;
  company: CompanyInfo;
}

const Sales: React.FC<Props> = ({ sales, setSales, customers, setCustomers, products, setProducts, settings, company }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [isDiscount, setIsDiscount] = useState(false);
  const [discountVal, setDiscountVal] = useState(0);
  const [initialPayment, setInitialPayment] = useState(0);
  const [ticketData, setTicketData] = useState<Sale | null>(null);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert('Sin existencias');
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, priceUSD: product.priceUSD }];
    });
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.productId !== productId));
  const updateQuantity = (productId: string, newQty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product || newQty <= 0 || newQty > product.stock) return;
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, quantity: newQty } : item));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.priceUSD), 0);
  const finalTotal = subtotal - (isDiscount ? discountVal : 0);

  const finishSale = async () => {
    if (!selectedCustomerId) return alert('Seleccione un cliente');
    if (cart.length === 0) return alert('Carrito vacío');
    const customer = customers.find(c => c.id === selectedCustomerId);
    const newSale: Sale = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Venta Rápida',
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
      const p = updatedProducts.find(prod => prod.id === item.productId);
      if (p) {
        p.stock -= item.quantity;
        await dbService.put('products', p);
      }
    }

    await dbService.put('sales', newSale);
    setSales(prev => [newSale, ...prev]);
    setProducts(updatedProducts);
    setTicketData(newSale);
    setIsModalOpen(false);
    setCart([]);
    setSelectedCustomerId('');
    setSearchTerm('');
    setIsCredit(false);
    setIsDiscount(false);
    setDiscountVal(0);
    setInitialPayment(0);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-end">
        <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white font-black py-3 px-8 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 text-xs tracking-widest">
          <Plus size={20} /> NUEVA VENTA
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sales.map(sale => (
          <div key={sale.id} className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-lg flex justify-between items-center gap-4 hover:border-orange-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sale.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                <Tag size={20} />
              </div>
              <div>
                <p className="font-black text-xs text-white leading-tight uppercase">{sale.customerName}</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase">{new Date(sale.date).toLocaleDateString()} • {sale.items.length} items</p>
              </div>
            </div>
            <div className="text-right flex-1">
              <p className="text-sm font-black text-white">${sale.totalUSD.toFixed(2)}</p>
              <p className="text-[8px] font-bold text-orange-500">{(sale.totalUSD * (sale.exchangeRate || settings.exchangeRate)).toLocaleString()} Bs</p>
            </div>
            <button onClick={() => setTicketData(sale)} className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-orange-500"><MessageCircle size={16}/></button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a] z-[200] flex flex-col animate-in fade-in duration-300">
          <div className="flex-1 overflow-y-auto pb-28">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#1e293b] sticky top-0 z-[210]">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-xl text-white shadow-lg"><ShoppingCart size={20} /></div>
                  <h2 className="text-sm font-black uppercase tracking-widest">Facturación POS</h2>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400"><X size={24}/></button>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#1e293b] p-4 rounded-2xl border border-slate-700">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Cliente</label>
                       <div className="flex gap-2">
                          <select className="flex-1 bg-[#0f172a] border border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                             <option value="">ELIJA...</option>
                             {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <button onClick={() => setIsCustomerModalOpen(true)} className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20"><UserPlus size={18} /></button>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Búsqueda</label>
                       <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <input type="text" placeholder="SKU o Nombre..." className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-2.5 pl-10 text-xs font-bold outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                     {filteredProducts.map(p => (
                       <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0} className={`p-4 bg-[#1e293b] border border-slate-700 rounded-2xl text-left hover:border-orange-500 transition-all ${p.stock <= 0 ? 'opacity-40 grayscale' : 'hover:scale-[1.02]'}`}>
                          <p className="font-black text-[10px] text-white line-clamp-2 h-7 mb-1 leading-tight uppercase">{p.name}</p>
                          <div className="border-t border-slate-700/50 pt-2 flex justify-between items-end">
                             <div>
                               <p className="text-xs font-black text-emerald-400 leading-none">${p.priceUSD.toFixed(2)}</p>
                             </div>
                             <p className="text-[7px] font-black uppercase text-slate-500">S: {p.stock % 1 === 0 ? p.stock : p.stock.toFixed(1)}</p>
                          </div>
                       </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-xl flex flex-col h-[350px]">
                     <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Items en Carrito</h3>
                     <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {cart.map(item => (
                          <div key={item.productId} className="bg-[#0f172a] p-3 rounded-xl border border-slate-700/50">
                             <div className="flex justify-between items-start mb-1">
                                <p className="text-[9px] font-black text-white leading-tight uppercase">{item.name}</p>
                                <button onClick={() => removeFromCart(item.productId)} className="text-rose-500"><Trash2 size={12} /></button>
                             </div>
                             <div className="flex justify-between items-center">
                                <input 
                                  type="number" step="any" 
                                  value={item.quantity} 
                                  onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0)} 
                                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-black text-orange-500 outline-none"
                                />
                                <p className="font-black text-[10px] text-white">${(item.quantity * item.priceUSD).toFixed(2)}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-xl space-y-3">
                     <div className="flex items-center justify-between text-[10px] font-black uppercase px-2">
                        <span className="text-slate-400">Total USD</span>
                        <span className="text-white text-xl">${finalTotal.toFixed(2)}</span>
                     </div>
                     <button onClick={finishSale} disabled={cart.length === 0 || !selectedCustomerId} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">
                        FINALIZAR VENTA
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      <TicketModal isOpen={!!ticketData} onClose={() => setTicketData(null)} data={ticketData} company={company} settings={settings} />
    </div>
  );
};

export default Sales;
