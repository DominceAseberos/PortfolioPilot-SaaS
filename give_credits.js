
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function giveCredits() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  for (const user of users.users) {
    const { error } = await supabase.rpc('add_credits', { p_user_id: user.id, p_amount: 100 });
    if (error) {
      console.error('Failed to add credits for user', user.id, error);
    } else {
      console.log('Added 100 credits to user', user.id);
    }
  }
}

giveCredits();
