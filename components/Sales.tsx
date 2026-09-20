import React, { useState } from 'react';
import { Plus, Search, Tag, ShoppingCart, Trash2, X, MessageCircle, DollarSign, Percent, CreditCard } from 'lucide-react';
import { Sale, Customer, Product, AppSettings, SaleItem, CompanyInfo, Seller } from '../types';
import { dbService } from '../db';
import { TicketModal } from './TicketModal';

interface Props {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  sellers: Seller[];
  settings: AppSettings;
  company: CompanyInfo;
}

const CATEGORIES = ['Todos', 'Víveres', 'Charcutería', 'Lácteos', 'Limpieza', 'Bebidas', 'Snacks', 'Otros'];

const Sales: React.FC<Props> = ({ sales, setSales, customers, setCustomers, products, setProducts, sellers, settings, company }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [ticketData, setTicketData] = useState<Sale | null>(null);

  // Credit and Discount options
  const [isCredit, setIsCredit] = useState(false);
  const [discountUSD, setDiscountUSD] = useState<number>(0);
  const [initialPaymentUSD, setInitialPaymentUSD] = useState<number>(0);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert('Sin existencias disponibles');
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
    if (!product) return;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    if (newQty > product.stock) {
      alert(`La cantidad excede el stock disponible (${product.stock})`);
      return;
    }
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, quantity: newQty } : item));
  };

  const subtotalUSD = cart.reduce((sum, item) => sum + (item.quantity * item.priceUSD), 0);
  const totalUSD = Math.max(0, subtotalUSD - discountUSD);
  const paidAmountUSD = isCredit ? Math.min(initialPaymentUSD, totalUSD) : totalUSD;
  const status = (isCredit && paidAmountUSD < totalUSD) ? 'pending' : 'paid';

  const finishSale = async () => {
    if (!selectedCustomerId) return alert('Seleccione un cliente para la venta');
    if (cart.length === 0) return alert('El carrito está vacío');

    const customer = customers.find(c => c.id === selectedCustomerId);
    const seller = sellers.find(s => s.id === selectedSellerId);

    const newSale: Sale = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Venta Rápida',
      customerAddress: customer?.address || '',
      sellerId: selectedSellerId,
      sellerName: seller?.name || 'Sistema',
      items: cart,
      totalUSD: totalUSD,
      totalBS: totalUSD * settings.exchangeRate,
      exchangeRate: settings.exchangeRate,
      status: status,
      discountUSD: discountUSD > 0 ? discountUSD : 0,
      initialPaymentUSD: isCredit ? paidAmountUSD : totalUSD,
      paidAmountUSD: paidAmountUSD
    };

    const updatedProducts = [...products];
    for (const item of cart) {
      const p = updatedProducts.find(prod => prod.id === item.productId);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
        await dbService.put('products', p);
      }
    }

    await dbService.put('sales', newSale);
    setSales(prev => [newSale, ...prev]);
    setProducts(updatedProducts);
    setTicketData(newSale);

    // Reset Form
    setIsModalOpen(false);
    setCart([]);
    setSelectedCustomerId('');
    setSelectedSellerId('');
    setIsCredit(false);
    setDiscountUSD(0);
    setInitialPaymentUSD(0);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black uppercase text-white">Ventas / Punto de Venta</h1>
          <p className="text-slate-400 text-xs">Gestión de facturación y tickets</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-105 text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 text-xs tracking-widest uppercase">
          <Plus size={20} /> INICIAR FACTURACIÓN
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sales.map(sale => (
          <div key={sale.id} className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-lg flex justify-between items-center gap-4 hover:border-orange-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sale.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <Tag size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-xs text-white leading-tight uppercase">{sale.customerName}</p>
                  {sale.status === 'pending' && (
                    <span className="text-[8px] font-black uppercase bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Crédito
                    </span>
                  )}
                </div>
                <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                  {new Date(sale.date).toLocaleDateString('es-VE')} • Vendido por: {sale.sellerName || 'Sistema'}
                </p>
              </div>
            </div>
            <div className="text-right flex-1">
              <p className="text-sm font-black text-white">${sale.totalUSD.toFixed(2)}</p>
              <p className="text-[8px] font-bold text-orange-500">{(sale.totalUSD * (sale.exchangeRate || settings.exchangeRate)).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</p>
            </div>
            <button onClick={() => setTicketData(sale)} className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-orange-500 hover:bg-slate-700 transition-colors">
              <MessageCircle size={16}/>
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a] z-[200] flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#1e293b] sticky top-0 z-[210]">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-xl text-white shadow-lg"><ShoppingCart size={20} /></div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Punto de Venta (POS)</h2>
             </div>
             <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={24}/></button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Products catalog section */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
               <div className="flex flex-col md:flex-row gap-3">
                 <select className="bg-[#1e293b] border border-slate-700 rounded-xl p-3 text-xs font-bold text-white outline-none" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input type="text" placeholder="Buscar producto por nombre o código..." className="w-full bg-[#1e293b] border border-slate-700 rounded-xl p-3 pl-10 text-xs font-bold text-white outline-none focus:border-orange-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                 </div>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredProducts.map(p => (
                    <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0} className={`p-4 bg-[#1e293b] border border-slate-700 rounded-2xl text-left hover:border-orange-500 transition-all ${p.stock <= 0 ? 'opacity-40 grayscale' : 'hover:scale-[1.02]'}`}>
                       <p className="font-black text-[10px] text-white line-clamp-2 h-7 mb-1 leading-tight uppercase">{p.name}</p>
                       <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs font-black text-emerald-400">${p.priceUSD.toFixed(2)}</p>
                            <p className="text-[7px] text-orange-400 font-bold">{(p.priceUSD * settings.exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</p>
                          </div>
                          <p className="text-[7px] font-black uppercase text-slate-500">Stock: {p.stock % 1 === 0 ? p.stock : p.stock.toFixed(1)}</p>
                       </div>
                    </button>
                  ))}
               </div>
            </div>

            {/* Checkout sidebar */}
            <div className="w-full md:w-96 bg-[#1e293b] border-l border-slate-700 p-6 flex flex-col shadow-2xl overflow-y-auto">
               <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-1 tracking-widest">Cliente</label>
                    <select className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold text-white outline-none mt-1" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                       <option value="">SELECCIONE CLIENTE...</option>
                       {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-1 tracking-widest">Vendedor</label>
                    <select className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs font-bold text-white outline-none mt-1" value={selectedSellerId} onChange={(e) => setSelectedSellerId(e.target.value)}>
                       <option value="">VENDEDOR...</option>
                       {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
               </div>

               {/* Cart items */}
               <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1 min-h-[140px] max-h-[220px]">
                  {cart.length === 0 ? (
                    <div className="h-full flex items-center justify-center border border-dashed border-slate-700 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-black">Carrito de compras vacío</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.productId} className="bg-[#0f172a] p-3 rounded-xl border border-slate-700/50">
                         <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-white leading-tight uppercase truncate max-w-[180px]">{item.name}</p>
                            <button onClick={() => removeFromCart(item.productId)} className="text-rose-500 hover:text-rose-400"><Trash2 size={12} /></button>
                         </div>
                         <div className="flex justify-between items-center">
                            <input
                              type="number" step="any"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0)}
                              className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-black text-orange-500"
                            />
                            <p className="font-black text-[10px] text-white">${(item.quantity * item.priceUSD).toFixed(2)}</p>
                         </div>
                      </div>
                    ))
                  )}
               </div>

               {/* Sale terms (Credit / Discount) */}
               <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-700 space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black uppercase text-slate-400">Venta a Crédito (CXC)</span>
                     <input type="checkbox" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} className="w-4 h-4 accent-orange-500 rounded cursor-pointer" />
                  </div>

                  {isCredit && (
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-500 uppercase">Abono Inicial (USD)</label>
                      <input type="number" step="0.01" value={initialPaymentUSD} onChange={(e) => setInitialPaymentUSD(parseFloat(e.target.value) || 0)} className="w-full bg-[#1e293b] border border-slate-700 rounded-xl p-2 text-xs font-black text-amber-400 outline-none" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase">Descuento Especial (USD)</label>
                    <input type="number" step="0.01" value={discountUSD} onChange={(e) => setDiscountUSD(parseFloat(e.target.value) || 0)} className="w-full bg-[#1e293b] border border-slate-700 rounded-xl p-2 text-xs font-black text-emerald-400 outline-none" />
                  </div>
               </div>

               {/* Total summary */}
               <div className="pt-4 border-t border-slate-700 space-y-3">
                  <div className="space-y-1">
                     <div className="flex justify-between text-[10px] text-slate-400 uppercase font-black">
                        <span>Subtotal:</span>
                        <span>${subtotalUSD.toFixed(2)}</span>
                     </div>
                     {discountUSD > 0 && (
                       <div className="flex justify-between text-[10px] text-emerald-400 uppercase font-black">
                          <span>Descuento:</span>
                          <span>-${discountUSD.toFixed(2)}</span>
                       </div>
                     )}
                     <div className="flex justify-between text-white font-black uppercase pt-1 border-t border-slate-800">
                        <span className="text-xs text-slate-400">Total a Pagar</span>
                        <span className="text-2xl text-orange-500 tracking-tighter">${totalUSD.toFixed(2)}</span>
                     </div>
                     <p className="text-[9px] text-slate-400 text-right font-bold">
                       {(totalUSD * settings.exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                     </p>
                  </div>

                  <button onClick={finishSale} disabled={cart.length === 0 || !selectedCustomerId} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:scale-[1.02] disabled:opacity-50 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-emerald-500/20">
                     PROCESAR FACTURA
                  </button>
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
