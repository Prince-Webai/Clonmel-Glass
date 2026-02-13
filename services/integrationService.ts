import { Invoice, Customer, AppSettings, User } from '../types';

export const sendToXero = async (invoice: Invoice, customer: Customer | undefined, settings: AppSettings, user?: User | null): Promise<boolean> => {
    if (!settings.xeroWebhookUrl) {
        throw new Error("Xero Webhook URL not configured");
    }

    const xeroInvoice = {
        Type: 'ACCREC',
        Contact: {
            Name: customer?.name || invoice.customerName || 'Unknown Customer',
            EmailAddress: customer?.email || invoice.customerEmail || '',
            Phones: customer?.phone ? [{ PhoneType: 'DEFAULT', PhoneNumber: customer.phone }] : [],
            Addresses: [
                {
                    AddressType: 'POBOX', // Xero uses POBOX for postal
                    AddressLine1: customer?.address || invoice.customerAddress || '',
                    AddressLine2: customer?.addressLine2 || '',
                    City: customer?.city || '',
                    Region: customer?.region || '',
                    PostalCode: customer?.postalCode || '',
                    Country: customer?.country || ''
                }
            ]
        },
        Date: invoice.dateIssued.split('T')[0],
        DueDate: invoice.dueDate.split('T')[0],
        Reference: invoice.invoiceNumber,
        Status: 'AUTHORISED',
        LineAmountTypes: 'Exclusive',
        LineItems: invoice.items.map(item => {
            // Fix for Xero: Clonmel 'sqm' items should have integer quantities (1, 2, etc.)
            // We calculate the total line value, round the quantity up to the nearest integer,
            // and adjust the unit price so the total remains correct.
            const isSqm = item.unit === 'sqm' || (item.description && item.description.toLowerCase().includes('sqm'));

            // Calculate precise tax per item to ensure it matches the Invoice Hub total
            // This overrides Xero's auto-calculation to prevent penny-rounding differences
            const taxRateDecimal = (invoice.taxRate || 0) / 100;

            if (isSqm && item.quantity % 1 !== 0) {
                const cleanQty = Math.ceil(item.quantity);
                const totalLineValue = item.quantity * item.unitPrice;
                const adjustedUnitPrice = totalLineValue / cleanQty;
                const taxAmount = totalLineValue * taxRateDecimal;

                return {
                    Description: `${item.description} (Qty Adjusted: ${item.quantity} -> ${cleanQty})`,
                    Quantity: cleanQty,
                    UnitAmount: Number(adjustedUnitPrice.toFixed(4)), // Xero handles 4 decimal places well
                    TaxAmount: Number(taxAmount.toFixed(2)),
                    AccountCode: "200"
                };
            }

            const lineTotal = item.quantity * item.unitPrice;
            const taxAmount = lineTotal * taxRateDecimal;

            return {
                Description: item.description,
                Quantity: item.quantity,
                UnitAmount: item.unitPrice,
                TaxAmount: Number(taxAmount.toFixed(2)),
                AccountCode: "200"
            };
        }),
        // Custom Metadata for Webhook (ignored by Xero if mapped selectively, useful for Zapier/Make)
        _metadata: {
            source: 'Clonmel Glass Invoice Hub',
            transferredBy: user?.email || 'system',
            timestamp: new Date().toISOString(),
            company: settings.companyName
        }
    };

    const payload = xeroInvoice;

    try {
        const response = await fetch(settings.xeroWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        return response.ok;
    } catch (error) {
        console.error("Xero Transfer Failed:", error);
        return false;
    }
};
