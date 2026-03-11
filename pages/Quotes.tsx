import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Quote, PaymentStatus } from '../types';
import { FileText, Plus, Search, Eye, Trash2, CheckCircle, XCircle, Clock, Calendar, Edit, FileOutput, Download, MoreVertical } from 'lucide-react';
import { generatePreviewUrl, downloadInvoicePDF } from '../services/pdfService';

const Quotes = () => {
    const { user, invoices, setView, setEditingInvoice, settings, deleteInvoice } = useApp();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredQuotes = invoices.filter(inv =>
        (inv.documentType === 'quote' || inv.invoiceNumber.startsWith('QT-')) &&
        (inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const getStatusBadge = (status: Quote['status']) => {
        const config: Record<string, { style: string; icon: React.ReactNode; label: string }> = {
            PENDING: { style: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={10} />, label: 'PENDING' },
            ACCEPTED: { style: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle size={10} />, label: 'ACCEPTED' },
            REJECTED: { style: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle size={10} />, label: 'REJECTED' },
            EXPIRED: { style: 'bg-slate-50 text-slate-500 border-slate-200', icon: <Calendar size={10} />, label: 'EXPIRED' },
            UNPAID: { style: 'bg-slate-50 text-slate-500 border-slate-200', icon: <Clock size={10} />, label: 'UNPAID' },
        };
        const { style, icon, label } = config[status] || config['PENDING'];
        return (
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black border ${style} tracking-[0.1em]`}>
                {icon}{label}
            </span>
        );
    };

    // ⋯ Dropdown using position:fixed to escape overflow-hidden containers
    const QuoteActionMenu = ({ quote }: { quote: typeof filteredQuotes[0] }) => {
        const [open, setOpen] = useState(false);
        const [pos, setPos] = useState({ top: 0, right: 0 });
        const btnRef = useRef<HTMLButtonElement>(null);

        useEffect(() => {
            const close = (e: MouseEvent | TouchEvent) => {
                if (btnRef.current && !btnRef.current.closest('[data-menu]')?.contains(e.target as Node)) {
                    setOpen(false);
                }
            };
            document.addEventListener('mousedown', close);
            document.addEventListener('touchstart', close);
            return () => {
                document.removeEventListener('mousedown', close);
                document.removeEventListener('touchstart', close);
            };
        }, []);

        const handleOpen = () => {
            if (btnRef.current) {
                const rect = btnRef.current.getBoundingClientRect();
                setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
            }
            setOpen(v => !v);
        };

        const Item = ({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) => (
            <button
                onClick={() => { onClick(); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left
                    ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}`}
            >
                {icon}{label}
            </button>
        );

        return (
            <div data-menu="true" className="relative flex justify-center">
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
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{quote.invoiceNumber}</p>
                        </div>
                        <Item icon={<FileOutput size={15} />} label="Convert to Invoice" onClick={() => {
                            const convertToInvoice = () => {
                                const randomVal = Math.floor(1000 + Math.random() * 9000);
                                setEditingInvoice({
                                    ...quote,
                                    documentType: 'invoice' as const,
                                    invoiceNumber: `INV-${new Date().getFullYear()}-${randomVal}`,
                                    status: PaymentStatus.UNPAID
                                });
                                setView('CREATE_INVOICE');
                                setOpen(false);
                            };
                            convertToInvoice();
                        }} />
                        <Item icon={<Edit size={15} />} label="Edit Quote" onClick={() => { setEditingInvoice(quote); setView('CREATE_INVOICE'); }} />
                        <Item icon={<Eye size={15} />} label="Preview PDF" onClick={async () => {
                            const w = window.open('about:blank', '_blank');
                            try {
                                const url = await generatePreviewUrl(quote, settings, undefined, user?.name || 'Admin');
                                if (w) w.location.href = url;
                            } catch { if (w) w.close(); alert("Preview failed."); }
                        }} />
                        <Item icon={<Download size={15} />} label="Download PDF" onClick={() => downloadInvoicePDF(quote, settings, undefined, user?.name || 'Admin')} />
                        <div className="border-t border-slate-100 mt-1">
                            <Item icon={<Trash2 size={15} />} label="Delete Quote" onClick={() => {
                                if (window.confirm('Delete this quote?')) deleteInvoice(quote.id);
                            }} danger />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-[95%] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Quote <span className="text-brand-500">Manager</span></h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Create and manage customer quotes</p>
                </div>
                <button
                    onClick={() => {
                        setEditingInvoice({
                            id: '', documentType: 'quote',
                            invoiceNumber: `QT-${Date.now().toString().slice(-6)}`,
                            customerName: '', items: [], total: 0, subtotal: 0, taxAmount: 0,
                            balanceDue: 0, amountPaid: 0, status: PaymentStatus.PENDING,
                            dateIssued: new Date().toISOString(),
                            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            company: 'clonmel'
                        } as any);
                        setView('CREATE_INVOICE');
                    }}
                    className="flex items-center gap-2 px-6 py-4 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 font-black text-sm uppercase tracking-wider whitespace-nowrap"
                >
                    <Plus size={20} /> New Quote
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Search quotes by customer or quote number..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all text-sm font-semibold"
                />
            </div>

            {/* Table — no horizontal scroll needed */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-2xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-900 border-b-2 border-slate-800">
                        <tr className="text-white">
                            <th className="text-left py-4 px-5 text-[10px] font-black uppercase tracking-[0.2em]">Quote</th>
                            <th className="text-left py-4 px-5 text-[10px] font-black uppercase tracking-[0.2em] hidden sm:table-cell">Customer</th>
                            <th className="text-right py-4 px-5 text-[10px] font-black uppercase tracking-[0.2em]">Total</th>
                            <th className="text-center py-4 px-5 text-[10px] font-black uppercase tracking-[0.2em]">Status</th>
                            <th className="text-center py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredQuotes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
                                        <FileText size={40} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-semibold">No quotes found</p>
                                    <p className="text-slate-400 text-sm mt-2">Create your first quote to get started</p>
                                </td>
                            </tr>
                        ) : (
                            filteredQuotes.map(quote => (
                                <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-5">
                                        <div className="font-black text-slate-900 text-sm">{quote.invoiceNumber}</div>
                                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                            {new Date(quote.dateIssued).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                            {quote.company === 'mirrorzone' ? 'Mirrorzone' : 'Clonmel Glass'}
                                        </div>
                                        <div className="sm:hidden text-xs font-semibold text-slate-700 mt-1">{quote.customerName}</div>
                                    </td>
                                    <td className="py-4 px-5 hidden sm:table-cell">
                                        <div className="font-bold text-slate-900 text-sm">{quote.customerName}</div>
                                        {quote.customerEmail && <div className="text-xs text-slate-400 mt-0.5">{quote.customerEmail}</div>}
                                        {quote.validUntil && (
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                Valid: {new Date(quote.validUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4 px-5 text-right">
                                        <div className="font-black text-slate-900 text-sm whitespace-nowrap">{formatCurrency(quote.total)}</div>
                                    </td>
                                    <td className="py-4 px-5 text-center">
                                        {getStatusBadge(quote.status)}
                                    </td>
                                    <td className="py-4 px-3 text-center">
                                        <QuoteActionMenu quote={quote} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Quotes;
