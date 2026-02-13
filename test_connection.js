
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://azyeptjbktvkqiigotbi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eWVwdGpia3R2a3FpaWdvdGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODc0MjYsImV4cCI6MjA4MzQ2MzQyNn0.XHc7sOAgRW9AQJvOFVQ25R0ovsIr8Bxnv_hukDag2LY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    console.log('Testing connection to Supabase...');
    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Connection Failed:', error.message);
            if (error.code) console.error('Error Code:', error.code);
        } else {
            console.log('✅ Connection Successful!');
            console.log('Successfully reached Supabase.');
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err.message);
    }
}

testConnection();
