import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { ReviewsPageClient } from '@/components/dashboard/ReviewsPageClient'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const isGuest = user.is_anonymous === true

  // Fetch all reviews for history sidebar/dropdown
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

  // Use service role key to fetch review (bypassing RLS for anonymous review access)
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: currentReview, error } = await supabaseAdmin
    .from('reviews')
    .select('*, report:reports(*)')
    .eq('id', id)
    .single()

  if (error || !currentReview) {
    redirect('/dashboard/reviews')
  }

  const isAnonymousUser = currentReview.user_id === '6cd090d1-f91a-4f73-9718-099ae3163a0e'
  const isOwner = user && currentReview.user_id === user.id

  if (!isAnonymousUser && !isOwner) {
    redirect('/dashboard/reviews')
  }

  return (
    <ReviewsPageClient 
      key={currentReview.id}
      isGuest={isGuest} 
      reviewCount={reviews?.length || 0} 
      credits={credits} 
      reviews={reviews || []} 
      initialReviewData={currentReview}
    />
  )
}
