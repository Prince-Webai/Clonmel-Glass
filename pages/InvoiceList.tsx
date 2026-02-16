import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils';
import { Invoice, PaymentStatus } from '../types';
import { Search, Download, Eye, Trash2, Edit, CheckCircle2, Clock, AlertCircle, CreditCard, Mail, ArrowRightCircle, Euro, X, Check } from 'lucide-react';
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

  const { style, icon, label } = config[status] || config[PaymentStatus.UNPAID];

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
    <div className="w-full max-w-[100px] flex flex-col gap-1">
      <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Progress</span>
        <span>{Math.round(percent)}%</span>
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
    if (window.confirm(`Transfer ${inv.invoiceNumber} to Xero?`)) {
      try {
        const fullCustomer = customers.find(c => c.id === inv.customerId);
        const success = await sendToXero(inv, fullCustomer, settings, user);
        if (success) alert("Transferred to Xero successfully!");
        else alert("Failed to transfer to Xero.");
      } catch (e) {
        console.error(e);
        alert("Xero transfer failed.");
      }
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
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70 border-b-2 border-slate-100">
                <th className="text-left py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                <th className="text-right py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                <th className="text-center py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Progress</th>
                <th className="text-center py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="text-center py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
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
                      <td className="py-6 px-10">
                        <div className="text-lg font-black text-slate-900">{inv.customerName || 'Unknown'}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">{inv.invoiceNumber}</div>
                        <div className="text-[10px] font-bold text-slate-600 mt-1">{formatDate(inv.dateIssued)}</div>
                      </td>
                      <td className="py-6 px-10 text-right">
                        <div className="text-sm font-black text-slate-900">{formatCurrency(inv.total)}</div>
                        <div className="text-[10px] font-bold text-rose-500 mt-0.5">Balance: {formatCurrency(inv.balanceDue || 0)}</div>
                      </td>
                      <td className="py-6 px-10 align-middle">
                        <ProgressBar paid={inv.amountPaid || 0} total={inv.total} />
                      </td>
                      <td className="py-6 px-10 text-center">
                        <StatusBadge status={inv.status} overdue={!!isOverdue} />
                      </td>
                      <td className="py-6 px-10">
                        <div className="flex items-center justify-center gap-2">
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
                                className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                                title="Record Payment"
                              >
                                <CreditCard size={16} />
                              </button>
                              <button
                                onClick={() => { setEditingInvoice(inv); setView('CREATE_INVOICE'); }}
                                className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-xl transition-all"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={async () => {
                                  const url = await generatePreviewUrl(inv, settings, undefined, user?.name || 'Admin');
                                  window.open(url, '_blank');
                                }}
                                className="p-2 text-brand-600 bg-brand-50 hover:bg-brand-600 hover:text-white rounded-xl transition-all"
                                title="View PDF"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleSendEmail(inv)}
                                className="p-2 text-violet-600 bg-violet-50 hover:bg-violet-500 hover:text-white rounded-xl transition-all"
                                title="Send via Email (n8n)"
                              >
                                <Mail size={16} />
                              </button>
                              <button
                                onClick={() => handleXeroTransfer(inv)}
                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-500 hover:text-white rounded-xl transition-all"
                                title="Send to Xero"
                              >
                                <ArrowRightCircle size={16} />
                              </button>
                              <button
                                onClick={() => downloadInvoicePDF(inv, settings, undefined, user?.name || 'Admin')}
                                className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-500 hover:text-white rounded-xl transition-all"
                                title="Download"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(inv)}
                                className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                                title="Delete"
                              >
                                <Trash2 size={16} />
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
