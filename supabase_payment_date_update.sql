-- Add payment_date column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;

-- Comment on column
COMMENT ON COLUMN invoices.payment_date IS 'ISO timestamp when the invoice was fully paid';
