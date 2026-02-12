import React from 'react';
import { useApp } from '../contexts/AppContext';

const InvoiceListTest = () => {
    const { invoices, setView } = useApp();

    const actualInvoices = invoices.filter(inv =>
        (inv.documentType === 'invoice' || !inv.documentType) &&
        inv.invoiceNumber &&
        !inv.invoiceNumber.startsWith('QT-')
    );

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Invoice List Debug</h1>
            <p className="mb-4">Total invoices in system: {invoices.length}</p>
            <p className="mb-4">Filtered invoices (should show): {actualInvoices.length}</p>

            {actualInvoices.length === 0 ? (
                <div className="bg-yellow-50 p-4 rounded">
                    <p className="font-bold">No invoices to display</p>
                    <p className="text-sm">This could be why you see a blank page.</p>
                </div>
            ) : (
                <div>
                    <p className="font-bold mb-2">Invoices:</p>
                    <ul className="list-disc pl-5">
                        {actualInvoices.map(inv => (
                            <li key={inv.id}>
                                {inv.invoiceNumber} - {inv.customerName || 'No name'} - {inv.documentType || 'No type'}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <button
                onClick={() => setView('CREATE_INVOICE')}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            >
                Go to Create Invoice
            </button>
        </div>
    );
};

export default InvoiceListTest;
