const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqtwbvheqgyhczitgbym.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdHdidmhlcWd5aGN6aXRnYnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDMwMzQsImV4cCI6MjA4NTkxOTAzNH0.LWNT7YV13sT3jEUbFFgY1_9213WuqEDvDREE0exj8BY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
    console.log('--- VERIFYING SCHEMA ---');
    try {
        // Try to insert a dummy product or just select
        // Selecting is safer. If table exists, we get data (empty array) or success.
        // If table missing, we get 404/PGRST error.
        const { data, error } = await supabase.from('products').select('*').limit(1);

        if (error) {
            console.log('VERIFICATION_FAILED:', JSON.stringify(error, null, 2));
        } else {
            console.log('VERIFICATION_SUCCESS: Table "products" exists. Data:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.log('EXCEPTION:', err);
    }
}

verifyTables();
