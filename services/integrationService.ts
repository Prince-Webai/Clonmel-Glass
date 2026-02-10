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
        LineItems: invoice.items.map(item => ({
            Description: item.description,
            Quantity: item.quantity,
            UnitAmount: item.unitPrice,
            AccountCode: "200"
        })),
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
