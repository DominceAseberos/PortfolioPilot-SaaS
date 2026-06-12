const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const randomId = crypto.randomUUID();
  console.log("Testing insert with random user_id:", randomId);
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      user_id: randomId,
      overall_score: 50,
      source_types: []
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! user_id can be a random UUID.");
    // Clean up
    await supabase.from('reviews').delete().eq('id', data.id);
  }
}
run();
