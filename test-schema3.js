import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://azyeptjbktvkqiigotbi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eWVwdGpia3R2a3FpaWdvdGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODc0MjYsImV4cCI6MjA4MzQ2MzQyNn0.XHc7sOAgRW9AQJvOFVQ25R0ovsIr8Bxnv_hukDag2LY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('some_non_existent').select('*');
  console.log("Error to see if it lists tables:", error);
}

check();
