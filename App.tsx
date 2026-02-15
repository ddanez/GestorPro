
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Tag, Users, Truck, 
  HandCoins, Wallet, BarChart3, Settings as SettingsIcon, Menu, X, UserCheck
} from 'lucide-react';
import { AppTab, CompanyInfo, AppSettings, Product, Customer, Supplier, Sale, Purchase, Seller } from './types';
import { dbService } from './db';

import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Purchases from './components/Purchases';
import Contacts from './components/Contacts';
import Accounts from './components/Accounts';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Splash from './components/Splash';
import ExchangeRateModal from './components/ExchangeRateModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [showSplash, setShowSplash] = useState(true);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [company, setCompany] = useState<CompanyInfo>({
    name: "D'Danez Distribuciones",
    rif: "J-00000000-0",
    address: "Calle Principal",
    phone: "0412-0000000"
  });
  
  const [settings, setSettings] = useState<AppSettings>({
    exchangeRate: 45.5,
    lastRateUpdate: '',
    darkMode: true,
    showLogoOnTicket: true,
    showIvaOnTicket: true,
    includeQr: false,
    ticketFooter: "¡Gracias por su compra!\nNo se aceptan devoluciones sin factura."
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const loadData = useCallback(async () => {
    try {
      await dbService.init();
      const [p, c, s, sa, pu, st, sel] = await Promise.all([
        dbService.getAll<Product>('products'),
        dbService.getAll<Customer>('customers'),
        dbService.getAll<Supplier>('suppliers'),
        dbService.getAll<Sale>('sales'),
        dbService.getAll<Purchase>('purchases'),
        dbService.getAll<any>('settings'),
        dbService.getAll<Seller>('sellers')
      ]);

      setProducts(p || []);
      setCustomers(c || []);
      setSuppliers(s || []);
      setSellers(sel || []);
      setSales((sa || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setPurchases((pu || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      const savedSettings = st.find((s: any) => s.id === 'app_settings');
      const savedCompany = st.find((s: any) => s.id === 'company_info');

      if (savedSettings) setSettings(savedSettings);
      if (savedCompany) setCompany(savedCompany);

      const today = new Date().toISOString().split('T')[0];
      if (!savedSettings || savedSettings.lastRateUpdate !== today) {
        setShowExchangeModal(true);
      }
    } catch (err) {
      console.error("Error al cargar datos", err);
    } finally {
      setTimeout(() => setShowSplash(false), 2000);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdateExchangeRate = async (rate: number) => {
    const newSettings = { 
      ...settings, 
      exchangeRate: rate, 
      lastRateUpdate: new Date().toISOString().split('T')[0] 
    };
    setSettings(newSettings);
    await dbService.put('settings', { ...newSettings, id: 'app_settings' });
    setShowExchangeModal(false);
  };

  const navItems = [
    { id: AppTab.DASHBOARD, label: 'DASHBOARD', icon: LayoutDashboard },
    { id: AppTab.INVENTORY, label: 'INVENTARIO', icon: Package },
    { id: AppTab.SALES, label: 'VENTAS POS', icon: Tag },
    { id: AppTab.PURCHASES, label: 'COMPRAS', icon: ShoppingCart },
    { id: AppTab.CUSTOMERS, label: 'CLIENTES', icon: Users },
    { id: AppTab.SUPPLIERS, label: 'PROVEEDORES', icon: Truck },
    { id: AppTab.SELLERS, label: 'VENDEDORES', icon: UserCheck },
    { id: AppTab.CXC, label: 'CXC (DEUDAS)', icon: HandCoins },
    { id: AppTab.CXP, label: 'CXP (PAGOS)', icon: Wallet },
    { id: AppTab.REPORTS, label: 'REPORTES', icon: BarChart3 },
    { id: AppTab.SETTINGS, label: 'AJUSTES', icon: SettingsIcon },
  ];

  const currentTabLabel = navItems.find(item => item.id === activeTab)?.label || 'GESTIÓN';

  if (showSplash) return <Splash company={company} />;

  return (
    <div className={`min-h-screen ${settings.darkMode ? 'bg-[#0f172a] text-white' : 'bg-slate-50 text-slate-900'} flex flex-col md:flex-row`}>
      <div className="md:hidden flex items-center justify-between p-4 bg-[#1e293b] border-b border-slate-700 sticky top-0 z-50 h-14">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-300">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="font-black text-[10px] truncate uppercase tracking-widest text-orange-500">{currentTabLabel}</span>
        <div className="w-8"></div>
      </div>

      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-[#1e293b] border-r border-slate-700 transition-transform duration-300 ease-in-out flex flex-col h-screen`}>
        <div className="p-6 border-b border-slate-700/50 flex items-center gap-3">
           <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Package size={18} />
           </div>
           <span className="font-black text-xs tracking-tighter uppercase italic">Gestor<span className="text-orange-500">PRO</span></span>
        </div>
        <nav className="px-3 space-y-1 flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <main className="flex-1 overflow-y-auto bg-[#0f172a]">
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
          {activeTab === AppTab.DASHBOARD && <Dashboard sales={sales} customers={customers} products={products} settings={settings} onNavigate={setActiveTab} />}
          {activeTab === AppTab.INVENTORY && <Inventory products={products} setProducts={setProducts} settings={settings} />}
          {activeTab === AppTab.SALES && <Sales sales={sales} setSales={setSales} customers={customers} setCustomers={setCustomers} products={products} setProducts={setProducts} sellers={sellers} settings={settings} company={company} />}
          {activeTab === AppTab.PURCHASES && <Purchases purchases={purchases} setPurchases={setPurchases} suppliers={suppliers} setSuppliers={setSuppliers} products={products} setProducts={setProducts} settings={settings} />}
          {activeTab === AppTab.CUSTOMERS && <Contacts type="customers" items={customers} setItems={setCustomers} relatedData={sales} settings={settings} />}
          {activeTab === AppTab.SUPPLIERS && <Contacts type="suppliers" items={suppliers} setItems={setSuppliers} relatedData={purchases} settings={settings} />}
          {activeTab === AppTab.SELLERS && <Contacts type="sellers" items={sellers} setItems={setSellers} relatedData={sales} settings={settings} />}
          {activeTab === AppTab.CXC && <Accounts type="cxc" items={sales.filter(s => s.status === 'pending')} settings={settings} company={company} onUpdate={loadData} />}
          {activeTab === AppTab.CXP && <Accounts type="cxp" items={purchases.filter(p => p.status === 'pending')} settings={settings} company={company} onUpdate={loadData} />}
          {activeTab === AppTab.REPORTS && <Reports sales={sales} purchases={purchases} settings={settings} />}
          {activeTab === AppTab.SETTINGS && <Settings company={company} setCompany={setCompany} settings={settings} setSettings={setSettings} />}
        </div>
      </main>

      {showExchangeModal && <ExchangeRateModal onSave={handleUpdateExchangeRate} currentRate={settings.exchangeRate} />}
    </div>
  );
};

export default App;
