import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://azyeptjbktvkqiigotbi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eWVwdGpia3R2a3FpaWdvdGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODc0MjYsImV4cCI6MjA4MzQ2MzQyNn0.XHc7sOAgRW9AQJvOFVQ25R0ovsIr8Bxnv_hukDag2LY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDelete() {
  const { data: invoices, error: fetchError } = await supabase.from('invoices').select('id').limit(1);
  if (fetchError) {
    console.error("Fetch Error:", fetchError);
    return;
  }
  if (!invoices || invoices.length === 0) {
    console.log("No invoices found to delete.");
    return;
  }
  const idToDelete = invoices[0].id;
  console.log("Attempting to delete invoice with ID:", idToDelete);

  const { data, error } = await supabase.from('invoices').delete().eq('id', String(idToDelete)).select();

  if (error) {
    console.error("Delete Error:", error);
  } else {
    console.log("Delete Success! Data:", data);
  }
}

testDelete();
