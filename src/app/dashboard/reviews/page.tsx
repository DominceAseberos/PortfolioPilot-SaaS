import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { ReviewsPageClient } from '@/components/dashboard/ReviewsPageClient'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <ReviewsPageClient isGuest={true} reviewCount={0} />
  }

  const isGuest = user.is_anonymous === true

  const { count } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return <ReviewsPageClient isGuest={isGuest} reviewCount={count || 0} />
}
