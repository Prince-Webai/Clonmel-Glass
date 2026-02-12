import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Product, User, UserRole } from '../types';
import {
  Trash2, Edit2, Plus, Package, Users, Settings,
  Upload, Search, Database, RefreshCcw, ShieldCheck,
  Terminal, Cloud, Code, Copy, AlertTriangle, X, ChevronLeft
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { parseProductCSV } from '../utils/csvParser';

const Admin = () => {
  const {
    products, addProduct, updateProduct, deleteProduct,
    users, addUser, deleteUser, user: currentUser,
    companyLogo, setCompanyLogo, isSyncing, databaseError, refreshDatabase,
    currentView
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'USERS'>(currentView === 'USERS' ? 'USERS' : 'PRODUCTS');
  const [activeCompany, setActiveCompany] = useState<'clonmel' | 'mirrorzone'>('clonmel');
  /* Secondary authentication removed as per request */

  useEffect(() => {
    if (currentView === 'USERS') setActiveTab('USERS');
    if (currentView === 'PRODUCTS') setActiveTab('PRODUCTS');
  }, [currentView]);
  const [syncLog, setSyncLog] = useState<{ msg: string, time: string }[]>([]);
  const [showSqlGuide, setShowSqlGuide] = useState(databaseError);

  // Product Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pUnit, setPUnit] = useState('sqm');

  const [pCategory, setPCategory] = useState('Clear Glass');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // User Form State
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState<UserRole>(UserRole.USER);

  useEffect(() => {
    if (isSyncing) {
      setSyncLog(prev => [{
        msg: `Synchronizing with remote cloud...`,
        time: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 5));
    }
  }, [isSyncing]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    const list = Array.from(cats);
    if (!list.includes('Clear Glass')) list.push('Clear Glass');
    if (!list.includes('Toughened')) list.push('Toughened');
    if (!list.includes('Mirrors')) list.push('Mirrors');

    return ['All', ...list.sort()];
  }, [products]);

  const STANDARD_GLASS_CATEGORIES = ['Clear Glass', 'Toughened', 'Laminated', 'Double Glazed', 'Fire Resistant', 'Obscure', 'Textured', 'Tinted'];

  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const nameMatch = String(p.name).toLowerCase().includes(productSearch.toLowerCase());
      const idMatch = String(p.id).toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return (nameMatch || idMatch) && matchesCategory;
    });
  }, [products, productSearch, categoryFilter]);

  // Product Import State
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const { products: importedProducts, headers, errors } = parseProductCSV(text);

        if (importedProducts.length === 0) {
          showToast(`No valid products found.\n\nDetected Headers: ${headers.join(', ')}\n\nRequired: 'Name' and 'Price'.\nPlease check your CSV formatting.`, 'error', 5000);
          if (errors.length > 0) console.error("CSV Parsing Errors:", errors);
          return;
        }

        if (confirm(`Found ${importedProducts.length} products. Import to ${activeCompany === 'mirrorzone' ? 'Mirrorzone' : 'Clonmel Glass'}?`)) {
          let importedCount = 0;
          let errorCount = 0;

          showToast(`Starting import of ${importedProducts.length} products...`, 'info');

          for (const p of importedProducts) {
            try {
              const newProduct: Product = {
                id: `P-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: p.name || 'Unknown Product',
                price: typeof p.price === 'string' ? parseFloat(String(p.price).replace(/[^0-9.-]+/g, '')) : p.price,
                unit: p.unit || (activeCompany === 'mirrorzone' ? 'pcs' : 'sqm'),
                category: p.category || (activeCompany === 'mirrorzone' ? 'Mirrors' : 'Clear Glass'),
                description: p.description || p.sku || `Imported ${activeCompany} Product`,
                company: activeCompany
              };
              await addProduct(newProduct);
              importedCount++;
            } catch (err) {
              console.error('Failed to import product:', p, err);
              errorCount++;
            }
          }
          if (errorCount > 0) {
            showToast(`Import Complete.\n\nSuccess: ${importedCount}\nFailed: ${errorCount}`, 'warning', 5000);
          } else {
            showToast(`Successfully imported ${importedCount} products.`, 'success');
          }
        }
      } catch (err: any) {
        console.error('Import error:', err);
        showToast(`Failed to process CSV file: ${err.message}`, 'error');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  if (currentUser?.role !== UserRole.ADMIN) {
    return <div className="p-20 text-center text-slate-500 font-black uppercase tracking-widest">Access Restricted to Administrators</div>;
  }

  // --- Bulk Selection State ---
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Reset selection when changing tabs or companies
  useEffect(() => {
    setSelectedProducts(new Set());
  }, [activeCompany, activeTab, categoryFilter, productSearch]);

  const toggleProductSelection = (id: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedProducts(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProducts(new Set());
    } else {
      const allIds = filteredProducts
        .filter(p => (p.company === activeCompany || (!p.company && (activeCompany === 'mirrorzone' ? p.category === 'Mirrors' : p.category !== 'Mirrors'))))
        .map(p => p.id);
      setSelectedProducts(new Set(allIds));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedProducts.size} products? This cannot be undone.`)) {
      let deletedCount = 0;
      for (const id of selectedProducts) {
        try {
          await deleteProduct(id);
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete product ${id}`, err);
        }
      }
      setSelectedProducts(new Set());
      alert(`Successfully deleted ${deletedCount} products.`);
    }
  };

  // --- Product Handlers ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pPrice) return;

    // Auto-append "Mirror" if in MirrorZone and not present (to ensure it stays in MirrorZone list)
    // REMOVED: We now use explicit 'company' field.
    const finalCategory = pCategory;

    const productData: Product = {
      id: editingProduct ? editingProduct.id : `P-${Date.now().toString().slice(-4)}`,
      name: pName,
      price: parseFloat(pPrice),
      unit: pUnit,
      description: `Commercial Grade ${finalCategory}`,
      category: finalCategory,
      company: activeCompany // Explicitly set company
    };

    try {
      if (editingProduct) {
        await updateProduct(productData);
      } else {
        await addProduct(productData);
      }
      setEditingProduct(null);
      setPName(''); setPPrice(''); setPCategory('Clear Glass'); setPUnit('sqm');
    } catch (err: any) {
      console.error("Save Product Error:", err);
      alert(`Error saving product: ${err.message || 'Unknown DB Error'}. \n\nCheck if the database migration was run.`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Permanently remove this item from the catalog?")) {
      try {
        await deleteProduct(id);
      } catch (err) {
        alert("Deletion failed.");
      }
    }
  };

  // --- User Handlers ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName || !uEmail) return;

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: uName,
      email: uEmail,
      role: uRole,
      avatar: `https://i.pravatar.cc/150?u=${uEmail}`
    };

    try {
      await addUser(newUser);
      setUName(''); setUEmail(''); setURole(UserRole.USER);
    } catch (err) {
      alert("Failed to add user to database.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    const userName = userToDelete?.name || 'this user';

    if (window.confirm(`⚠️ DELETE USER PROFILE\n\nAre you sure you want to permanently delete "${userName}"?\n\nThis will:\n• Remove the user from the database\n• Revoke all system access\n• Delete the user profile from the site\n\nThis action CANNOT be undone.`)) {
      try {
        await deleteUser(id);
        alert(`✓ User "${userName}" has been successfully deleted from the system and database.`);
      } catch (err) {
        alert(`✗ Failed to delete user. Please try again or check your database connection.`);
        console.error('Delete user error:', err);
      }
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sqlSetupCode = `-- 1. CREATE TABLES (ONLY IF THEY DON'T EXIST)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  unit TEXT DEFAULT 'sqm',
  category TEXT DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC NOT NULL,
  status TEXT NOT NULL,
  date_issued TEXT NOT NULL,
  due_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  last_reminder_sent TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  avatar TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 2. UPDATE EXISTING SCHEMA (ADD MISSING COLUMNS)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_sent TEXT;

-- 3. SEED INITIAL ADMIN
INSERT INTO users (id, name, email, role, avatar)
VALUES ('u1', 'Admin User', 'admin@clonmel.com', 'ADMIN', 'https://i.pravatar.cc/150?u=admin')
ON CONFLICT (email) DO NOTHING;

-- 4. PERMISSIONS (DISABLE RLS FOR DEVELOPMENT/TESTING)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;`;



  // Show password gate if not authenticated


  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">System Engine</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Node Instance: azyeptjbktvkqiigotbi</p>
        </div>
        <div className={`flex items-center space-x-4 text-[10px] font-black border-2 px-6 py-2.5 rounded-2xl shadow-sm ${databaseError ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-brand-50 border-brand-100 text-brand-600'}`}>
          <Cloud size={14} className={databaseError ? 'text-rose-400' : 'text-brand-500'} />
          <span className="uppercase tracking-[0.2em]">Remote Status: {databaseError ? 'SCHEMA ERROR' : 'LIVE & SECURE'}</span>
        </div>
      </div>

      <div className="flex space-x-10 border-b-2 border-slate-100">
        <button onClick={() => setActiveTab('PRODUCTS')} className={`pb-5 px-1 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all ${activeTab === 'PRODUCTS' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-900'}`}>Catalog Manager</button>
        <button onClick={() => setActiveTab('USERS')} className={`pb-5 px-1 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all ${activeTab === 'USERS' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-900'}`}>Permissions</button>
      </div>

      {/* Bulk Action Bar */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="text-xs font-black uppercase tracking-widest">{selectedProducts.size} Items Selected</div>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider"
          >
            <Trash2 size={16} /> Delete Selected
          </button>
          <button
            onClick={() => setSelectedProducts(new Set())}
            className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {activeTab === 'PRODUCTS' && (
        <div className="space-y-10">
          {/* ... existing company toggle and form ... */}
          {/* Company Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setActiveCompany('clonmel');
                setPCategory('Clear Glass');
                setCategoryFilter('All'); // Show all Clonmel products
              }}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 ${activeCompany === 'clonmel'
                ? 'bg-white border-white shadow-xl scale-[1.02]'
                : 'bg-red-600/5 border-red-600/10 hover:bg-red-600/10'
                }`}
            >
              <div className={`text-center ${activeCompany === 'clonmel' ? 'text-red-600' : 'text-slate-400'}`}>
                <div className="text-xl font-black mb-1">CLONMEL GLASS</div>
                <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest">General Catalog</div>
                {activeCompany === 'clonmel' && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Active
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={() => {
                setActiveCompany('mirrorzone');
                setPCategory('Mirrors');
                setPUnit('pcs'); // Mirrors sold per piece
                setCategoryFilter('All'); // Show all MirrorZone products
              }}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 ${activeCompany === 'mirrorzone'
                ? 'bg-white border-white shadow-xl scale-[1.02]'
                : 'bg-slate-900/5 border-slate-900/10 hover:bg-slate-900/10'
                }`}
            >
              <div className={`text-center ${activeCompany === 'mirrorzone' ? 'text-slate-900' : 'text-slate-400'}`}>
                <div className="text-xl font-black mb-1">MIRRORZONE</div>
                <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Mirrors Collection</div>
                {activeCompany === 'mirrorzone' && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-slate-100 text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                    Active
                  </div>
                )}
              </div>
            </button>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl animate-in slide-in-from-top-4 duration-500">
            {/* ... form content ... */}
            <div className="flex items-center justify-between mb-8 border-b-2 border-slate-50 pb-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${editingProduct ? 'bg-amber-500 shadow-amber-500/20' : activeCompany === 'mirrorzone' ? 'bg-slate-900 shadow-slate-900/20' : 'bg-red-600 shadow-red-600/20'}`}>
                  {editingProduct ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-widest leading-none">
                    {editingProduct ? 'Edit Catalog Entry' : `Add to ${activeCompany === 'mirrorzone' ? 'Mirrorzone' : 'Clonmel Glass'}`}
                  </h3>
                </div>
              </div>
              {editingProduct && (
                <button onClick={() => { setEditingProduct(null); setPName(''); setPPrice(''); }} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                  <X size={20} />
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="md:col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Display Name</label>
                <input type="text" placeholder={activeCompany === 'mirrorzone' ? "e.g. 6MM ANTIQUE MIRROR" : "e.g. 10MM TOUGH SATIN"} required value={pName} onChange={e => setPName(e.target.value)} className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-brand-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Unit Price (€)</label>
                <input type="number" step="0.01" required placeholder="0.00" value={pPrice} onChange={e => setPPrice(e.target.value)} className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-brand-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Classification</label>
                <div className="relative">
                  <input
                    type="text"
                    value={pCategory}
                    onChange={e => setPCategory(e.target.value)}
                    onFocus={() => setShowCategoryDropdown(true)}
                    className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl pl-6 pr-10 py-4 text-sm font-black focus:border-brand-500 outline-none transition-all"
                    placeholder={activeCompany === 'mirrorzone' ? "Mirrors" : "e.g. Clear Glass"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500"
                  >
                    <ChevronLeft size={20} className={`transform transition-transform ${showCategoryDropdown ? '-rotate-90' : 'rotate-0'}`} />
                  </button>

                  {showCategoryDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCategoryDropdown(false)} />
                      <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border-2 border-slate-200 shadow-2xl max-h-80 overflow-y-auto animate-in zoom-in-95 duration-100">
                        <div className="py-2">
                          {categories.filter(c => c !== 'All').map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => { setPCategory(cat); setShowCategoryDropdown(false); }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-bold text-slate-700 hover:text-brand-600 transition-colors border-b border-slate-50 last:border-0"
                            >
                              {cat}
                            </button>
                          ))}

                          {pCategory && !categories.includes(pCategory) && (
                            <button
                              type="button"
                              onClick={() => setShowCategoryDropdown(false)}
                              className="w-full text-left px-4 py-3 bg-brand-50 hover:bg-brand-100 text-sm font-black text-brand-600 transition-colors flex items-center gap-2 border-t-2 border-brand-100"
                            >
                              <Plus size={14} />
                              <span>Add "{pCategory}" as new</span>
                            </button>
                          )}

                          <div className="px-4 py-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-50 mt-1 bg-slate-50/50">
                            Type in box to add custom...
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={isSyncing} className={`flex-1 flex items-center justify-center gap-3 font-black py-4 rounded-2xl transition-all disabled:opacity-50 shadow-2xl uppercase text-[10px] tracking-[0.2em] ${editingProduct ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20' : activeCompany === 'mirrorzone' ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'}`}>
                  {isSyncing ? <RefreshCcw className="animate-spin" size={16} /> : editingProduct ? <Edit2 size={16} /> : <Plus size={16} />}
                  {editingProduct ? 'Apply Edit' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 flex gap-5 shadow-sm items-center">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder={`Search ${activeCompany === 'mirrorzone' ? 'mirrors' : 'glass'}...`} value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl text-sm font-bold focus:border-brand-500 outline-none transition-all" />
              </div>

              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleProductUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-2 px-6 py-4 bg-slate-50 text-slate-600 border-2 border-slate-100 rounded-2xl hover:bg-slate-100 transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
              >
                {isImporting ? <RefreshCcw className="animate-spin" size={16} /> : <Upload size={16} />}
                Import CSV
              </button>

              {activeCompany !== 'mirrorzone' && (
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-brand-500">
                  {categories.filter(c => c !== 'Mirrors').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

            {activeCompany === 'mirrorzone' && (
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-xl mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 px-8 py-4 flex items-center justify-between">
                  <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    {/* Select All Checkbox */}
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-600 focus:ring-purple-500"
                    />
                    Mirrorzone <span className="opacity-50">Collection</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest">
                    Mirrors Only
                  </span>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b-2 border-slate-100">
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <th className="w-12 px-8 py-6">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="text-left px-4 py-6">Product Line</th>
                      <th className="text-left px-8 py-6">Pricing Index</th>
                      <th className="text-right px-8 py-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.filter(p => (
                      p.company === 'mirrorzone' ||
                      (!p.company && (p.category === 'Mirrors' || String(p.category).toLowerCase().includes('mirror')))
                    )).length === 0 ? (
                      <tr><td colSpan={4} className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No mirrors found in catalog</td></tr>
                    ) : (
                      filteredProducts.filter(p => (
                        p.company === 'mirrorzone' ||
                        (!p.company && (p.category === 'Mirrors' || String(p.category).toLowerCase().includes('mirror')))
                      )).map(p => (
                        <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedProducts.has(p.id) ? 'bg-purple-50/50' : ''}`}>
                          <td className="px-8 py-6">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(p.id)}
                              onChange={() => toggleProductSelection(p.id)}
                              className="w-5 h-5 rounded-md border-2 border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-6">
                            <div className="font-black text-slate-900 group-hover:text-brand-600 transition-colors">{String(p.name)}</div>
                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{String(p.category)}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-black text-slate-800">€{Number(p.price).toFixed(2)}</span>
                            <span className="text-[10px] font-bold text-slate-400 ml-1.5 uppercase">/ UNIT</span>
                          </td>
                          <td className="px-8 py-6 text-right flex items-center justify-end gap-3">
                            <button onClick={() => {
                              setEditingProduct(p);
                              setPName(p.name);
                              setPPrice(p.price.toString());
                              setPUnit(p.unit);
                              setPCategory(p.category);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} className="p-3 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all"><Edit2 size={18} /></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={18} /></button>
                          </td>
                        </tr>
                      )))}
                  </tbody>
                </table>
              </div>
            )}

            {activeCompany === 'clonmel' && (
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-red-600 px-8 py-4 flex items-center justify-between">
                  <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    {/* Select All Checkbox */}
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-brand-200 bg-red-700 text-white focus:ring-white"
                    />
                    Clonmel Glass <span className="opacity-70">Collection</span>
                  </h3>
                  <span className="text-[10px] font-bold text-white/80 bg-red-700 px-3 py-1 rounded-full uppercase tracking-widest">
                    General Catalog
                  </span>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b-2 border-slate-100">
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <th className="w-12 px-8 py-6">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="text-left px-4 py-6">Product Line</th>
                      <th className="text-left px-8 py-6">Pricing Index</th>
                      <th className="text-right px-8 py-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.filter(p => (
                      p.company === 'clonmel' || (!p.company && !String(p.category).toLowerCase().includes('mirror'))
                    )).length === 0 ? (
                      <tr><td colSpan={4} className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No other products found</td></tr>
                    ) : (
                      filteredProducts.filter(p => (
                        p.company === 'clonmel' || (!p.company && !String(p.category).toLowerCase().includes('mirror'))
                      )).map(p => (
                        <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedProducts.has(p.id) ? 'bg-red-50/50' : ''}`}>
                          <td className="px-8 py-6">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(p.id)}
                              onChange={() => toggleProductSelection(p.id)}
                              className="w-5 h-5 rounded-md border-2 border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-6">
                            <div className="font-black text-slate-900 group-hover:text-brand-600 transition-colors">{String(p.name)}</div>
                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{String(p.category)}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-black text-slate-800">€{Number(p.price).toFixed(2)}</span>
                            <span className="text-[10px] font-bold text-slate-400 ml-1.5 uppercase">/ {String(p.unit)}</span>
                          </td>
                          <td className="px-8 py-6 text-right flex items-center justify-end gap-3">
                            <button onClick={() => {
                              setEditingProduct(p);
                              setPName(p.name);
                              setPPrice(p.price.toString());
                              setPUnit(p.unit);
                              setPCategory(p.category);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} className="p-3 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all"><Edit2 size={18} /></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={18} /></button>
                          </td>
                        </tr>
                      )))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}



      {activeTab === 'USERS' && (
        <div className="space-y-10">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4 mb-8 border-b-2 border-slate-50 pb-6">
              <div className="h-12 w-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest leading-none">
                  Add New Team Member
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                  Grant access to the Invoice Hub
                </p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="md:col-span-1 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  required
                  value={uName}
                  onChange={e => setUName(e.target.value)}
                  className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-purple-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@clonmel.com"
                  value={uEmail}
                  onChange={e => setUEmail(e.target.value)}
                  className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-purple-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access Level</label>
                <select
                  value={uRole}
                  onChange={e => setURole(e.target.value as UserRole)}
                  className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none appearance-none cursor-pointer focus:border-purple-500"
                >
                  <option value={UserRole.USER}>Standard User</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-3 bg-slate-900 hover:bg-purple-600 text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 shadow-2xl shadow-slate-900/20 uppercase text-[10px] tracking-[0.2em]"
              >
                {isSyncing ? <RefreshCcw className="animate-spin" size={16} /> : <Plus size={16} />}
                Add User
              </button>
            </form>
          </div>

          <div className="bg-white rounded-[3rem] border-2 border-slate-100 overflow-hidden shadow-xl">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b-2 border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 text-left uppercase tracking-widest">
                  <th className="px-12 py-7">Access Node</th>
                  <th className="px-12 py-7">Authentication Email</th>
                  <th className="px-12 py-7">Auth Group</th>
                  <th className="px-12 py-7 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-12 py-7 flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl border-4 border-white shadow-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-black text-xl uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block font-black text-slate-900 text-base tracking-tight">{String(u.name)}</span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase">Hardware ID: {String(u.id)}</span>
                      </div>
                    </td>
                    <td className="px-12 py-7 text-slate-500 font-black text-sm">{String(u.email)}</td>
                    <td className="px-12 py-7">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-5 py-2 rounded-2xl border-2 ${u.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                        {String(u.role)}
                      </span>
                    </td>
                    <td className="px-12 py-7 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                          title="Remove User"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;