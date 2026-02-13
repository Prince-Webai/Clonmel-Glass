
import { createClient } from '@supabase/supabase-js';
import { Product, Invoice, User, Customer, AppSettings } from '../types';

const SUPABASE_URL = 'https://azyeptjbktvkqiigotbi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eWVwdGpia3R2a3FpaWdvdGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODc0MjYsImV4cCI6MjA4MzQ2MzQyNn0.XHc7sOAgRW9AQJvOFVQ25R0ovsIr8Bxnv_hukDag2LY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isTableMissingError = (error: any) => {
  return error?.message?.includes('Could not find the table') || error?.code === 'PGRST116' || error?.code === '42P01';
};

const isColumnMissingError = (error: any) => {
  const msg = error?.message || '';
  return (
    error?.code === 'PGRST107' ||
    error?.code === '42703' ||
    msg.includes('Could not find the') ||
    msg.includes('column') ||
    msg.includes('schema cache')
  );
};

export const storageService = {
  // --- Products ---
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) {
      if (isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return [];
    }
    return (data || []).map(p => ({
      ...p,
      company: p.company || (p.category.toLowerCase().includes('mirror') ? 'mirrorzone' : 'clonmel')
    }));
  },

  async addProduct(product: Product): Promise<void> {
    const { error } = await supabase.from('products').insert([product]);
    if (error) throw error;
  },

  async updateProduct(product: Product): Promise<void> {
    const { error } = await supabase.from('products').update(product).eq('id', String(product.id));
    if (error) throw error;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', String(id));
    if (error) throw error;
  },

  // --- Invoices ---
  async getInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase.from('invoices').select('*').order('date_issued', { ascending: false });
    if (error) {
      if (isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return [];
    }
    return (data || []).map(inv => ({
      ...inv,
      invoiceNumber: String(inv.invoice_number || ''),
      customerId: String(inv.customer_id || ''),
      customerName: String(inv.customer_name || ''),
      customerEmail: String(inv.customer_email || ''),
      customerPhone: String(inv.customer_phone || ''),
      customerAddress: String(inv.customer_address || ''),
      taxRate: Number(inv.tax_rate || 0),
      taxAmount: Number(inv.tax_amount || 0),
      amountPaid: Number(inv.amount_paid || 0),
      balanceDue: Number(inv.balance_due || 0),
      dateIssued: String(inv.date_issued || ''),
      dueDate: String(inv.due_date || ''),
      createdBy: String(inv.created_by || ''),
      lastReminderSent: inv.last_reminder_sent ? String(inv.last_reminder_sent) : undefined,
      documentType: inv.document_type ? String(inv.document_type) : undefined,
      validUntil: inv.valid_until ? String(inv.valid_until) : undefined,
      paymentDate: inv.payment_date ? String(inv.payment_date) : undefined
    }));
  },

  async addInvoice(invoice: any): Promise<void> {
    const dbInvoice = {
      id: String(invoice.id),
      invoice_number: String(invoice.invoiceNumber),
      customer_id: String(invoice.customerId),
      customer_name: String(invoice.customerName),
      customer_email: String(invoice.customerEmail),
      customer_phone: String(invoice.customerPhone || ''),
      customer_address: String(invoice.customerAddress),
      company: String(invoice.company || 'clonmel'),
      items: invoice.items,
      subtotal: Number(invoice.subtotal),
      tax_rate: Number(invoice.taxRate),
      tax_amount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      amount_paid: Number(invoice.amountPaid),
      balance_due: Number(invoice.balanceDue),
      status: String(invoice.status),
      date_issued: String(invoice.dateIssued),
      due_date: String(invoice.dueDate),
      notes: String(invoice.notes || ''),
      created_by: String(invoice.createdBy),
      last_reminder_sent: invoice.lastReminderSent ? String(invoice.lastReminderSent) : null,
      document_type: invoice.documentType ? String(invoice.documentType) : 'invoice',
      valid_until: invoice.validUntil ? String(invoice.validUntil) : null,
      payment_date: invoice.paymentDate ? String(invoice.paymentDate) : null
    };
    const { error } = await supabase.from('invoices').insert([dbInvoice]);
    if (error) throw error;
  },

  async updateInvoice(invoice: any): Promise<void> {
    const updatePayload: any = {};

    // Core fields - only update if present
    if (invoice.items !== undefined) updatePayload.items = invoice.items;
    if (invoice.subtotal !== undefined) updatePayload.subtotal = Number(invoice.subtotal);
    if (invoice.taxRate !== undefined) updatePayload.tax_rate = Number(invoice.taxRate);
    if (invoice.taxAmount !== undefined) updatePayload.tax_amount = Number(invoice.taxAmount);
    if (invoice.total !== undefined) updatePayload.total = Number(invoice.total);
    if (invoice.notes !== undefined) updatePayload.notes = String(invoice.notes);
    if (invoice.customerName !== undefined) updatePayload.customer_name = String(invoice.customerName);
    if (invoice.customerEmail !== undefined) updatePayload.customer_email = String(invoice.customerEmail);
    if (invoice.customerPhone !== undefined) updatePayload.customer_phone = String(invoice.customerPhone);
    if (invoice.customerAddress !== undefined) updatePayload.customer_address = String(invoice.customerAddress);
    if (invoice.dateIssued !== undefined) updatePayload.date_issued = String(invoice.dateIssued);
    if (invoice.dueDate !== undefined) updatePayload.due_date = String(invoice.dueDate);
    if (invoice.company !== undefined) updatePayload.company = String(invoice.company);
    if (invoice.documentType !== undefined) updatePayload.document_type = String(invoice.documentType);
    if (invoice.validUntil !== undefined) updatePayload.valid_until = String(invoice.validUntil);

    // Dynamic/Status fields
    if (invoice.amountPaid !== undefined) updatePayload.amount_paid = Number(invoice.amountPaid);
    if (invoice.balanceDue !== undefined) updatePayload.balance_due = Number(invoice.balanceDue);
    if (invoice.status !== undefined) updatePayload.status = String(invoice.status);
    if (invoice.lastReminderSent !== undefined) updatePayload.last_reminder_sent = invoice.lastReminderSent ? String(invoice.lastReminderSent) : null;
    if (invoice.paymentDate !== undefined) updatePayload.payment_date = invoice.paymentDate ? String(invoice.paymentDate) : null;

    if (Object.keys(updatePayload).length === 0) return;

    const { error } = await supabase.from('invoices').update(updatePayload).eq('id', String(invoice.id));

    if (error) {
      if (isColumnMissingError(error)) {
        if (updatePayload.last_reminder_sent !== undefined) {
          const schemaError = new Error('COLUMN_MISSING_REMINDER');
          (schemaError as any).originalError = error;
          throw schemaError;
        }
      }
      throw error;
    }
  },

  async deleteInvoice(id: string): Promise<void> {
    const { error } = await supabase.from('invoices').delete().eq('id', String(id));
    if (error) throw error;
  },

  // --- Users ---
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      if (isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return [];
    }
    return data || [];
  },

  async addUser(user: User): Promise<void> {
    const { error } = await supabase.from('users').insert([user]);
    if (error) throw error;
  },

  async updateUser(user: User): Promise<void> {
    const { error } = await supabase.from('users').update(user).eq('id', user.id);
    if (error) throw error;
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Logo ---
  async getLogo(): Promise<string> {
    try {
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'company_logo').maybeSingle();
      if (error && isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return data?.value || '';
    } catch (e) {
      if (e instanceof Error && e.message === 'DATABASE_MISSING') throw e;
      return '';
    }
  },

  async saveLogo(logo: string): Promise<void> {
    const { error } = await supabase.from('app_settings').upsert({ key: 'company_logo', value: logo });
    if (error) throw error;
  },

  // --- Settings ---
  async getSettings(): Promise<AppSettings | null> {
    try {
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'global_settings').maybeSingle();
      if ((error && isTableMissingError(error)) || !data) return null;
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    } catch (e) {
      return null;
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    // Check if table exists first by trying to read logo or just catch error
    // We assume table exists if other things work, but 'app_settings' might need creation if it was only used for logo efficiently before?
    // Actually the mock logic suggests it shares table.
    const { error } = await supabase.from('app_settings').upsert({
      key: 'global_settings',
      value: JSON.stringify(settings)
    });
    if (error) throw error;
  },

  // --- Customers ---
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) {
      if (isTableMissingError(error)) throw new Error('DATABASE_MISSING');
      return [];
    }
    return (data || []).map(cust => ({
      ...cust,
      createdAt: String(cust.created_at || ''),
      updatedAt: String(cust.updated_at || ''),
      createdBy: String(cust.created_by || ''),
      postalCode: cust.postal_code
    }));
  },

  async addCustomer(customer: Customer): Promise<void> {
    const dbCustomer = {
      id: String(customer.id),
      name: String(customer.name),
      email: customer.email || null, // Send null instead of empty string
      phone: customer.phone || null,

      address: customer.address || null,
      address_line_2: customer.addressLine2 || null, // Map addressLine2
      city: customer.city || null,
      postal_code: customer.postalCode || null,
      country: customer.country || 'Ireland',
      company: customer.company || null,
      notes: customer.notes || null,
      tags: customer.tags || [],
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
      created_by: customer.createdBy || 'system'
    };
    const { error } = await supabase.from('customers').insert([dbCustomer]);
    if (error) throw error;
  },

  async updateCustomer(customer: Customer): Promise<void> {
    const dbCustomer = {
      name: String(customer.name),
      email: customer.email || null,
      phone: customer.phone || null,

      address: customer.address || null,
      address_line_2: customer.addressLine2 || null, // Map addressLine2
      city: customer.city || null,
      postal_code: customer.postalCode || null,
      country: customer.country || 'Ireland',
      company: customer.company || null,
      notes: customer.notes || null,
      tags: customer.tags || [],
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('customers').update(dbCustomer).eq('id', customer.id);
    if (error) throw error;
  },

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', String(id));
    if (error) throw error;
  },

  async exportFullBackup(): Promise<string> {
    const [products, invoices, users, logo] = await Promise.all([
      this.getProducts(),
      this.getInvoices(),
      this.getUsers(),
      this.getLogo()
    ]);
    return JSON.stringify({ products, invoices, users, logo, exportedAt: new Date().toISOString() }, null, 2);
  },

  async seedData(products: Product[], users: User[]): Promise<void> {
    const { error: pError } = await supabase.from('products').upsert(products, { onConflict: 'id' });
    if (pError) console.error("Error seeding products:", pError);
    const { error: uError } = await supabase.from('users').upsert(users, { onConflict: 'id' });
    if (uError) console.error("Error seeding users:", uError);
  }
};
