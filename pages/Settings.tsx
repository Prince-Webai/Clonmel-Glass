
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Save, Building2, Landmark, Calculator, FileText, CheckCircle2 } from 'lucide-react';

const Settings = () => {
    const { settings, updateSettings, isSyncing } = useApp();

    // Local state to handle form inputs
    const [formData, setFormData] = useState(settings);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'clonmel' | 'mirrorzone'>('clonmel');

    // Sync local state when global settings change (e.g. initial load)
    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'taxRate' ? parseFloat(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateSettings(formData);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to save settings", error);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Settings & Configuration</h2>
                {saveSuccess && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-right-4">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-bold">Settings Saved Successfully</span>
                    </div>
                )}
            </div>

            <div className="flex gap-4 bg-slate-100 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('clonmel')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${activeTab === 'clonmel' ? 'bg-white text-slate-900 shadow-sm scale-100' : 'bg-transparent text-slate-400 hover:text-slate-600 scale-95 hover:scale-100'}`}
                >
                    Clonmel Glass
                </button>
                <button
                    onClick={() => setActiveTab('mirrorzone')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${activeTab === 'mirrorzone' ? 'bg-slate-900 text-white shadow-brand-500/20 scale-100' : 'bg-transparent text-slate-400 hover:text-slate-600 scale-95 hover:scale-100'}`}
                >
                    MirrorZone
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'clonmel' ? (
                    <>
                        {/* Clonmel Company Details */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <Building2 size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Clonmel Glass Identity</h3>
                            </div>
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Company Name</label>
                                        <input
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">VAT Number</label>
                                        <input
                                            name="vatNumber"
                                            value={formData.vatNumber || ''}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Address</label>
                                        <input
                                            name="companyAddress"
                                            value={formData.companyAddress}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Phone</label>
                                        <input
                                            name="companyPhone"
                                            value={formData.companyPhone}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email</label>
                                        <input
                                            name="companyEmail"
                                            value={formData.companyEmail}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Website</label>
                                        <input
                                            name="companyWebsite"
                                            value={formData.companyWebsite}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Clonmel Bank Details */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <Landmark size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Clonmel Glass Banking</h3>
                            </div>
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Bank Name</label>
                                        <input
                                            name="bankName"
                                            value={formData.bankName}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Account Name</label>
                                        <input
                                            name="accountName"
                                            value={formData.accountName}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">IBAN</label>
                                        <input
                                            name="iban"
                                            value={formData.iban}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">BIC / Sort Code</label>
                                        <input
                                            name="bic"
                                            value={formData.bic}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-brand-500 outline-none transition-colors font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* MirrorZone Details */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-slate-900 text-white rounded-lg">
                                    <Building2 size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">MirrorZone Identity</h3>
                            </div>
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Company Name (MirrorZone)</label>
                                        <input
                                            name="mirrorZoneName"
                                            value={formData.mirrorZoneName || ''}
                                            onChange={handleChange}
                                            placeholder="MirrorZone"
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Address</label>
                                        <input
                                            name="mirrorZoneAddress"
                                            value={formData.mirrorZoneAddress || ''}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Phone</label>
                                        <input
                                            name="mirrorZonePhone"
                                            value={formData.mirrorZonePhone || ''}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email</label>
                                        <input
                                            name="mirrorZoneEmail"
                                            value={formData.mirrorZoneEmail || ''}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Website</label>
                                        <input
                                            name="mirrorZoneWebsite"
                                            value={formData.mirrorZoneWebsite || ''}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MirrorZone Banking */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <Landmark size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">MirrorZone Banking</h3>
                            </div>
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Bank Name</label>
                                        <input
                                            name="mirrorZoneBankName"
                                            value={formData.mirrorZoneBankName || ''}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Account Name</label>
                                        <input
                                            name="mirrorZoneAccountName"
                                            value={formData.mirrorZoneAccountName || ''}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">IBAN</label>
                                        <input
                                            name="mirrorZoneIban"
                                            value={formData.mirrorZoneIban || ''}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-purple-500 outline-none transition-colors font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">BIC / Sort Code</label>
                                        <input
                                            name="mirrorZoneBic"
                                            value={formData.mirrorZoneBic || ''}
                                            onChange={handleChange}
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold focus:border-purple-500 outline-none transition-colors font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Financials & Terms (Shared) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <Calculator size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Shared Financials</h3>
                    </div>
                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Standard VAT Rate (%)</label>
                            <input
                                type="number"
                                name="taxRate"
                                value={formData.taxRate}
                                onChange={handleChange}
                                className="w-32 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-brand-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Default Payment Terms </label>
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-400 mt-1">
                                    <FileText size={20} />
                                </div>
                                <textarea
                                    name="defaultNotes"
                                    value={formData.defaultNotes}
                                    onChange={handleChange}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-brand-500 outline-none transition-colors h-32 resize-y"
                                    placeholder="Enter default terms displayed on every new invoice..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Integrations */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-slate-900 text-white rounded-lg">
                            <FileText size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Integrations (Email)</h3>
                    </div>
                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Webhook URL (N8N / Zapier)</label>
                            <input
                                name="webhookUrl"
                                value={formData.webhookUrl || ''}
                                onChange={handleChange}
                                placeholder="https://..."
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-mono text-sm focus:border-brand-500 outline-none transition-colors"
                            />
                            <p className="text-[10px] text-slate-400 mt-2">
                                System will POST JSON data + PDF Base64 to this URL when sending requested.
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Xero Integration Webhook</label>
                            <input
                                name="xeroWebhookUrl"
                                value={formData.xeroWebhookUrl || ''}
                                onChange={handleChange}
                                placeholder="https://hooks.zapier.com/..."
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-mono text-sm focus:border-brand-500 outline-none transition-colors"
                            />
                            <p className="text-[10px] text-slate-400 mt-2">
                                System will POST full invoice JSON to this URL when "Transfer to Xero" is clicked.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 pb-20">
                    <button
                        type="submit"
                        disabled={isSyncing}
                        className="bg-brand-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 disabled:opacity-70 disabled:shadow-none"
                    >
                        {isSyncing ? (
                            <>Saving...</>
                        ) : (
                            <>
                                <Save size={20} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
