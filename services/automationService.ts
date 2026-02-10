import { Invoice, Customer, AppSettings, PaymentStatus } from '../types';
import { sendInvoiceViaWebhook } from './pdfService';

const REMINDER_GAP_MS = 3 * 24 * 60 * 60 * 1000; // 3 Days in milliseconds
const MAX_REMINDERS = 4;

const MAX_DAILY_AUTOMATED_EMAILS = 50;

const getDailyEmailCount = (): number => {
    const today = new Date().toISOString().split('T')[0];
    const key = `automation_daily_count_${today}`;
    const count = localStorage.getItem(key);
    return count ? parseInt(count, 10) : 0;
};

const incrementDailyEmailCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const key = `automation_daily_count_${today}`;
    const current = getDailyEmailCount();
    localStorage.setItem(key, (current + 1).toString());
};

export const checkAndProcessAutomatedReminders = async (
    invoices: Invoice[],
    customers: Customer[],
    settings: AppSettings,
    companyLogo: string | undefined,
    updateInvoice: (invoice: Invoice) => void
) => {
    if (!settings.webhookUrl) return;

    if (getDailyEmailCount() >= MAX_DAILY_AUTOMATED_EMAILS) {
        console.log("Automated Reminder Service: Daily limit reached. Skipping checks.");
        return;
    }

    console.log("Running Automated Reminder Check...");
    let sentCount = 0;

    for (const inv of invoices) {
        // Double check limit inside loop in case we hit it mid-process
        if (getDailyEmailCount() >= MAX_DAILY_AUTOMATED_EMAILS) {
            console.log("Automated Reminder Service: Daily limit hit during processing. Stopping.");
            break;
        }

        // 1. Filter: Must be Unpaid or Partially Paid
        if (inv.status === PaymentStatus.PAID) continue;
        if (inv.status === PaymentStatus.ACCEPTED) continue; // Quotes?
        if (inv.documentType === 'quote') continue; // Don't auto-remind quotes unless requested

        // 2. Filter: Check Max Reminders
        const currentCount = inv.reminderCount || 0;
        if (currentCount >= MAX_REMINDERS) continue;

        // 3. Filter: Check Time Gap
        // Usage: If lastReminderSent exists, use it. Else use dateIssued.
        const lastEventDate = inv.lastReminderSent ? new Date(inv.lastReminderSent) : new Date(inv.dateIssued);
        const now = new Date();
        const diffTime = now.getTime() - lastEventDate.getTime();

        if (diffTime >= REMINDER_GAP_MS) {
            // Condition Met: Send Reminder
            console.log(`Sending automated reminder for ${inv.invoiceNumber} (Count: ${currentCount + 1})`);

            try {
                const fullCustomer = customers.find(c => c.id === inv.customerId);
                const success = await sendInvoiceViaWebhook(inv, settings, companyLogo, fullCustomer);

                if (success !== false) { // pdfService might return void or true
                    updateInvoice({
                        ...inv,
                        lastReminderSent: new Date().toISOString(),
                        reminderCount: currentCount + 1
                    });
                    sentCount++;
                    incrementDailyEmailCount();
                }
            } catch (e) {
                console.error(`Failed to auto-send reminder for ${inv.invoiceNumber}`, e);
            }
        }
    }

    if (sentCount > 0) {
        console.log(`Automated Reminder Service: Sent ${sentCount} reminders.`);
    } else {
        console.log("Automated Reminder Service: No reminders needed.");
    }
};
