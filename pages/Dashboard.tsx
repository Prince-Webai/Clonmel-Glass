
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext.tsx';
import { PaymentStatus, UserRole, Invoice } from '../types';
import {
  Euro,
  FileText,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  BellRing,
  Mail,
  Sparkles,
  Activity,
  History,
  Send,
  User,
  Clock,
  Phone,
  X,
  Package,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  Lock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyzeInvoiceTrends, generateReminderMessage } from '../services/geminiService.ts';
import { generatePreviewUrl } from '../services/pdfService';
import { DatePicker } from '../components/DatePicker';

const safeRender = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val.message) return String(val.message);
    try {
      return JSON.stringify(val);
    } catch {
      return '—';
    }
  }
  return String(val);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const colorName = color?.split('-')[1] || 'slate';

  return (
    <div className="relative overflow-hidden bg-white/80 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-500 group">
      {/* Background Gradient Blur */}
      <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-10 bg-${colorName}-500 group-hover:opacity-20 transition-all duration-700`} />

      <div className="relative flex items-center justify-between z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{safeRender(label)}</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">{safeRender(value)}</h3>
        </div>
        <div className={`p-4 rounded-2xl ${color} shadow-2xl shadow-${colorName}-500/30 group-hover:scale-110 transition-all duration-500 transform group-hover:rotate-6`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
};

const ClientDetailModal = ({ invoice, onClose, onSendReminder, isReminding }: {
  invoice: Invoice,
  onClose: () => void,
  onSendReminder: (inv: Invoice) => void,
  isReminding: boolean
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(invoice.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />
      <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/50 relative z-10">
        {/* Modal Header */}
        <div className="p-10 bg-gradient-to-br from-slate-50/50 to-white/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`h-20 w-20 rounded-[2rem] flex items-center justify-center text-white shadow-2xl ${isOverdue ? 'bg-rose-500 shadow-rose-500/20' : 'bg-brand-600 shadow-brand-500/20'}`}>
              <User size={36} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{invoice.customerName}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Client Intelligence & Status</p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-all shadow-sm hover:shadow-md">
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-10 space-y-10 overflow-y-auto max-h-[65vh] custom-scrollbar">
          {/* Status & Contact Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="group flex items-center gap-4 text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:border-brand-100 transition-all">
                <div className="p-2 bg-white rounded-lg shadow-sm text-brand-500">
                  <Phone size={18} />
                </div>
                <span className="text-sm font-bold tracking-tight">{invoice.customerPhone || 'No phone provided'}</span>
              </div>
              <div className="group flex items-center gap-4 text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:border-brand-100 transition-all">
                <div className="p-2 bg-white rounded-lg shadow-sm text-brand-500">
                  <Mail size={18} />
                </div>
                <span className="text-sm font-bold tracking-tight">{invoice.customerEmail || 'No email provided'}</span>
              </div>
              <div className="group flex items-start gap-4 text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:border-brand-100 transition-all">
                <div className="p-2 bg-white rounded-lg shadow-sm text-brand-500">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="text-sm font-bold block leading-tight">Invoice {invoice.invoiceNumber}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">REF: {invoice.id.slice(-8).toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-2xl shadow-slate-900/20">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 bg-${isOverdue ? 'rose' : 'brand'}-500`} />
              <div className={`text-6xl font-black mb-2 tracking-tighter ${isOverdue ? 'text-rose-400' : 'text-brand-400'}`}>
                {Math.abs(diffDays)}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {isOverdue ? 'Days Overdue' : 'Days Remaining'}
              </div>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-300 bg-white/5 px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-sm uppercase">
                <Calendar size={14} className={isOverdue ? 'text-rose-400' : 'text-brand-400'} />
                Due {new Date(invoice.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Money Strip */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Total', value: invoice.total, color: 'text-slate-900' },
              { label: 'Paid', value: invoice.amountPaid, color: 'text-emerald-500' },
              { label: 'Current Balance', value: invoice.balanceDue, color: 'text-brand-500', highlight: true }
            ].map((stat, i) => (
              <div key={i} className={`p-6 rounded-3xl border ${stat.highlight ? 'bg-slate-50 border-brand-100 ring-2 ring-brand-500/5' : 'bg-white border-slate-100'} text-center transition-all hover:scale-105`}>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</div>
                <div className={`text-lg font-black ${stat.color}`}>{formatCurrency(stat.value)}</div>
              </div>
            ))}
          </div>

          {/* Detailed Items */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-6 h-[2px] bg-brand-500/30 rounded-full" />
              Inventory & Items
              <div className="flex-1 h-[1px] bg-slate-100" />
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40 transition-all cursor-default">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-50">
                      <Package size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-800 tracking-tight">{item.description}</div>
                      <div className="text-[10px] font-bold text-slate-400 tracking-wider">CODE: {item.productId.slice(0, 8).toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md inline-block mb-1">{item.quantity} units</div>
                    <div className="text-sm font-black text-slate-900">{formatCurrency(item.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {invoice.notes && (
            <div className="relative p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-blue-200 group-hover:text-blue-300 transition-colors">
                <Sparkles size={24} />
              </div>
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3">Project Directives</h4>
              <p className="text-xs text-blue-800 font-medium leading-relaxed italic border-l-4 border-blue-200 pl-4">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-10 bg-slate-900 flex gap-6 mt-auto shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
          <button
            onClick={onClose}
            className="flex-1 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-all border border-white/5 rounded-2xl hover:bg-white/5"
          >
            Collapse
          </button>
          <button
            onClick={() => onSendReminder(invoice)}
            disabled={isReminding}
            className="flex-[2] bg-brand-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-brand-500 shadow-2xl shadow-brand-600/30 transition-all flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95 transform"
          >
            {isReminding ? <Activity size={20} className="animate-spin" /> : <Send size={20} />}
            Trigger Collection Protocol
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { invoices, user, databaseError, updateInvoice, companyLogo, refreshDatabase, settings } = useApp();
  // Initialize state from session storage
  const [isLocked, setIsLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('dashboard_unlocked') !== 'true';
    }
    return true;
  });
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus effect
  useEffect(() => {
    if (isLocked && pinRefs.current[0]) {
      pinRefs.current[0]?.focus();
    }
  }, [isLocked]);

  // PIN Validation Effect
  useEffect(() => {
    const enteredPin = pin.join('');
    if (enteredPin.length === 4) {
      if (enteredPin === '1993') {
        setIsLocked(false);
        sessionStorage.setItem('dashboard_unlocked', 'true');
      } else {
        setError(true);
        const timer = setTimeout(() => {
          setPin(['', '', '', '']);
          setError(false);
          if (pinRefs.current[0]) pinRefs.current[0]?.focus();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [pin]);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple chars

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);

    // Auto-advance
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };



  // Force refresh on mount to ensure deleted items are gone if state was stale
  useEffect(() => {
    refreshDatabase();
  }, []);
  // Initialize with "previous 24 hours" mock logs
  const [automationLog, setAutomationLog] = useState<string[]>(() => {
    const logs = [];
    const now = new Date();

    // Generate some realistic past logs
    const events = [
      { offsetHr: 1, msg: "System health check initiated" },
      { offsetHr: 2, msg: "Database optimization completed" },
      { offsetHr: 5, msg: "Daily revenue report generated" },
      { offsetHr: 12, msg: "Payment gateway sync: 0 new transactions" },
      { offsetHr: 23, msg: "System backup completed successfully" }
    ];

    events.forEach(e => {
      const t = new Date(now.getTime() - e.offsetHr * 60 * 60 * 1000);
      const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      logs.push(`[${timeStr}] ${e.msg}`);
    });

    return logs;
  });
  const [manualRemindingId, setManualRemindingId] = useState<string | null>(null);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isRunningAutomation = useRef(false);

  const localReminderTracker = useRef<Record<string, string>>({});
  const [useLocalReminderMode, setUseLocalReminderMode] = useState(false);
  const localModeRef = useRef(false);
  const [trendView, setTrendView] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [dateFilter, setDateFilter] = useState<'all' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  // Filter invoices based on selected date range
  const filteredInvoices = useMemo(() => {
    if (dateFilter === 'all') return invoices;

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);

    return invoices.filter(inv => {
      const date = new Date(inv.dateIssued);
      switch (dateFilter) {
        case 'thisMonth':
          return date >= startOfThisMonth && date <= now;
        case 'lastMonth':
          return date >= startOfLastMonth && date <= endOfLastMonth;
        case 'thisYear':
          return date >= startOfThisYear && date <= now;
        case 'lastYear':
          return date >= startOfLastYear && date <= endOfLastYear;
        case 'custom':
          if (!customStartDate || !customEndDate) return true;
          return date >= new Date(customStartDate) && date <= new Date(customEndDate);
        default:
          return true;
      }
    });
  }, [invoices, dateFilter, customStartDate, customEndDate]);

  const isQuote = (inv: Invoice) => inv.documentType === 'quote' || inv.invoiceNumber.toUpperCase().startsWith('QT') || inv.invoiceNumber.toUpperCase().startsWith('qt');

  const totalRevenue = filteredInvoices.filter(inv => !isQuote(inv)).reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
  const invoiceOutstanding = filteredInvoices.filter(inv => !isQuote(inv)).reduce((acc, inv) => acc + (Number(inv.balanceDue) || 0), 0);
  const quoteOutstanding = filteredInvoices.filter(inv => isQuote(inv)).reduce((acc, inv) => acc + (Number(inv.total) || 0), 0);
  const paidInvoices = filteredInvoices.filter(i => i.status === PaymentStatus.PAID && !isQuote(i)).length;

  const reminderCandidates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    return invoices.filter(inv => {
      // Helper check
      const isQuote = inv.documentType === 'quote' || inv.invoiceNumber.toUpperCase().startsWith('QT') || inv.invoiceNumber.toUpperCase().startsWith('qt');
      if (isQuote) return false;
      if (inv.status === PaymentStatus.PAID) return false;
      if (!inv.dueDate) return false;

      const dueDate = new Date(inv.dueDate);
      if (isNaN(dueDate.getTime())) return false; // Check for invalid date

      dueDate.setHours(0, 0, 0, 0);
      return dueDate <= threeDaysFromNow;
    }).sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [invoices]);

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return invoices.filter(inv =>
      !(inv.documentType === 'quote' || inv.invoiceNumber.toUpperCase().startsWith('QT') || inv.invoiceNumber.toUpperCase().startsWith('qt')) &&
      inv.status !== PaymentStatus.PAID &&
      inv.dueDate &&
      !isNaN(new Date(inv.dueDate).getTime()) &&
      new Date(inv.dueDate) < today
    ).length;
  }, [invoices]);

  // Remove automated reminder automation as requested (switching to manual/batch)
  /*
  useEffect(() => {
    const runAutomation = async () => {
      if (isRunningAutomation.current || invoices.length === 0 || databaseError) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const dueForAutoReminder = invoices.filter(inv => {
        if (inv.status === PaymentStatus.PAID) return false;
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const twoDaysBefore = new Date(dueDate);
        twoDaysBefore.setDate(dueDate.getDate() - 2);

        const isOverdue = dueDate.getTime() < today.getTime();
        const isExactlyTwoDaysBefore = twoDaysBefore.getTime() === today.getTime();

        const lastSent = localModeRef.current ? localReminderTracker.current[inv.id] : inv.lastReminderSent;
        const needsReminding = lastSent !== todayStr;

        return (isOverdue || isExactlyTwoDaysBefore) && needsReminding;
      });

      if (dueForAutoReminder.length > 0) {
        isRunningAutomation.current = true;
        const logs: string[] = [];
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        for (const inv of dueForAutoReminder) {
          try {
            if (!inv.id) continue;

            if (localModeRef.current) {
              localReminderTracker.current[inv.id] = todayStr;
              logs.push(`[${nowStr}] [Auto-Mail] Proactive reminder triggered for ${safeRender(inv.customerName)}`);
            } else {
              try {
                await updateInvoice({
                  ...inv,
                  lastReminderSent: todayStr
                });
                logs.push(`[${nowStr}] [Auto-Mail] Reminder queued for ${safeRender(inv.customerName)} (Inv: ${safeRender(inv.invoiceNumber)})`);
              } catch (innerError: any) {
                if (innerError.message === 'COLUMN_MISSING_REMINDER') {
                  localModeRef.current = true;
                  setUseLocalReminderMode(true);
                  localReminderTracker.current[inv.id] = todayStr;
                  logs.push(`[${nowStr}] ⚠️ Switch: Tracking auto-reminders locally.`);
                } else {
                  throw innerError;
                }
              }
            }
          } catch (e: any) {
            logs.push(`[${nowStr}] Failed for ${safeRender(inv.invoiceNumber)}: ${e?.message || 'Error'}`);
          }
        }

        if (logs.length > 0) {
          setAutomationLog(prev => [...logs, ...prev].slice(0, 50));
        }
        isRunningAutomation.current = false;
      }
    };

    runAutomation();
  }, [invoices.length, databaseError, updateInvoice]);
  */

  const handleManualReminder = async (inv: Invoice) => {
    setManualRemindingId(inv.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(inv.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    try {
      const message = await generateReminderMessage(
        inv.customerName,
        inv.invoiceNumber,
        inv.balanceDue,
        diffDays
      );

      const todayStr = today.toISOString().split('T')[0];
      if (!localModeRef.current) {
        try {
          await updateInvoice({ ...inv, lastReminderSent: todayStr });
        } catch (e: any) {
          if (e.message === 'COLUMN_MISSING_REMINDER') {
            localModeRef.current = true;
            setUseLocalReminderMode(true);
            localReminderTracker.current[inv.id] = todayStr;
          }
        }
      } else {
        localReminderTracker.current[inv.id] = todayStr;
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAutomationLog(prev => [`[${nowStr}] [Manual-AI] Sent to ${inv.customerEmail || inv.customerName}: "${message.slice(0, 30)}..."`, ...prev]);
      alert(`AI Reminder Generated & "Sent" to ${inv.customerName}:\n\n${message}`);
    } catch (e) {
      alert("Failed to generate AI reminder.");
    } finally {
      setManualRemindingId(null);
    }
  };

  const handlePreview = async (inv: Invoice) => {
    try {
      const url = await generatePreviewUrl(inv, settings, companyLogo, user?.name || 'Admin');
      setPreviewUrl(url);
    } catch (e) {
      alert("Preview failed.");
    }
  };

  // AI Insights removed as per request
  // Effect was here


  // Group invoices by period based on trendView
  const chartData = useMemo(() => {
    const dataDisplay: Record<string, number> = {};
    const now = new Date();

    // Filter invoices first
    const relevantInvoices = invoices.filter(inv => !(inv.documentType === 'quote' || inv.invoiceNumber.toUpperCase().startsWith('QT') || inv.invoiceNumber.toUpperCase().startsWith('qt')));

    if (trendView === 'yearly') {
      // Yearly view - Last 5 years
      const years = [];
      const currentYear = now.getFullYear();
      for (let i = 4; i >= 0; i--) {
        const year = currentYear - i;
        dataDisplay[year.toString()] = 0;
        years.push({ key: year.toString(), label: year.toString() });
      }

      relevantInvoices.forEach(inv => {
        const date = new Date(inv.dateIssued);
        const year = date.getFullYear().toString();
        if (dataDisplay[year] !== undefined) {
          dataDisplay[year] += Number(inv.total);
        }
      });

      return years.map(year => ({
        name: year.label,
        amount: dataDisplay[year.key]
      }));
    } else if (trendView === 'monthly') {
      // Monthly view - Last 12 months
      const months = [];
      const today = new Date();

      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        dataDisplay[key] = 0;
        months.push({ key, label });
      }

      relevantInvoices.forEach(inv => {
        const date = new Date(inv.dateIssued);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (dataDisplay[key] !== undefined) {
          dataDisplay[key] += Number(inv.total);
        }
      });

      return months.map(month => ({
        name: month.label,
        amount: dataDisplay[month.key]
      }));
    } else if (trendView === 'weekly') {
      // Weekly view - Last 8 weeks
      const weeks = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const key = weekStart.toLocaleDateString('en-CA');
        const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        dataDisplay[key] = 0;
        weeks.push({ key, label, startDate: new Date(weekStart), endDate: new Date(weekEnd) });
      }

      relevantInvoices.forEach(inv => {
        const dateToUse = (inv.status === PaymentStatus.PAID && inv.paymentDate) ? inv.paymentDate : inv.dateIssued;
        const date = new Date(dateToUse);

        weeks.forEach(week => {
          if (date >= week.startDate && date <= week.endDate) {
            dataDisplay[week.key] += Number(inv.total);
          }
        });
      });

      return weeks.map(week => ({
        name: week.label,
        amount: dataDisplay[week.key]
      }));
    } else if (trendView === 'custom') {
      // Custom Range View - Daily granularity
      if (!customStartDate || !customEndDate) return [];

      const days = [];

      // Helper to parse 'YYYY-MM-DD' as local midnight
      const parseLocal = (dateStr: string) => {
        if (!dateStr) return new Date();
        if (dateStr.includes('T')) return new Date(dateStr);
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(dateStr);
      };

      // Helper to strictly format YYYY-MM-DD in local time
      const formatDateKey = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const start = parseLocal(customStartDate);
      const end = parseLocal(customEndDate);
      // Ensure end date includes the full day
      end.setHours(23, 59, 59, 999);

      // Create stats for every day in the range
      const current = new Date(start);
      while (current <= end) {
        const key = formatDateKey(current);
        dataDisplay[key] = 0;
        days.push({ key, label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
        current.setDate(current.getDate() + 1);
      }

      relevantInvoices.forEach(inv => {
        const dateToUse = (inv.status === PaymentStatus.PAID && inv.paymentDate) ? inv.paymentDate : inv.dateIssued;

        let date: Date;
        if (dateToUse && !dateToUse.includes('T') && dateToUse.match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = parseLocal(dateToUse);
        } else {
          date = new Date(dateToUse);
        }

        const key = formatDateKey(date);

        if (dataDisplay[key] !== undefined) {
          dataDisplay[key] += Number(inv.total);
        }
      });

      return days.map(day => ({
        name: day.label,
        amount: dataDisplay[day.key]
      }));
    } else {
      // Daily view - Last 14 days
      const days = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Helper to parse 'YYYY-MM-DD' as local midnight
      const parseLocal = (dateStr: string) => {
        if (!dateStr) return new Date();
        // If it's already a full ISO string (with T), standard Date parse is usually okay if we want point-in-time,
        // but for 'YYYY-MM-DD' used in dateIssued, we want LOCAL day.
        if (dateStr.includes('T')) return new Date(dateStr);

        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(dateStr);
      };

      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toLocaleDateString('en-CA'); // Local YYYY-MM-DD
        dataDisplay[key] = 0; // Initialize
        days.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
      }

      relevantInvoices.forEach(inv => {
        // Use paymentDate for paid items (Cash Flow view), otherwise issue date
        const dateToUse = (inv.status === PaymentStatus.PAID && inv.paymentDate) ? inv.paymentDate : inv.dateIssued;

        let date: Date;
        // Ensure we parse YYYY-MM-DD as LOCAL start-of-day
        if (dateToUse && !dateToUse.includes('T') && dateToUse.match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = parseLocal(dateToUse);
        } else {
          date = new Date(dateToUse);
        }

        const key = date.toLocaleDateString('en-CA'); // Local YYYY-MM-DD

        // Only count if within our initialized range
        if (dataDisplay[key] !== undefined) {
          dataDisplay[key] += Number(inv.total);
        }
      });


      return days.map(day => ({
        name: day.label, // Display label (e.g., "Jan 24")
        amount: dataDisplay[day.key] // Aggregated amount
      }));
    }
  }, [invoices, trendView, customStartDate, customEndDate]);

  const handleSendAllReminders = async () => {
    if (reminderCandidates.length === 0) return;

    const count = reminderCandidates.length;
    if (!window.confirm(`Send reminders for all ${count} overdue/due today invoices at once?`)) return;

    // Process in sequence to avoid overwhelming the webhook
    const today = new Date().toISOString().split('T')[0];

    for (const inv of reminderCandidates) {
      const lastSent = localModeRef.current ? localReminderTracker.current[inv.id] : inv.lastReminderSent;

      if (lastSent !== today) {
        setManualRemindingId(inv.id);
        try {
          await handleManualReminder(inv);
        } catch (e) {
          console.error(`Failed to send reminder for ${inv.invoiceNumber}`, e);
        }
      }
    }

    setManualRemindingId(null);
    alert(`Batch reminder process completed (if any were due).`);
  };

  const dashboardLocked = isLocked || !sessionStorage.getItem('dashboard_unlocked');
  if (dashboardLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 max-w-sm w-full text-center">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-800 shadow-inner">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Dashboard Locked</h2>
          <p className="text-sm text-slate-500 font-bold mb-8 uppercase tracking-wide">Enter PIN to Unlock</p>

          <div className="flex justify-center gap-3 mb-8">
            {pin.map((digit, idx) => (
              <input
                key={idx}
                ref={el => pinRefs.current[idx] = el}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handlePinChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className={`w-12 h-16 text-center text-2xl font-black rounded-2xl border-2 outline-none transition-all duration-200
                        ${error
                    ? 'border-rose-200 bg-rose-50 text-rose-500 animate-shake'
                    : 'border-slate-100 bg-slate-50 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 text-slate-800'
                  }`}
              />
            ))}
          </div>

          <div className="text-[10px] bg-slate-50 p-3 rounded-xl text-slate-400 font-bold uppercase tracking-widest">
            SECURED ACCESS ONLY
          </div>
        </div>
      </div>
    );
  }

  return (

    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Client Detail Modal */}
      {/* Custom Date Range Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => { setShowCustomDateModal(false); setDateFilter('all'); }}
          />
          <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 space-y-8 animate-in zoom-in-95 duration-300 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Filter <span className="text-brand-500">Range</span></h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select dates for analytics</p>
              </div>
              <button
                onClick={() => { setShowCustomDateModal(false); setDateFilter('all'); }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <DatePicker
                label="Start Date"
                value={customStartDate}
                onChange={setCustomStartDate}
              />
              <DatePicker
                label="End Date"
                value={customEndDate}
                onChange={setCustomEndDate}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => { setShowCustomDateModal(false); setDateFilter('all'); }}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-xs text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all border-2 border-transparent hover:border-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customStartDate && customEndDate) {
                    setDateFilter('custom');
                    setShowCustomDateModal(false);
                  }
                }}
                disabled={!customStartDate || !customEndDate}
                className="flex-[1.5] py-4 px-6 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoiceForDetail && (
        <ClientDetailModal
          invoice={selectedInvoiceForDetail}
          onClose={() => setSelectedInvoiceForDetail(null)}
          onSendReminder={handleManualReminder}
          isReminding={manualRemindingId === selectedInvoiceForDetail.id}
        />
      )}

      {/* Modern Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            Dashboard
          </h2>
          <p className="text-slate-500 font-medium mt-1">Overview & Operations Center</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Filter Dropdown */}
          <div className="relative">
            <select
              value={dateFilter === 'custom' ? 'custom' : dateFilter}
              onChange={(e) => {
                const val = e.target.value as any;
                if (val === 'custom') {
                  setShowCustomDateModal(true);
                } else {
                  setDateFilter(val);
                }
              }}
              className="appearance-none bg-white text-xs font-black text-slate-700 px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm outline-none focus:border-brand-500 cursor-pointer pr-8"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
              <option value="lastYear">Last Year</option>
              <option value="custom">Custom Range...</option>
            </select>
            <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
          </div>

          <div className={`text-xs font-black px-5 py-2.5 rounded-2xl border flex items-center gap-2 shadow-sm transition-all ${useLocalReminderMode ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            <Activity size={14} className={useLocalReminderMode ? '' : 'animate-pulse'} />
            {useLocalReminderMode ? 'LOCAL MODE' : 'SYSTEM ACTIVE'}
          </div>
          <div className="text-xs font-black bg-white text-slate-700 px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <button
            onClick={() => {
              setIsLocked(true);
              setPin(['', '', '', '']);
              sessionStorage.removeItem('dashboard_unlocked');
            }}
            className="p-3 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-2xl border border-slate-200 shadow-sm transition-all"
            title="Lock Dashboard"
          >
            <Lock size={20} />
          </button>
        </div>
      </div>

      {/* Top Row - Main Metrics (Premium Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={Euro} color="bg-emerald-500" />
        <StatCard label="Outstanding" value={formatCurrency(invoiceOutstanding)} icon={AlertCircle} color="bg-rose-500" />
        <StatCard label="Quotes Value" value={formatCurrency(quoteOutstanding)} icon={FileText} color="bg-violet-500" />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard label="Active Invoices" value={invoices.filter(i => !(i.documentType === 'quote' || i.invoiceNumber.toUpperCase().startsWith('QT') || i.invoiceNumber.toUpperCase().startsWith('qt')) && i.status !== PaymentStatus.PAID).length} icon={Package} color="bg-slate-800" />
        <StatCard label="Action Needed" value={overdueCount} icon={BellRing} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {/* Payment Action Center (Premium) */}
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                  <Clock size={18} />
                </div>
                Priority Actions
              </h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSendAllReminders}
                  disabled={reminderCandidates.length === 0 || manualRemindingId !== null}
                  className="text-[10px] font-black text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl border border-brand-100 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={12} />
                  Send All Overdue
                </button>
                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-wider">
                  {reminderCandidates.length} Pending
                </span>
              </div>
            </div>
            <div className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar bg-slate-50/30">
              {reminderCandidates.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">All Clear!</h4>
                  <p className="text-sm text-slate-400 font-medium mt-1">No collections pending action.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reminderCandidates.map(inv => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(inv.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const isOverdue = dueDate < today;
                    const isDueToday = dueDate.getTime() === today.getTime();
                    const lastSent = useLocalReminderMode ? localReminderTracker.current[inv.id] : inv.lastReminderSent;

                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedInvoiceForDetail(inv)}
                        className={`group p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 cursor-pointer bg-white relative overflow-hidden ${isOverdue ? 'border-rose-100 shadow-sm shadow-rose-100/50' : 'border-slate-100 shadow-sm shadow-slate-200/40'}`}
                      >
                        {isOverdue && (
                          <div className="absolute top-0 right-0 w-24 h-24 blur-3xl opacity-5 bg-rose-500" />
                        )}
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                            <div className={`p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 ${isOverdue ? 'bg-rose-50 text-rose-600 shadow-xl shadow-rose-500/10' : 'bg-slate-50 text-slate-600'}`}>
                              <User size={22} />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h4 className="font-black text-slate-900 text-xl tracking-tight group-hover:text-brand-600 transition-colors">{safeRender(inv.customerName)}</h4>
                                {isOverdue && (
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-rose-100">Overdue</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-bold mt-1.5 flex items-center gap-2">
                                <span className="tracking-widest uppercase">#{safeRender(inv.invoiceNumber)}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="tracking-tight">{inv.customerPhone || 'No Phone'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 pl-12 md:pl-0 border-t md:border-t-0 border-slate-50 pt-4 md:pt-0" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right mr-4">
                              <div className="text-lg font-black text-slate-900 tracking-tight">{formatCurrency(inv.balanceDue)}</div>
                              <div className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${isOverdue ? 'text-rose-500' : isDueToday ? 'text-brand-500' : 'text-slate-400'}`}>
                                {isOverdue ? 'CRITICAL' : isDueToday ? 'DUE TODAY' : `${Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24))} DAYS REMAINING`}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePreview(inv); }}
                                className="p-3.5 rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200 active:scale-90"
                                title="View PDF"
                              >
                                <Eye size={18} />
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); handleManualReminder(inv); }}
                                disabled={manualRemindingId === inv.id || lastSent === today.toISOString().split('T')[0]}
                                className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-2xl active:scale-95 ${lastSent === today.toISOString().split('T')[0]
                                  ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-default shadow-none'
                                  : 'bg-slate-900 text-white hover:bg-brand-600 shadow-slate-900/20'
                                  }`}
                              >
                                {manualRemindingId === inv.id ? <RefreshCcw size={14} className="animate-spin" /> : <Send size={14} />}
                                {lastSent === today.toISOString().split('T')[0] ? 'SENT' : 'REMIND'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-500" />
                {trendView === 'yearly' ? 'Yearly' : trendView === 'monthly' ? 'Monthly' : trendView === 'weekly' ? 'Weekly' : 'Daily'} Revenue Trends
              </h3>
              <div className="flex bg-slate-200/50 p-1 rounded-lg">
                <button
                  onClick={() => setTrendView('daily')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${trendView === 'daily' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setTrendView('weekly')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${trendView === 'weekly' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setTrendView('monthly')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${trendView === 'monthly' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setTrendView('yearly')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${trendView === 'yearly' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Yearly
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button
                  onClick={() => {
                    setTrendView('custom');
                    setShowCustomDateModal(true);
                  }}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${trendView === 'custom' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Custom
                </button>
              </div>
            </div>
            <div className="p-6 h-80">

              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(value) => `€${value.toLocaleString()}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc', radius: 12 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/50 animate-in zoom-in-95 duration-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                            <p className="text-lg font-black text-slate-900">
                              {formatCurrency(payload[0].value as number)}
                            </p>
                            <div className="mt-2 w-8 h-1 bg-brand-500 rounded-full" />
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="url(#barGradient)"
                    radius={[12, 12, 12, 12]}
                    barSize={32}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.amount > 0 ? 'url(#barGradient)' : '#f1f5f9'}
                        className="transition-all duration-500 hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {
        previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-8 backdrop-blur-xl">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center px-10 py-6 border-b-2 border-slate-50 bg-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Invoice Preview</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PDF Document Viewer</p>
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
        )
      }


    </div >
  );
};

const RefreshCcw = ({ size, className }: { size: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

const CheckCircle = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default Dashboard;
