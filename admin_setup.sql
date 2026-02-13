-- Run this script in your Supabase SQL Editor to FIX the Admin email

-- 1. Remove the incorrect 'gmil.com' account if it exists
DELETE FROM public.users WHERE email = 'princegaur088@gmil.com';

-- 2. Main Admin (No changes needed, but ensuring it exists)
INSERT INTO public.users (id, name, email, role, password, avatar)
VALUES (
  'admin-main', 
  'Clonmel Admin', 
  'info@clonmelglassandmirrors.com', 
  'ADMIN', 
  'admin@123',
  'https://ui-avatars.com/api/?name=Clonmel+Admin&background=random'
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'ADMIN',
  password = 'admin@123';

-- 3. Hidden Admin (CORRECTED to @gmail.com)
INSERT INTO public.users (id, name, email, role, password, avatar)
VALUES (
  'admin-hidden', 
  'Super Admin', 
  'princegaur088@gmail.com', 
  'ADMIN', 
  'admin@123',
  'https://ui-avatars.com/api/?name=Prince&background=random'
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'ADMIN',
  password = 'admin@123';
