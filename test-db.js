const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yteooebnctgjpbngrdow.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0ZW9vZWJuY3RnanBibmdyZG93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE0MTkwOCwiZXhwIjoyMDk2NzE3OTA4fQ.zc5Jb4fQGFEhNByuQQpBXX5n4rOAKd1sN7zIWFj-3Yw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Updating all subscriptions to Pro...");
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ plan: 'pro', status: 'active' })
    .neq('plan', 'pro');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Upgraded subscriptions to pro.");
  }
}
run();
