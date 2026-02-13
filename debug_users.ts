
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Try to get URL and Key from common vars or let user fill them
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log("Inspecting public.users table...");

    // Try to insert a row to see exactly what fails
    // We use a random ID to avoid collisions
    const testId = crypto.randomUUID();

    const { data, error } = await supabase
        .from('users')
        .insert({
            id: testId,
            email: `debug_${Date.now()}@test.com`,
            name: 'Debug User',
            role: 'USER',
            avatar: 'https://example.com/avatar.png'
        })
        .select();

    if (error) {
        console.error("❌ INSERT FAILED with error:");
        console.error(JSON.stringify(error, null, 2));

        // Check if it's a specific column error
        if (error.message.includes('column')) {
            console.log("💡 diagnosis: Missing or invalid column.");
        }
    } else {
        console.log("✅ INSERT SUCCESS! (Test row created)");
        // Clean up
        await supabase.from('users').delete().eq('id', testId);
        console.log("✅ Test row cleaned up.");
    }
}

inspectSchema();
