import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Quote, PaymentStatus } from '../types';
import { FileText, Plus, Search, Eye, Trash2, CheckCircle, XCircle, Clock, Calendar, Edit, FileOutput } from 'lucide-react';
import { generatePreviewUrl } from '../services/pdfService';

const Quotes = () => {
    const { user, invoices, setView, setEditingInvoice } = useApp();
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
        const config = {
            PENDING: {
                style: 'bg-amber-50 text-amber-700 border-amber-200',
                icon: <Clock size={10} />,
                label: 'PENDING'
            },
            // Fallback for quotes created with Invoice status
            [PaymentStatus.UNPAID]: {
                style: 'bg-amber-50 text-amber-700 border-amber-200',
                icon: <Clock size={10} />,
                label: 'PENDING'
            },
            ACCEPTED: {
                style: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                icon: <CheckCircle size={10} />,
                label: 'ACCEPTED'
            },
            [PaymentStatus.PAID]: {
                style: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                icon: <CheckCircle size={10} />,
                label: 'ACCEPTED'
            },
            REJECTED: {
                style: 'bg-rose-50 text-rose-700 border-rose-200',
                icon: <XCircle size={10} />,
                label: 'REJECTED'
            },
            EXPIRED: {
                style: 'bg-slate-50 text-slate-600 border-slate-200',
                icon: <Calendar size={10} />,
                label: 'EXPIRED'
            }
        };

        const { style, icon, label } = config[status] || config['PENDING'];
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border transition-all shadow-sm ${style} tracking-widest`}>
                {icon}
                {label}
            </span>
        );
    };

    return (
        <div className="max-w-[95%] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Quote <span className="text-brand-500">Manager</span></h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Create and manage customer quotes</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="flex items-center gap-2 px-6 py-4 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 font-black text-sm uppercase tracking-wider">
                        <Plus size={20} />
                        New Quote
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Search quotes by customer or quote number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all text-sm font-semibold"
                />
            </div>

            {/* Quotes Table */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-2xl">
                <table className="w-full">
                    <thead className="bg-slate-900 border-b-2 border-slate-800">
                        <tr className="text-white">
                            <th className="text-left py-6 px-10 text-[10px] font-black uppercase tracking-[0.2em]">Quote Details</th>
                            <th className="text-left py-6 px-10 text-[10px] font-black uppercase tracking-[0.2em]">Customer</th>
                            <th className="text-right py-6 px-10 text-[10px] font-black uppercase tracking-[0.2em]">Amount</th>
                            <th className="text-center py-6 px-10 text-[10px] font-black uppercase tracking-[0.2em]">Valid Until</th>
                            <th className="text-center py-6 px-10 text-[10px] font-black uppercase tracking-[0.2em]">Status</th>
                            <th className="text-center py-6 px-10 text-[10px] font-black uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredQuotes.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
                                        <FileText size={40} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-semibold">No quotes found</p>
                                    <p className="text-slate-400 text-sm mt-2">Create your first quote to get started</p>
                                </td>
                            </tr>
                        ) : (
                            filteredQuotes.map(quote => (
                                <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="py-6 px-10">
                                        <div className="text-lg font-black text-slate-900 tracking-tight">{quote.invoiceNumber}</div>
                                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                            Issued: {new Date(quote.dateIssued).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                            {quote.company === 'mirrorzone' ? 'Mirrorzone' : 'Clonmel Glass'}
                                        </div>
                                    </td>
                                    <td className="py-6 px-10">
                                        <div className="font-bold text-slate-900">{quote.customerName}</div>
                                        {quote.customerEmail && (
                                            <div className="text-xs text-slate-500 mt-1">{quote.customerEmail}</div>
                                        )}
                                    </td>
                                    <td className="py-6 px-10 text-right whitespace-nowrap">
                                        <div className="text-sm font-black text-slate-900">{formatCurrency(quote.total)}</div>
                                    </td>
                                    <td className="py-6 px-10 text-center">
                                        <div className="text-xs font-bold text-slate-600">
                                            {quote.validUntil
                                                ? new Date(quote.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : '-'}
                                        </div>
                                    </td>
                                    <td className="py-6 px-10 text-center">
                                        {getStatusBadge(quote.status)}
                                    </td>
                                    <td className="py-6 px-10">
                                        <div className="flex items-center justify-center gap-2 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    // Convert logic: load quote but set as invoice
                                                    const quoteAsInvoice = { ...quote, documentType: 'invoice' as const };
                                                    setEditingInvoice(quoteAsInvoice);
                                                    setView('CREATE_INVOICE');
                                                }}
                                                className="p-3 text-purple-600 bg-purple-50 hover:bg-purple-500 hover:text-white rounded-2xl transition-all shadow-sm"
                                                title="Convert to Invoice"
                                            >
                                                <FileOutput size={18} />
                                            </button>
                                            <button
                                                onClick={() => { setEditingInvoice(quote); setView('CREATE_INVOICE'); }}
                                                className="p-3 text-amber-500 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-2xl transition-all shadow-sm"
                                                title="Edit Quote"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const url = await generatePreviewUrl(quote);
                                                    window.open(url, '_blank');
                                                }}
                                                className="p-3 text-brand-500 bg-brand-50 hover:bg-brand-500 hover:text-white rounded-2xl transition-all shadow-sm"
                                                title="View Quote PDF"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                className="p-3 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-sm"
                                                title="Delete Quote"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
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
