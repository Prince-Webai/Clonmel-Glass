
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils';
import { Invoice, PaymentStatus } from '../types';
import { Search, CreditCard, Download, Eye, X, Check, Euro, BellRing, Clock, CheckCircle2, AlertCircle, Trash2, Edit, Mail, ArrowRightCircle } from 'lucide-react';
import { downloadInvoicePDF, generatePreviewUrl, sendInvoiceViaWebhook } from '../services/pdfService';
import { sendToXero } from '../services/integrationService';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const StatusBadge = ({ status, overdue }: { status: PaymentStatus, overdue?: boolean }) => {
  const config = {
    [PaymentStatus.PAID]: {
      style: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      icon: <CheckCircle2 size={10} />,
      label: 'PAID'
    },
    [PaymentStatus.PARTIALLY_PAID]: {
      style: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock size={10} />,
      label: 'PARTIALLY PAID'
    },
    [PaymentStatus.UNPAID]: {
      style: overdue ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-slate-50 text-slate-600 border-slate-200',
      icon: overdue ? <AlertCircle size={10} /> : <Clock size={10} />,
      label: overdue ? 'OVERDUE' : 'UNPAID'
    },
  };

  const { style, icon, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border transition-all shadow-sm ${style} tracking-widest`}>
      {icon}
      {label}
    </span>
  );
};

const ProgressBar = ({ paid, total }: { paid: number, total: number }) => {
  const percent = Math.min(100, Math.max(0, (paid / total) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-tighter">
        <span>{percent.toFixed(0)}% Settle</span>
        <span className="text-slate-500">{formatCurrency(paid)}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${percent === 100 ? 'bg-emerald-500' : 'bg-emerald-400'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const InvoiceList = () => {
  const { invoices, updateInvoice, deleteInvoice, setView, companyLogo, selectedInvoiceId, setSelectedInvoiceId, setEditingInvoice, settings, customers, user } = useApp();
  const [filter, setFilter] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const invoiceRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const filteredInvoices = invoices.filter(inv =>
    (inv.documentType === 'invoice' || !inv.documentType) &&
    !inv.invoiceNumber.startsWith('QT-') &&
    (inv.customerName.toLowerCase().includes(filter.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(filter.toLowerCase()))
  );

  const handlePayment = (inv: Invoice) => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newPaid = (inv.amountPaid || 0) + amount;
    const newBalance = inv.total - newPaid;
    let newStatus = PaymentStatus.PARTIALLY_PAID;

    if (newBalance <= 0.05) {
      newStatus = PaymentStatus.PAID;
    }

    updateInvoice({
      ...inv,
      amountPaid: Math.min(newPaid, inv.total),
      balanceDue: newStatus === PaymentStatus.PAID ? 0 : Math.max(0, newBalance), // Force 0 when PAID
      status: newStatus,
      paymentDate: newStatus === PaymentStatus.PAID ? new Date().toISOString() : inv.paymentDate
    });
    setEditingPaymentId(null);
    setPaymentAmount('');
  };

  const handleDownload = async (inv: Invoice) => {
    try {
      await downloadInvoicePDF(inv, settings, companyLogo);
    } catch (e) {
      alert("Download failed. Check console.");
    }
  };

  const handlePreview = async (inv: Invoice) => {
    try {
      const url = await generatePreviewUrl(inv, settings, companyLogo);
      setPreviewUrl(url);
    } catch (e) {
      alert("Preview failed.");
    }
  };

  const handleSendEmail = async (inv: Invoice) => {
    if (!settings.webhookUrl) {
      alert("Please configure Webhook URL in Settings -> Integrations first.");
      return;
    }

    if (window.confirm(`Send invoice ${inv.invoiceNumber} to ${inv.customerEmail || 'customer'}?`)) {
      try {
        const fullCustomer = customers.find(c => c.id === inv.customerId);
        await sendInvoiceViaWebhook(inv, settings, companyLogo, fullCustomer);

        // Update local state - Manual reminders don't strictly count towards the auto-limit, 
        // but we track them anyway. Auto-limit logic will check count < 4.
        const currentCount = inv.reminderCount || 0;
        updateInvoice({
          ...inv,
          lastReminderSent: new Date().toISOString(),
          reminderCount: currentCount + 1
        });

        alert("Invoice sent successfully!");
      } catch (e) {
        console.error(e);
        alert("Failed to send invoice. Check settings and console.");
      }
    }
  };

  const handleXeroTransfer = async (inv: Invoice) => {
    if (!settings.xeroWebhookUrl) {
      alert("Please configure Xero Webhook URL in Settings -> Integrations first.");
      return;
    }

    if (window.confirm(`Transfer invoice ${inv.invoiceNumber} data to Xero?`)) {
      try {
        const fullCustomer = customers.find(c => c.id === inv.customerId);
        const success = await sendToXero(inv, fullCustomer, settings, user);
        if (success) {
          alert("Invoice data transferred to Xero successfully!");
        } else {
          alert("Failed to transfer. Webhook returned an error.");
        }
      } catch (e) {
        console.error(e);
        alert("Failed to transfer to Xero. Check settings and console.");
      }
    }
  };

  const handleDelete = async (inv: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}? This action cannot be undone.`)) {
      try {
        await deleteInvoice(inv.id);
      } catch (e) {
        alert("Failed to delete invoice. Please try again.");
      }
    }
  };

  // Scroll to selected invoice when coming from Calendar
  useEffect(() => {
    if (selectedInvoiceId && invoiceRefs.current[selectedInvoiceId]) {
      const element = invoiceRefs.current[selectedInvoiceId];
      if (element) {
        // Scroll to the element with smooth behavior
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add a highlight animation
        element.classList.add('bg-brand-50');
        setTimeout(() => {
          element.classList.remove('bg-brand-50');
        }, 2000);

        // Clear the selected invoice ID after scrolling
        setTimeout(() => {
          setSelectedInvoiceId(null);
        }, 2500);
      }
    }
  }, [selectedInvoiceId, filteredInvoices]);

  return (
    <div className="max-w-[95%] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Invoice <span className="text-brand-500">List</span></h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage global ledger & collections</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by name or number..."
              className="pl-10 pr-4 py-3 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-xs w-full md:w-80 shadow-sm transition-all placeholder:text-slate-300"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditingInvoice(null); setView('CREATE_INVOICE'); }}
            className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-brand-700 transition-all text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-brand-500/30"
          >
            New Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 border-b-2 border-slate-100">
              <tr>
                <th className="text-left py-4 px-3 md:py-6 md:px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer / Lineage</th>
                <th className="text-right py-4 px-3 md:py-6 md:px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financials</th>
                <th className="hidden md:table-cell text-left py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-72">Settlement Depth</th>
                <th className="hidden md:table-cell text-center py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lifecycle</th>
                <th className="text-center py-4 px-3 md:py-6 md:px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PDF</th>
                <th className="text-center py-4 px-3 md:py-6 md:px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map(inv => {
                const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== PaymentStatus.PAID;
                return (
                  <tr
                    key={inv.id}
                    ref={(el) => invoiceRefs.current[inv.id] = el}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-4 px-3 md:py-6 md:px-10">
                      <div className="text-sm md:text-lg font-black text-slate-900 tracking-tight">{inv.customerName}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">{inv.invoiceNumber}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="hidden md:inline text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {inv.company === 'mirrorzone' ? 'Mirrorzone' : 'Clonmel Glass'}
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock size={10} strokeWidth={2.5} />
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            {formatDate(inv.dateIssued)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 md:py-6 md:px-10 text-right whitespace-nowrap">
                      <div className="text-sm font-black text-slate-900">{formatCurrency(inv.total)}</div>
                      <div className="text-[10px] font-bold text-rose-500 mt-0.5">Bal: {formatCurrency(inv.balanceDue)}</div>
                    </td>
                    <td className="hidden md:table-cell py-6 px-10 align-middle">
                      <ProgressBar paid={inv.amountPaid || 0} total={inv.total} />
                    </td>
                    <td className="hidden md:table-cell py-6 px-10 text-center align-middle">
                      <div className="flex flex-col items-center gap-1.5">
                        <StatusBadge status={inv.status} overdue={isOverdue} />
                        {inv.lastReminderSent && (
                          <div className="flex items-center gap-1 text-[9px] font-black text-brand-500 uppercase tracking-widest bg-brand-50 px-2 py-1 rounded-md" title={`Last reminder: ${formatDate(inv.lastReminderSent)}`}>
                            <BellRing size={10} />
                            <span>Follow-up ({inv.reminderCount || 1})</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-3 md:py-6 md:px-6 text-center align-middle">
                      <div className="flex items-center justify-center space-x-1">
                        <button onClick={() => handlePreview(inv)} className="p-3 text-brand-600 bg-brand-50 hover:bg-brand-600 hover:text-white rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95" title="Preview PDF">
                          <Eye size={20} />
                        </button>
                        <button onClick={() => handleDownload(inv)} className="p-3 text-slate-600 bg-slate-100 hover:bg-slate-600 hover:text-white rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95" title="Download PDF">
                          <Download size={20} />
                        </button>
                        <button onClick={() => handleSendEmail(inv)} className="p-2 md:p-3 text-sky-600 bg-sky-50 hover:bg-sky-600 hover:text-white rounded-xl md:rounded-2xl transition-all shadow-sm" title="Send via Webhook">
                          <Mail size={16} />
                        </button>
                        {inv.status === PaymentStatus.PAID && (
                          <button onClick={() => handleXeroTransfer(inv)} className="p-2 md:p-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl md:rounded-2xl transition-all shadow-sm" title="Transfer to Xero">
                            <ArrowRightCircle size={16} />
                          </button>
                        )}
                        <button onClick={() => { setEditingInvoice(inv); setView('CREATE_INVOICE'); }} className="hidden md:block p-2 md:p-3 text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-xl md:rounded-2xl transition-all shadow-sm" title="Edit Invoice">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(inv)} className="hidden md:block p-2 md:p-3 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl md:rounded-2xl transition-all shadow-sm" title="Delete Invoice">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-3 md:py-6 md:px-10 text-center align-middle">
                      {editingPaymentId === inv.id ? (
                        <div className="flex flex-col gap-2 bg-white border-2 border-emerald-100 p-4 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 absolute right-10 z-10 w-80">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Record Payment</span>
                            <button onClick={() => setEditingPaymentId(null)} className="text-slate-300 hover:text-rose-500 transition-colors">
                              <X size={14} />
                            </button>
                          </div>

                          <div className="relative w-full">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">€</span>
                            <input
                              type="number"
                              className="w-full border-2 border-slate-100 bg-emerald-50/30 text-emerald-900 rounded-xl pl-9 pr-4 py-3 text-lg font-black outline-none focus:border-emerald-500 transition-all placeholder:text-emerald-900/20"
                              placeholder="0.00"
                              autoFocus
                              value={paymentAmount}
                              onChange={e => setPaymentAmount(e.target.value)}
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setPaymentAmount((inv.balanceDue * 0.5).toFixed(2))}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                            >
                              50%
                            </button>
                            <button
                              onClick={() => setPaymentAmount(inv.balanceDue.toFixed(2))}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                            >
                              100%
                            </button>
                          </div>

                          <button
                            onClick={() => handlePayment(inv)}
                            className="w-full bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-1"
                          >
                            <Check size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Save Payment</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          {inv.status !== PaymentStatus.PAID && (
                            <button
                              onClick={() => { setEditingPaymentId(inv.id); setPaymentAmount(inv.balanceDue.toFixed(2)); }}
                              className="p-3 text-emerald-500 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-2xl transition-all shadow-sm group"
                              title="Record Payment"
                            >
                              <Euro size={18} className="group-hover:scale-110 transition-transform" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div className="p-32 text-center text-slate-400 bg-slate-50/20">
              <Search size={48} className="mx-auto mb-6 opacity-5" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">No matching ledger entries found</p>
            </div>
          )}
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-8 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-10 py-6 border-b-2 border-slate-50 bg-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                  <Eye size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Engine Render View</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Post-script generation preview</p>
                </div>
              </div>
              <button onClick={() => setPreviewUrl(null)} className="text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded-full p-3 transition-all">
                <X size={28} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-10 overflow-hidden relative">
              <iframe src={previewUrl} className="w-full h-full rounded-3xl shadow-2xl border-8 border-white bg-white" title="PDF Preview" />
            </div>
            <div className="p-8 border-t-2 border-slate-50 bg-white flex justify-end">
              <button onClick={() => setPreviewUrl(null)} className="px-12 py-4 bg-slate-900 text-white font-black hover:bg-slate-800 rounded-2xl transition-all text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20">
                Exit Preview Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
