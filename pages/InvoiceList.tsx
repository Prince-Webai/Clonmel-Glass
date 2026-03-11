import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils';
import { Invoice, PaymentStatus } from '../types';
import { Search, Download, Eye, Trash2, Edit, CheckCircle2, Clock, AlertCircle, CreditCard, Mail, ArrowRightCircle, X, Check, MoreVertical } from 'lucide-react';
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
      style: 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-[0_2px_10px_rgba(16,185,129,0.1)]',
      icon: <CheckCircle2 size={10} />,
      label: 'PAID'
    },
    [PaymentStatus.PARTIALLY_PAID]: {
      style: 'bg-amber-50 text-amber-700 border-amber-200 shadow-[0_2px_10px_rgba(245,158,11,0.1)]',
      icon: <Clock size={10} />,
      label: 'PARTIALLY'
    },
    [PaymentStatus.UNPAID]: {
      style: overdue
        ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse shadow-[0_2px_15px_rgba(225,29,72,0.15)]'
        : 'bg-slate-50 text-slate-500 border-slate-200',
      icon: overdue ? <AlertCircle size={10} /> : <Clock size={10} />,
      label: overdue ? 'OVERDUE' : 'UNPAID'
    },
  };

  const { style, icon, label } = config[status] || config[PaymentStatus.UNPAID];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-black border transition-all ${style} tracking-[0.1em]`}>
      {icon}
      {label}
    </span>
  );
};

// ⋯ Dropdown menu — uses position:fixed to escape overflow-hidden containers
const ActionMenu = ({ inv, onEdit, onPreview, onEmail, onXero, onDownload, onDelete, onPayment, emailCooledDown, xeroLocked }: {
  inv: Invoice;
  onEdit: () => void;
  onPreview: () => void;
  onEmail: () => void;
  onXero: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onPayment: () => void;
  emailCooledDown: boolean;
  xeroLocked: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent | TouchEvent) => setOpen(false);
    if (open) {
      // Close on next click/touch outside
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', close, { once: true });
        document.addEventListener('touchstart', close, { once: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(v => !v);
  };

  const Item = ({ icon, label, onClick, danger, disabled, muted }: {
    icon: React.ReactNode; label: string; onClick: () => void;
    danger?: boolean; disabled?: boolean; muted?: boolean;
  }) => (
    <button
      onClick={() => { if (!disabled) { onClick(); setOpen(false); } }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left
        ${danger ? 'text-rose-600 hover:bg-rose-50' : muted ? 'text-slate-300 cursor-default' : 'text-slate-700 hover:bg-slate-50'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative flex justify-center">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        title="Actions"
      >
        <MoreVertical size={20} />
      </button>

      {open && (
        <div
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-100 py-1 w-52"
        >
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{inv.invoiceNumber}</p>
          </div>
          <Item icon={<CreditCard size={15} />} label="Record Payment" onClick={onPayment} />
          <Item icon={<Edit size={15} />} label="Edit Invoice" onClick={onEdit} />
          <Item icon={<Eye size={15} />} label="Preview PDF" onClick={onPreview} />
          <Item icon={<Mail size={15} />} label={emailCooledDown ? "Email (4hr cooldown)" : "Send Email"} onClick={onEmail} muted={emailCooledDown} disabled={emailCooledDown} />
          {inv.xeroSyncStatus !== 'synced' ? (
            <Item icon={<ArrowRightCircle size={15} />} label={xeroLocked ? "Xero (pay first)" : "Send to Xero"} onClick={onXero} disabled={xeroLocked} muted={xeroLocked} />
          ) : (
            <Item icon={<Check size={15} />} label="Xero Synced ✓" onClick={() => {}} muted />
          )}
          <Item icon={<Download size={15} />} label="Download PDF" onClick={onDownload} />
          <div className="border-t border-slate-100 mt-1">
            <Item icon={<Trash2 size={15} />} label="Delete Invoice" onClick={onDelete} danger />
          </div>
        </div>
      )}
    </div>
  );
};

const InvoiceList = () => {
  const { invoices, updateInvoice, deleteInvoice, setView, companyLogo, setEditingInvoice, settings, customers, user } = useApp();
  const [filter, setFilter] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  const filteredInvoices = invoices.filter(inv =>
    (inv.documentType === 'invoice' || !inv.documentType) &&
    inv.invoiceNumber && !inv.invoiceNumber.startsWith('QT-') &&
    (inv.customerName?.toLowerCase().includes(filter.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(filter.toLowerCase()))
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
      balanceDue: newStatus === PaymentStatus.PAID ? 0 : Math.max(0, newBalance),
      status: newStatus,
      paymentDate: newStatus === PaymentStatus.PAID ? new Date().toISOString() : inv.paymentDate
    });

    setEditingPaymentId(null);
    setPaymentAmount('');
  };

  const handleDelete = async (inv: Invoice) => {
    if (window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) {
      try { await deleteInvoice(inv.id); }
      catch (error) { alert("Failed to delete invoice. Please try again."); }
    }
  };

  const handleSendEmail = async (inv: Invoice) => {
    if (!settings.webhookUrl) {
      alert("Please configure Webhook URL in Settings → Integrations first.");
      return;
    }
    const count = inv.reminderCount || 0;
    const notificationType = count === 0 ? "First Mail" : "Reminder";
    if (window.confirm(`Send invoice ${inv.invoiceNumber} to ${inv.customerEmail || 'customer'}?\nType: ${notificationType}`)) {
      try {
        const fullCustomer = customers.find(c => c.id === inv.customerId);
        await sendInvoiceViaWebhook(inv, settings, companyLogo, fullCustomer, notificationType, user?.name || 'Admin');
        alert(`Invoice sent successfully! (${notificationType})`);
        updateInvoice({ ...inv, lastReminderSent: new Date().toISOString(), reminderCount: count + 1 });
      } catch (e) { alert("Failed to send invoice. Check settings."); }
    }
  };

  const handleXeroTransfer = async (inv: Invoice) => {
    if (!settings.xeroWebhookUrl) {
      alert("Please configure Xero Webhook URL in Settings → Integrations first.");
      return;
    }
    if (inv.xeroSyncStatus === 'synced') { alert("Already synced with Xero."); return; }
    try {
      const fullCustomer = customers.find(c => c.id === inv.customerId);
      const success = await sendToXero(inv, fullCustomer, settings, user);
      await updateInvoice({ ...inv, xeroSyncStatus: success ? 'synced' : 'failed', xeroSyncDate: success ? new Date().toISOString() : undefined });
      alert(success ? "Transferred to Xero successfully!" : "Failed to transfer to Xero.");
    } catch (e) {
      await updateInvoice({ ...inv, xeroSyncStatus: 'failed' });
      alert("Xero transfer failed.");
    }
  };

  return (
    <div className="max-w-[95%] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
            Invoice <span className="text-brand-500">List</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Manage global ledger & collections
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-3 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-xs w-full md:w-72"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditingInvoice(null); setView('CREATE_INVOICE'); }}
            className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-brand-700 transition-all text-[10px] uppercase tracking-[0.2em] whitespace-nowrap"
          >
            New Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800">
              <th className="text-left py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
              <th className="text-right py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
              <th className="text-center py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
              <th className="text-center py-4 px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400">No invoices found</td>
              </tr>
            ) : (
              filteredInvoices.map(inv => {
                const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== PaymentStatus.PAID;
                const isEditingPayment = editingPaymentId === inv.id;
                const emailCooledDown = !!(inv.lastReminderSent && (new Date().getTime() - new Date(inv.lastReminderSent).getTime()) / (1000 * 60 * 60) < 4);
                const xeroLocked = inv.status !== PaymentStatus.PAID;

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-black text-slate-900 text-sm">{inv.customerName || 'Unknown'}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">{inv.invoiceNumber}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{formatDate(inv.dateIssued)}</div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="font-black text-slate-900 text-sm">{formatCurrency(inv.total)}</div>
                      <div className="text-[10px] font-bold text-rose-500 mt-0.5">Due: {formatCurrency(inv.balanceDue || 0)}</div>
                      {inv.xeroSyncStatus === 'synced' && (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md mt-0.5">
                          <Check size={8} /> Xero
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <StatusBadge status={inv.status} overdue={isOverdue} />
                      {/* Inline payment row */}
                      {isEditingPayment && (
                        <div className="mt-2 flex items-center justify-center gap-1">
                          <button onClick={() => setPaymentAmount((inv.balanceDue || 0).toString())} className="px-2 py-1 text-[9px] font-black bg-brand-50 text-brand-600 rounded hover:bg-brand-100">Full</button>
                          <button onClick={() => setPaymentAmount(((inv.balanceDue || 0) / 2).toFixed(2))} className="px-2 py-1 text-[9px] font-black bg-slate-50 text-slate-600 rounded hover:bg-slate-100">50%</button>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                            <input
                              autoFocus
                              type="number"
                              className="w-20 pl-5 pr-1 py-1 text-xs font-bold border border-slate-200 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                              placeholder="Amount"
                              value={paymentAmount}
                              onChange={e => setPaymentAmount(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handlePayment(inv);
                                if (e.key === 'Escape') { setEditingPaymentId(null); setPaymentAmount(''); }
                              }}
                            />
                          </div>
                          <button onClick={() => handlePayment(inv)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"><Check size={12} strokeWidth={3} /></button>
                          <button onClick={() => { setEditingPaymentId(null); setPaymentAmount(''); }} className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200"><X size={12} strokeWidth={3} /></button>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center">
                      <ActionMenu
                        inv={inv}
                        emailCooledDown={emailCooledDown}
                        xeroLocked={xeroLocked}
                        onEdit={() => { setEditingInvoice(inv); setView('CREATE_INVOICE'); }}
                        onPreview={async () => {
                          const w = window.open('about:blank', '_blank');
                          try { const url = await generatePreviewUrl(inv, settings, undefined, user?.name || 'Admin'); if (w) w.location.href = url; }
                          catch { if (w) w.close(); alert("Preview failed."); }
                        }}
                        onEmail={() => handleSendEmail(inv)}
                        onXero={() => handleXeroTransfer(inv)}
                        onDownload={() => downloadInvoicePDF(inv, settings, undefined, user?.name || 'Admin')}
                        onDelete={() => handleDelete(inv)}
                        onPayment={() => { setEditingPaymentId(inv.id); setPaymentAmount((inv.balanceDue || 0).toString()); }}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceList;
