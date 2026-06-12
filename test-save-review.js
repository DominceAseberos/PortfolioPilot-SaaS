const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data, error } = await supabase.from('reviews').insert({
    user_id: crypto.randomUUID(),
    portfolio_url: 'https://example.com',
    overall_score: 50,
    full_results: { aiSummary: { radar: { presentation: 50, openSource: 50, experience: 50, techStack: 50, consistency: 50 } } }
  }).select()
  console.log('Error:', error)
}
test()
