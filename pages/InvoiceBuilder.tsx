
import React, { useState, useMemo, useEffect } from 'react';
import { DatePicker } from '../components/DatePicker';
import { useApp } from '../contexts/AppContext';
import { Invoice, InvoiceItem, PaymentStatus, Product, Customer } from '../types';
import { Plus, Trash2, Wand2, Save, Ruler, Calculator, Phone, Search, Check, Pencil, X } from 'lucide-react';
import { generateInvoiceNotes } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const InvoiceBuilder = () => {
  const { products, addInvoice, updateInvoice, user, setView, customers, addCustomer, editingInvoice, setEditingInvoice, settings } = useApp();
  const { showToast } = useToast();

  const [documentType, setDocumentType] = useState<'invoice' | 'quote'>('invoice');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);

  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setCustomerName(editingInvoice.customerName);
      setCustomerEmail(editingInvoice.customerEmail || '');
      setCustomerPhone(editingInvoice.customerPhone || '');
      setCustomerAddress(editingInvoice.customerAddress || '');
      setInvoiceDate(editingInvoice.dateIssued.split('T')[0]);
      setDueDate(editingInvoice.dueDate.split('T')[0]);
      setItems(editingInvoice.items);
      setNotes(editingInvoice.notes || '');
      setCompany(editingInvoice.company || 'clonmel');

      // Smart Conversion Logic:
      // If we are editing an 'invoice' that still has a 'QT-' prefix, it means we came from "Convert to Invoice".
      // generating a new proper Invoice Number for it.
      if (editingInvoice.documentType === 'invoice' && (editingInvoice.invoiceNumber.startsWith('QT') || editingInvoice.invoiceNumber.startsWith('qt'))) {
        const randomVal = Math.floor(1000 + Math.random() * 9000);
        setInvoiceNumber(`INV-${new Date().getFullYear()}-${randomVal}`);
      } else {
        setInvoiceNumber(editingInvoice.invoiceNumber);
      }

      setDocumentType(editingInvoice.documentType || 'invoice');
      setTaxRate(editingInvoice.taxRate || settings.taxRate || 23);
    } else {
      const prefix = documentType === 'quote' ? 'QT' : 'INV';
      setInvoiceNumber(`${prefix}-${Date.now().toString().slice(-6)}`);
      setTaxRate(settings.taxRate || 23);
    }
  }, [editingInvoice, documentType, settings]);

  const [company, setCompany] = useState<'clonmel' | 'mirrorzone'>('clonmel');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState(''); // Kept for legacy compatibility if needed, but primary source will be new fields

  // Structured Address Fields
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Ireland');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxRate, setTaxRate] = useState(23);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Sync selectedCustomerId when editing an invoice
  useEffect(() => {
    if (editingInvoice) {
      setSelectedCustomerId(editingInvoice.customerId);
    }
  }, [editingInvoice]);

  const [customDescription, setCustomDescription] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [manualPrice, setManualPrice] = useState<string>(''); // For manual override before adding

  // Filter and group products based on selected company
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    const relevantProducts = products.filter(p => {
      // Prioritize explicit company assignment
      if (company === 'mirrorzone') {
        return p.company === 'mirrorzone' || (!p.company && p.category === 'Mirrors');
      }
      // Default to Clonmel
      return p.company === 'clonmel' || (!p.company && p.category !== 'Mirrors');
    });

    relevantProducts.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [products, company]);

  // Derived state for the existing items
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  // Real-time calculation for the CURRENT selection
  const currentProduct = products.find(p => p.id === selectedProductId);
  // Use manual price if set, otherwise product price
  const activePrice = manualPrice ? parseFloat(manualPrice) : (currentProduct ? currentProduct.price : 0);
  const numericQty = typeof quantity === 'string' ? parseFloat(quantity) || 0 : quantity;
  const currentLineTotal = activePrice * numericQty;
  const currentLineTotalIncTax = currentLineTotal * (1 + (taxRate / 100));

  const calculateArea = (newWidth: string, newHeight: string) => {
    const w = parseFloat(newWidth);
    const h = parseFloat(newHeight);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      const sqm = (w * h) / 1000000;
      setQuantity(Number(sqm.toFixed(6)));
    } else {
      setQuantity(0);
    }
  };

  const addItem = () => {
    if (!selectedProductId || !currentProduct) return;

    let finalDesc = customDescription || currentProduct.name;
    if (showCalculator && width && height) {
      finalDesc += ` (${width}mm x ${height}mm)`;
    }

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      productId: currentProduct.id,
      description: finalDesc,
      quantity: numericQty,
      unitPrice: activePrice,
      total: activePrice * numericQty,
      unit: currentProduct.unit
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setCustomDescription('');
    setQuantity(1);
    setWidth('');
    setHeight('');
    setManualPrice('');
    setShowCalculator(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const startEditing = (item: InvoiceItem) => {
    setEditingItemId(item.id);
    setEditDesc(item.description);
    setEditQty(item.quantity.toString());
    setEditPrice(item.unitPrice.toString());
  };

  const saveEdit = () => {
    if (editingItemId) {
      const q = parseFloat(editQty) || 0;
      const p = parseFloat(editPrice) || 0;
      setItems(items.map(i => i.id === editingItemId ? {
        ...i,
        description: editDesc,
        quantity: q,
        unitPrice: p,
        total: q * p
      } : i));
      setEditingItemId(null);
    }
  };

  const cancelEdit = () => {
    setEditingItemId(null);
  };

  const handleAiNotes = async () => {
    setLoadingAi(true);
    const itemDesc = items.map(i => `${i.quantity}x ${i.description}`).join(', ');
    const generated = await generateInvoiceNotes(customerName || 'Valued Customer', itemDesc);
    setNotes(generated);
    setLoadingAi(false);
  };

  const [isSaving, setIsSaving] = useState(false);

  const saveInvoice = async () => {
    if (!customerName || items.length === 0) {
      showToast("Please fill in customer details and add at least one item.", "warning");
      return;
    }

    // Combine structured address fields
    const fullAddress = [addressLine1, addressLine2, city, postalCode, country].filter(Boolean).join(', ');

    setIsSaving(true);
    try {
      let finalCustomerId = selectedCustomerId;

      // START AUTO-SAVE CUSTOMER LOGIC
      if (!finalCustomerId && customerName) {
        // Check if customer already exists by name or email (to avoid duplicates)
        const existingCustomer = customers.find(c =>
          c.name.toLowerCase() === customerName.toLowerCase() ||
          (c.email && customerEmail && c.email.toLowerCase() === customerEmail.toLowerCase())
        );

        if (existingCustomer) {
          finalCustomerId = existingCustomer.id;
        } else {
          // Create new customer
          const newCustomer: Customer = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            address: addressLine1,
            addressLine2: addressLine2,
            city: city,
            postalCode: postalCode,
            country: country,
            company: '', // Optional
            notes: 'Auto-created from Invoice Builder',
            tags: ['Auto-Created'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user?.id || 'system'
          };

          await addCustomer(newCustomer);
          finalCustomerId = newCustomer.id;
          showToast(`New customer "${customerName}" added to CRM.`, "success");
        }
      }
      // END AUTO-SAVE LOGIC

      const newInvoice: Invoice = {
        id: (editingInvoice && editingInvoice.id) ? editingInvoice.id : Date.now().toString(),
        invoiceNumber: invoiceNumber,
        customerId: finalCustomerId || 'cust_unknown',
        customerName,
        customerEmail,
        customerPhone,
        customerAddress: fullAddress, // Use the combined string for the invoice display
        company,
        documentType,
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
        amountPaid: editingInvoice ? editingInvoice.amountPaid : 0,
        balanceDue: total - (editingInvoice ? editingInvoice.amountPaid : 0),
        status: editingInvoice ? editingInvoice.status : (documentType === 'quote' ? 'PENDING' : PaymentStatus.UNPAID),
        dateIssued: invoiceDate,
        dueDate: dueDate || invoiceDate,
        notes,
        createdBy: user?.id || 'unknown',
        validUntil: documentType === 'quote'
          ? (editingInvoice?.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
          : undefined
      };

      if (editingInvoice && editingInvoice.id) {
        // Logic for "Convert to Invoice" check:
        // If we switched types (e.g. Quote -> Invoice), ensure status makes sense
        if (editingInvoice.documentType !== documentType) {
          if (documentType === 'invoice' && newInvoice.status === 'PENDING') {
            newInvoice.status = PaymentStatus.UNPAID;
          }
        }
        await updateInvoice(newInvoice);
      } else {
        await addInvoice(newInvoice);
      }

      setEditingInvoice(null);
      showToast(`${documentType === 'quote' ? 'Quote' : 'Invoice'} saved successfully.`, "success");
      setView(documentType === 'quote' ? 'QUOTES' : 'INVOICES');
    } catch (error) {
      console.error("Failed to save:", error);
      showToast("Failed to save invoice/quote. Check console for details.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
            {editingInvoice ? 'Edit' : 'Generate'} {documentType === 'quote' ? 'Quote' : 'Invoice'}
          </h2>
          <div className="flex gap-4 mt-4 bg-slate-100 p-1.5 rounded-2xl w-fit">
            <button
              onClick={() => setDocumentType('invoice')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${documentType === 'invoice' ? 'bg-slate-800 text-white shadow-slate-900/10 scale-100' : 'bg-transparent text-slate-400 hover:text-slate-600 scale-95 hover:scale-100'}`}
            >
              Invoice Mode
            </button>
            <button
              onClick={() => setDocumentType('quote')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${documentType === 'quote' ? 'bg-brand-500 text-white shadow-brand-500/20 scale-100' : 'bg-transparent text-slate-400 hover:text-slate-600 scale-95 hover:scale-100'}`}
            >
              Quote Mode
            </button>
          </div>
        </div>
        <button
          onClick={() => setView('INVOICES')}
          className="text-slate-500 hover:text-slate-800 font-semibold text-sm bg-slate-100 px-4 py-2 rounded-lg transition-colors self-start md:self-auto"
        >
          Cancel & Exit
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200">
        {/* Company Selection Banner */}
        <div className={`p-6 border-b-4 ${company === 'clonmel'
          ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-800'
          : 'bg-gradient-to-r from-slate-900 to-purple-900 border-purple-950'
          }`}>
          <div className="max-w-2xl mx-auto">
            <label className="block text-xs font-black text-white/80 uppercase tracking-[0.2em] mb-3 text-center">
              Select Company for Invoice
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setCompany('clonmel');
                  setSelectedProductId('');
                  setShowCalculator(false);
                  setQuantity(1);
                  setWidth('');
                  setHeight('');
                  setCustomDescription('');
                }}
                className={`p-6 rounded-xl border-2 transition-all duration-300 ${company === 'clonmel'
                  ? 'bg-white border-white shadow-2xl scale-105'
                  : 'bg-red-600/30 border-white/30 hover:bg-red-600/50 hover:border-white/50'
                  }`}
              >
                <div className={`text-center ${company === 'clonmel' ? 'text-red-600' : 'text-white'}`}>
                  <div className="text-xl font-black mb-1">CLONMEL GLASS</div>
                  <div className="text-xs font-semibold opacity-70">& Mirrors Ltd</div>
                  {company === 'clonmel' && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Selected
                    </div>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompany('mirrorzone');
                  setSelectedProductId('');
                  setShowCalculator(false);
                  setQuantity(1);
                  setWidth('');
                  setHeight('');
                  setCustomDescription('');
                }}
                className={`p-6 rounded-xl border-2 transition-all duration-300 ${company === 'mirrorzone'
                  ? 'bg-white border-white shadow-2xl scale-105'
                  : 'bg-slate-900/30 border-white/30 hover:bg-slate-900/50 hover:border-white/50'
                  }`}
              >
                <div className={`text-center ${company === 'mirrorzone' ? 'text-slate-900' : 'text-white'}`}>
                  <div className="text-xl font-black">MIRRORZONE</div>
                  {company === 'mirrorzone' && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                      Selected
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {/* Customer Selector Integration */}
            {/* Customer Selector Integration */}
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                Search & Select Customer (Optional)
              </label>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Type name, email or phone..."
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all text-sm font-semibold text-slate-700"
                />
              </div>

              {showCustomerDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowCustomerDropdown(false)}
                  />
                  <div className="absolute z-20 w-full mt-2 bg-white rounded-xl border-2 border-slate-100 shadow-xl max-h-60 overflow-y-auto">
                    {customers
                      .filter(c =>
                        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        c.email.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        c.phone.includes(customerSearchTerm)
                      )
                      .map(customer => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setCustomerName(customer.name);
                            setCustomerEmail(customer.email);
                            setCustomerPhone(customer.phone);
                            const parts = [customer.address, customer.city, customer.postalCode, customer.country];
                            setCustomerAddress(parts.filter(Boolean).join(', '));
                            setCustomerSearchTerm(customer.name);
                            setSelectedCustomerId(customer.id);
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center group"
                        >
                          <div>
                            <div className="font-bold text-slate-800 text-sm group-hover:text-brand-600 transition-colors">{customer.name}</div>
                            <div className="text-xs text-slate-400">{customer.email} • {customer.phone}</div>
                          </div>
                          {customerName === customer.name && <Check size={16} className="text-brand-500" />}
                        </button>
                      ))}

                    {customers.filter(c =>
                      c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      c.email.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      c.phone.includes(customerSearchTerm)
                    ).length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400 font-medium">
                          No matching customers found
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Customer / Client</label>
              <input
                type="text"
                className="w-full text-lg font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                placeholder="Search or enter name..."
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Email</label>
                <input
                  type="email"
                  className="w-full text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
                  placeholder="email@example.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Phone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    className="w-full pl-10 text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
                    placeholder="Phone number"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3 p-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Billing Address</label>

              <input
                type="text"
                placeholder="Address Line 1"
                className="w-full text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
                value={addressLine1}
                onChange={e => setAddressLine1(e.target.value)}
              />
              <input
                type="text"
                placeholder="Address Line 2 (Optional)"
                className="w-full text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
                value={addressLine2}
                onChange={e => setAddressLine2(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  className="w-full text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Eircode / Postcode"
                  className="w-full text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                />
              </div>
              <input
                type="text"
                placeholder="Country"
                className="w-full text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-all"
                value={country}
                onChange={e => setCountry(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <DatePicker
                  label="Issue Date"
                  value={invoiceDate}
                  onChange={setInvoiceDate}
                />
              </div>
              <div>
                <DatePicker
                  label="Due Date"
                  value={dueDate}
                  onChange={setDueDate}
                  align="right"
                />
              </div>
            </div>
            <div className="p-5 bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Reference</span>
                <span className="font-mono text-sm font-bold text-brand-600">{invoiceNumber}</span>
              </div>
              <div className="h-10 w-10 bg-brand-50 rounded-full flex items-center justify-center text-brand-500">
                <Save size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Item Builder */}
        <>
          <div className="mb-8 p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-black text-slate-600 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 bg-brand-600 text-white rounded-full text-[10px]">1</span>
                  Select Product from Catalog
                </label>
                <select
                  className="w-full border-2 border-slate-200 text-slate-900 rounded-xl px-5 py-4 text-base font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 bg-white shadow-sm transition-all appearance-none"
                  value={selectedProductId}
                  onChange={e => {
                    const id = e.target.value;
                    setSelectedProductId(id);
                    const prod = products.find(p => p.id === id);
                    if (prod) {
                      setCustomDescription(prod.name);
                      // Force unit calculation if not mirrorzone, otherwise simple quantity
                      if (prod.unit === 'sqm' && company !== 'mirrorzone') {
                        setShowCalculator(true);
                        setQuantity(0);
                      } else {
                        setShowCalculator(false);
                        setQuantity(1);
                      }
                    } else {
                      setCustomDescription('');
                    }
                  }}
                >
                  <option value="">Search all glass & mirrors...</option>
                  {Object.entries(groupedProducts).map(([cat, prods]) => (
                    <optgroup key={cat} label={cat} className="text-slate-900 font-bold bg-slate-50">
                      {(prods as Product[]).map(p => (
                        <option key={p.id} value={p.id} className="text-slate-900 font-medium">{p.name} — {formatCurrency(p.price)}/{p.unit}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="absolute right-0 top-0 -mt-8">
                  <button
                    onClick={() => setView('PRODUCTS')}
                    className="text-[10px] font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                  >
                    <Plus size={10} />
                    Manage Products
                  </button>
                </div>
              </div>



              {!showCalculator && selectedProductId && (
                <div className="flex gap-4 w-full md:w-auto animate-in zoom-in duration-200">
                  <div className="w-24">
                    <label className="block text-xs font-black text-slate-600 mb-3 uppercase tracking-wider">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border-2 border-slate-200 text-slate-900 rounded-xl px-4 py-4 text-base font-bold focus:outline-none focus:border-brand-500 bg-white shadow-sm"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-black text-slate-600 mb-3 uppercase tracking-wider whitespace-nowrap">Price (€) <span className="text-[9px] text-slate-400 font-bold normal-case ml-1">(Override)</span></label>
                    <input
                      type="number"
                      placeholder={currentProduct ? currentProduct.price.toFixed(2) : '0.00'}
                      className="w-full border-2 border-slate-200 text-slate-900 rounded-xl px-4 py-4 text-base font-bold focus:outline-none focus:border-brand-500 bg-white shadow-sm placeholder:text-slate-300"
                      value={manualPrice}
                      onChange={e => setManualPrice(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="w-full md:w-auto flex flex-col gap-2">
                {selectedProductId && (
                  <div className="text-right px-2 animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Subtotal: {formatCurrency(currentLineTotal)}</span>
                    <span className="text-xs font-black text-brand-600 block">Inc VAT: {formatCurrency(currentLineTotalIncTax)}</span>
                  </div>
                )}
                <button
                  onClick={addItem}
                  disabled={!selectedProductId || (showCalculator && (isNaN(parseFloat(width)) || isNaN(parseFloat(height)) || parseFloat(width) <= 0 || parseFloat(height) <= 0))}
                  className="w-full bg-brand-600 text-white px-10 py-4 rounded-xl hover:bg-brand-700 transition-all flex items-center justify-center space-x-3 text-sm font-black shadow-xl shadow-brand-500/20 disabled:opacity-50 disabled:shadow-none"
                >
                  <Plus size={20} />
                  <span>ADD TO INVOICE</span>
                </button>
              </div>
            </div>

            {showCalculator && company !== 'mirrorzone' && (
              <div className="flex flex-col md:flex-row items-stretch gap-6 p-6 bg-white rounded-2xl border-2 border-brand-500 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-center px-4 text-brand-500 bg-brand-50 rounded-xl">
                  <Ruler size={32} />
                </div>
                <div className="grid grid-cols-2 gap-6 flex-1 w-full">
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-brand-600 uppercase tracking-widest ml-1">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      autoFocus
                      className="w-full border-4 border-brand-100 bg-white text-slate-900 rounded-xl px-5 py-4 text-xl font-black outline-none focus:border-brand-500 transition-all placeholder:text-slate-300"
                      value={width}
                      onChange={e => { setWidth(e.target.value); calculateArea(e.target.value, height); }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-brand-600 uppercase tracking-widest ml-1">
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full border-4 border-brand-100 bg-white text-slate-900 rounded-xl px-5 py-4 text-xl font-black outline-none focus:border-brand-500 transition-all placeholder:text-slate-300"
                      value={height}
                      onChange={e => { setHeight(e.target.value); calculateArea(width, e.target.value); }}
                    />
                  </div>
                </div>
                <div className="flex flex-row md:flex-col items-center justify-center gap-4 w-full md:w-48 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100">
                  <div className="text-center">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Calculated SQM</label>
                    <div className="text-3xl font-black text-brand-600 leading-none">
                      {quantity.toFixed(6)}
                    </div>
                  </div>
                  <button
                    onClick={() => { setWidth(''); setHeight(''); setQuantity(0); }}
                    className="px-4 py-2 text-[10px] font-black text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-lg transition-all uppercase tracking-widest"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-xl border-2 border-slate-100">
            <table className="w-full">
              <thead className="bg-slate-50 border-b-2 border-slate-100">
                <tr>
                  <th className="text-left py-5 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Product Description</th>
                  <th className="text-center py-5 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty / SQM</th>
                  <th className="text-right py-5 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Price</th>
                  <th className="text-right py-5 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Line Total</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center space-y-3">
                        <Calculator size={48} className="opacity-20" />
                        <p className="text-sm font-medium italic">No items added to this invoice yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="py-5 px-6">
                        {editingItemId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              className="w-full border-2 border-brand-200 text-slate-900 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-brand-500 bg-white"
                              value={editDesc}
                              onChange={e => setEditDesc(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                          </div>
                        ) : (
                          <div className="group/desc relative pr-8">
                            <div className="text-sm font-bold text-slate-900">{item.description}</div>
                            <div className="text-[10px] text-brand-500 font-mono font-bold mt-1">{item.productId}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center text-sm font-black text-slate-700">
                        {editingItemId === item.id ? (
                          <input
                            type="number"
                            className="w-20 text-center border-2 border-brand-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-brand-500 bg-white"
                            value={editQty}
                            onChange={e => setEditQty(e.target.value)}
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="py-5 px-6 text-right text-sm font-medium text-slate-500">
                        {editingItemId === item.id ? (
                          <input
                            type="number"
                            className="w-24 text-right border-2 border-brand-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-brand-500 bg-white"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                          />
                        ) : (
                          formatCurrency(item.unitPrice)
                        )}
                      </td>
                      <td className="py-5 px-6 text-right text-base font-black text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="py-5 px-6 text-right">
                        {editingItemId === item.id ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={saveEdit} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200">
                              <Check size={14} />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEditing(item)} className="p-2 text-slate-300 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all">
                              <Pencil size={18} />
                            </button>
                            <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>


        <div className="p-6 md:p-8">
          {/* Footer / Totals */}
          <div className="flex flex-col md:flex-row justify-between items-start pt-10 mt-6 border-t-2 border-slate-100">
            <div className="w-full md:w-1/2 pr-0 md:pr-12 mb-10 md:mb-0">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Wand2 size={14} className="text-purple-500" />
                Custom Notes & Terms
              </label>

              <textarea
                className="w-full border-2 border-slate-200 text-slate-900 rounded-2xl px-5 py-4 text-sm h-40 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none resize-none shadow-sm transition-all"
                placeholder="Enter specific project notes or banking instructions..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-wider">Note: These details are visible to the customer on the PDF.</p>
            </div>

            <div className="w-full md:w-[400px] bg-slate-900 text-white p-8 rounded-[2rem] space-y-6 shadow-2xl relative overflow-hidden">
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between text-sm items-center border-b border-white/10 pb-4">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Subtotal</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm items-center pb-2">
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">VAT Amount</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-brand-400">Rate:</span>
                      <input
                        type="number"
                        value={taxRate}
                        onChange={e => setTaxRate(parseFloat(e.target.value))}
                        className="w-12 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-white text-center font-bold focus:border-brand-500 outline-none"
                      />
                      <span className="text-[10px] font-black text-brand-400">%</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-lg">{formatCurrency(taxAmount)}</span>
                </div>
              </div>

              <div className="pt-6 border-t-2 border-white/20 relative z-10">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Total Invoice Value</span>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-black tracking-tighter text-white">TOTAL DUE</span>
                    <span className="text-4xl font-black text-brand-500 font-mono leading-none">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-5 pb-20">
        <button
          onClick={() => setView('INVOICES')}
          className="px-10 py-5 rounded-2xl border-2 border-slate-200 text-slate-500 font-black hover:bg-slate-100 transition-all text-xs uppercase tracking-[0.2em]"
        >
          Discard Draft
        </button>
        <button
          onClick={saveInvoice}
          disabled={isSaving}
          className="px-10 py-5 rounded-2xl bg-brand-600 text-white font-black hover:bg-brand-700 transition-all flex items-center justify-center space-x-4 text-xs uppercase tracking-[0.2em] shadow-2xl shadow-brand-500/40 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>{editingInvoice ? 'Update & Save Changes' : 'Save & Finalize Invoice'}</span>
            </>
          )}
        </button>
      </div>
    </div >
  );
};

export default InvoiceBuilder;
