-- Migration: Add Xero Sync tracking to Invoices and Quotes
-- Run this in the Supabase SQL Editor

-- 1. Update Invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS xero_sync_status TEXT DEFAULT 'not_synced';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS xero_sync_date TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_date TEXT;

-- 2. Update Quotes table (if you want to track sync for quotes too)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS xero_sync_status TEXT DEFAULT 'not_synced';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS xero_sync_date TEXT;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_xero_sync_status ON invoices(xero_sync_status);
CREATE INDEX IF NOT EXISTS idx_quotes_xero_sync_status ON quotes(xero_sync_status);
