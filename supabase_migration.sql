-- Run this in your Supabase SQL Editor to enable Quote support

-- Add document_type column to distinguish between 'invoice' and 'quote'
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'invoice';

-- Add valid_until column for Quote expiration dates
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS valid_until text;

-- (Optional) Add last_reminder_sent if it's missing (referenced in code)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_sent text;
