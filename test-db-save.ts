import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function test() {
  const { data, error } = await supabase.from('reviews').insert({
    user_id: '00000000-0000-0000-0000-000000000000', // invalid uuid might throw fk error
    portfolio_url: 'https://example.com',
    overall_score: 50,
    full_results: { aiSummary: { radar: { presentation: 50, openSource: 50, experience: 50, techStack: 50, consistency: 50 } } }
  }).select()
  console.log('Error:', error)
}
test()
