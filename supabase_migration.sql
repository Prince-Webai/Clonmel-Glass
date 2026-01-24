-- Run this in your Supabase SQL Editor to enable Quote support

-- Add document_type column to distinguish between 'invoice' and 'quote'
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'invoice';

-- Add valid_until column for Quote expiration dates
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS valid_until text;

-- (Optional) Add last_reminder_sent if it's missing (referenced in code)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_sent text;

-- Add company column to products to separate Clonmel Glass vs MirrorZone
ALTER TABLE products ADD COLUMN IF NOT EXISTS company text DEFAULT 'clonmel';

-- Backfill existing data: If category contains 'Mirror' (case insensitive), assign to 'mirrorzone'
UPDATE products 
SET company = 'mirrorzone' 
WHERE category ILIKE '%mirror%';

-- Fix existing PAID invoices that still have incorrect balances
UPDATE invoices 
SET balance_due = 0, 
    amount_paid = total 
WHERE status = 'PAID' 
  AND balance_due > 0;
