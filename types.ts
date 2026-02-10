
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string; // e.g., 'sqm', 'pcs', 'hour'
  category: string;
  company?: 'clonmel' | 'mirrorzone';
}

export interface InvoiceItem {
  id: string;
  productId: string; // link to Product
  description: string; // Allow override or custom
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  company?: 'clonmel' | 'mirrorzone'; // Company selection
  documentType?: 'invoice' | 'quote';
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: PaymentStatus;
  dateIssued: string;
  dueDate: string;
  notes?: string;
  createdBy: string;
  lastReminderSent?: string; // ISO Date of last reminder
  reminderCount?: number; // Number of reminders sent
  validUntil?: string;
  paymentDate?: string; // ISO Date when fully paid
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;

  address?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  company?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  company?: 'clonmel' | 'mirrorzone';
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil: string;
  dateIssued: string;
  status: PaymentStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'INVOICES' | 'CREATE_INVOICE' | 'PRODUCTS' | 'USERS' | 'CALENDAR' | 'CUSTOMERS' | 'QUOTES' | 'SETTINGS';

export interface AppSettings {
  taxRate: number;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  vatNumber: string; // Add VAT Number
  bankName: string;
  accountName: string;
  iban: string;
  bic: string;
  defaultNotes: string; // Terms & Conditions
  emailTemplateSubject?: string;
  emailTemplateBody?: string;

  // MirrorZone Identity
  mirrorZoneName?: string;
  mirrorZoneAddress?: string;
  mirrorZonePhone?: string;
  mirrorZoneEmail?: string;
  mirrorZoneWebsite?: string;

  // MirrorZone Bank Details
  mirrorZoneBankName?: string;
  mirrorZoneAccountName?: string;
  mirrorZoneIban?: string;
  mirrorZoneBic?: string;

  // Integrations
  webhookUrl?: string; // N8N/Zapier Webhook URL for email sending
  xeroWebhookUrl?: string; // Webhook for Xero Transfer
}
