import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { ReviewsPageClient } from '@/components/dashboard/ReviewsPageClient'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  if (process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' && process.env.NODE_ENV !== 'production') {
    return <ReviewsPageClient isGuest={false} reviewCount={0} credits={99} reviews={[]} />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <ReviewsPageClient isGuest={true} reviewCount={0} credits={5} reviews={[]} />
  }

  const isGuest = user.is_anonymous === true

  // Fetch all reviews for history
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, portfolio_url, github_username, resume_url, overall_score, portfolio_score, github_score, resume_score, detected_name, source_types, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: creditData } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', user.id)
    .single()

  const credits = creditData?.credits || 0

  return <ReviewsPageClient key="new" isGuest={isGuest} reviewCount={reviews?.length || 0} credits={credits} reviews={reviews || []} />
}
