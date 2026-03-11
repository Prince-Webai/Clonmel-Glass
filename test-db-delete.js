import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://azyeptjbktvkqiigotbi.supabase.co'
const supabaseKey = '' // I need to get the anon key, but I don't have it explicitly without crawling. 
// Instead, let's just grep the actual `deleteInvoice` in storageService to see if it's logging errors.
