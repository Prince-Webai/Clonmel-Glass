import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils';
import { Invoice, PaymentStatus } from '../types';
import { Search, Download, Eye, Trash2, Edit, CheckCircle2, Clock, AlertCircle, CreditCard, Mail, ArrowRightCircle, Euro, X, Check, Loader2, Lock } from 'lucide-react';
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

const ProgressBar = ({ paid, total }: { paid: number, total: number }) => {
  const percent = Math.min(100, Math.max(0, (paid / total) * 100));
  return (
    <div className="w-full max-w-[120px] flex flex-col gap-2">
      <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
        <span>Collection</span>
        <span className={percent === 100 ? 'text-emerald-500' : 'text-slate-600'}>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-[2px]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.2)] ${percent === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
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

    const updatedInvoice: Invoice = {
      ...inv,
      amountPaid: Math.min(newPaid, inv.total),
      balanceDue: newStatus === PaymentStatus.PAID ? 0 : Math.max(0, newBalance),
      status: newStatus,
      paymentDate: newStatus === PaymentStatus.PAID ? new Date().toISOString() : inv.paymentDate
    };

    updateInvoice(updatedInvoice);

    // Auto Xero Sync removed as per user request (manual only)

    setEditingPaymentId(null);
    setPaymentAmount('');
  };

  const handleDelete = async (inv: Invoice) => {
    if (window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) {
      try {
        await deleteInvoice(inv.id);
      } catch (error) {
        console.error("Failed to delete invoice:", error);
        alert("Failed to delete invoice. Please try again.");
      }
    }
  };

  const handleSendEmail = async (inv: Invoice) => {
    if (!settings.webhookUrl) {
      alert("Please configure Webhook URL (n8n) in Settings -> Integrations first.");
      return;
    }

    const count = inv.reminderCount || 0;
    const isFirstMail = count === 0;
    const notificationType = isFirstMail ? "First Mail" : "Reminder";

    if (window.confirm(`Send invoice ${inv.invoiceNumber} to ${inv.customerEmail || 'customer'}?\n\nType: ${notificationType}`)) {
      try {
        const fullCustomer = customers.find(c => c.id === inv.customerId);

        // Pass notificationType to webhook
        await sendInvoiceViaWebhook(inv, settings, companyLogo, fullCustomer, notificationType, user?.name || 'Admin');

        alert(`Invoice sent successfully! (${notificationType})`);

        // Update reminder count
        updateInvoice({
          ...inv,
          lastReminderSent: new Date().toISOString(),
          reminderCount: count + 1
        });
      } catch (e) {
        console.error(e);
        alert("Failed to send invoice. Check settings.");
      }
    }
  };

  const handleXeroTransfer = async (inv: Invoice) => {
    if (!settings.xeroWebhookUrl) {
      alert("Please configure Xero Webhook URL in Settings -> Integrations first.");
      return;
    }

    if (inv.xeroSyncStatus === 'synced') {
      alert("This invoice has already been synced with Xero.");
      return;
    }


    try {
      const fullCustomer = customers.find(c => c.id === inv.customerId);
      const success = await sendToXero(inv, fullCustomer, settings, user);

      if (success) {
        await updateInvoice({
          ...inv,
          xeroSyncStatus: 'synced',
          xeroSyncDate: new Date().toISOString()
        });
        alert("Transferred to Xero successfully!");
      } else {
        await updateInvoice({
          ...inv,
          xeroSyncStatus: 'failed'
        });
        alert("Failed to transfer to Xero. Please check logs/webhook.");
      }
    } catch (e) {
      console.error(e);
      await updateInvoice({
        ...inv,
        xeroSyncStatus: 'failed'
      });
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
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-300" size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-3 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-xs w-full md:w-80"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditingInvoice(null); setView('CREATE_INVOICE'); }}
            className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-brand-700 transition-all text-[10px] uppercase tracking-[0.2em]"
          >
            New Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="text-left py-4 px-4 md:py-6 md:px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Intelligence</th>
                <th className="text-right py-4 px-4 md:py-6 md:px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financials</th>
                <th className="hidden lg:table-cell text-center py-4 px-4 md:py-6 md:px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Collection</th>
                <th className="text-center py-4 px-4 md:py-6 md:px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="text-center py-4 px-4 md:py-6 md:px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">No invoices found</td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== PaymentStatus.PAID;
                  const isEditingPayment = editingPaymentId === inv.id;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-4 md:py-6 md:px-6">
                        <div className="text-base font-black text-slate-900">{inv.customerName || 'Unknown'}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">{inv.invoiceNumber}</div>
                        <div className="text-[10px] font-bold text-slate-600 mt-1">{formatDate(inv.dateIssued)}</div>
                      </td>
                      <td className="py-4 px-4 md:py-6 md:px-6 text-right">
                        <div className="text-sm font-black text-slate-900">{formatCurrency(inv.total)}</div>
                        <div className="text-[10px] font-bold text-rose-500 mt-0.5">Balance: {formatCurrency(inv.balanceDue || 0)}</div>
                      </td>
                      <td className="hidden lg:table-cell py-4 px-4 md:py-6 md:px-6 align-middle">
                        <ProgressBar paid={inv.amountPaid || 0} total={inv.total} />
                      </td>
                      <td className="py-4 px-4 md:py-6 md:px-6 text-center">
                        <div className="flex flex-col gap-1.5 min-w-[90px] items-center">
                          <StatusBadge status={inv.status} overdue={isOverdue} />
                          {inv.xeroSyncStatus === 'synced' && (
                            <span className="inline-flex items-center justify-center gap-1 text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 uppercase tracking-tighter">
                              <Check size={8} /> Xero Synced
                            </span>
                          )}
                          {inv.xeroSyncStatus === 'failed' && (
                            <span className="inline-flex items-center justify-center gap-1 text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 uppercase tracking-tighter">
                              <X size={8} /> Xero Failed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-2 md:py-6 md:px-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {isEditingPayment ? (
                            <div className="flex items-center gap-2 bg-white shadow-lg p-1 rounded-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                              <div className="flex gap-1 mr-1">
                                <button
                                  onClick={() => setPaymentAmount((inv.balanceDue || 0).toString())}
                                  className="px-2 py-1 text-[10px] font-black bg-brand-50 text-brand-600 rounded-md hover:bg-brand-100 transition-colors uppercase"
                                  title="Pay Full Balance"
                                >
                                  Full
                                </button>
                                <button
                                  onClick={() => setPaymentAmount(((inv.balanceDue || 0) / 2).toFixed(2))}
                                  className="px-2 py-1 text-[10px] font-black bg-slate-50 text-slate-600 rounded-md hover:bg-slate-100 transition-colors uppercase"
                                  title="Pay 50%"
                                >
                                  50%
                                </button>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">€</span>
                                <input
                                  autoFocus
                                  type="number"
                                  className="w-24 pl-6 pr-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                                  placeholder="Amount"
                                  value={paymentAmount}
                                  onChange={e => setPaymentAmount(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handlePayment(inv);
                                    if (e.key === 'Escape') {
                                      setEditingPaymentId(null);
                                      setPaymentAmount('');
                                    }
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => handlePayment(inv)}
                                className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                              >
                                <Check size={14} strokeWidth={3} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPaymentId(null);
                                  setPaymentAmount('');
                                }}
                                className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                              >
                                <X size={14} strokeWidth={3} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingPaymentId(inv.id);
                                  setPaymentAmount((inv.balanceDue || 0).toString());
                                }}
                                className="p-3 text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                                title="Record Payment"
                              >
                                <CreditCard size={20} />
                              </button>
                              <button
                                onClick={() => { setEditingInvoice(inv); setView('CREATE_INVOICE'); }}
                                className="p-3 text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-xl transition-all"
                                title="Edit"
                              >
                                <Edit size={20} />
                              </button>
                              <button
                                onClick={async () => {
                                  const previewWindow = window.open('about:blank', '_blank');
                                  try {
                                    const url = await generatePreviewUrl(inv, settings, undefined, user?.name || 'Admin');
                                    if (previewWindow) previewWindow.location.href = url;
                                  } catch (err) {
                                    console.error("Preview failed:", err);
                                    if (previewWindow) previewWindow.close();
                                    alert("Failed to generate preview.");
                                  }
                                }}
                                className="p-3 text-brand-600 bg-brand-50 hover:bg-brand-600 hover:text-white rounded-xl transition-all"
                                title="View PDF"
                              >
                                <Eye size={20} />
                              </button>
                              <button
                                onClick={() => handleSendEmail(inv)}
                                disabled={(inv.lastReminderSent && (new Date().getTime() - new Date(inv.lastReminderSent).getTime()) / (1000 * 60 * 60) < 4)}
                                className={`p-3 rounded-xl transition-all ${(inv.lastReminderSent && (new Date().getTime() - new Date(inv.lastReminderSent).getTime()) / (1000 * 60 * 60) < 4)
                                  ? 'text-slate-300 bg-slate-50 cursor-default'
                                  : 'text-brand-600 bg-brand-50 hover:bg-brand-500 hover:text-white'
                                  }`}
                                title={(inv.lastReminderSent && (new Date().getTime() - new Date(inv.lastReminderSent).getTime()) / (1000 * 60 * 60) < 4) ? "Email sent recently. Please wait 4 hours." : "Send Email"}
                              >
                                <Mail size={20} />
                              </button>
                              {inv.xeroSyncStatus !== 'synced' && (
                                <button
                                  onClick={() => inv.status === PaymentStatus.PAID && handleXeroTransfer(inv)}
                                  disabled={inv.status !== PaymentStatus.PAID}
                                  className={`p-3 rounded-xl transition-all ${inv.status === PaymentStatus.PAID
                                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-500 hover:text-white shadow-sm'
                                    : 'text-slate-300 bg-slate-50 cursor-not-allowed opacity-60'
                                    }`}
                                  title={inv.status === PaymentStatus.PAID ? "Send to Xero" : "Unpaid: Send to Xero (Locked - Fully pay to enable)"}
                                >
                                  <ArrowRightCircle size={20} />
                                </button>
                              )}
                              <button
                                onClick={() => downloadInvoicePDF(inv, settings, undefined, user?.name || 'Admin')}
                                className="p-3 text-slate-600 bg-slate-50 hover:bg-slate-500 hover:text-white rounded-xl transition-all"
                                title="Download"
                              >
                                <Download size={20} />
                              </button>
                              <button
                                onClick={() => handleDelete(inv)}
                                className="p-3 text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                                title="Delete"
                              >
                                <Trash2 size={20} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;
