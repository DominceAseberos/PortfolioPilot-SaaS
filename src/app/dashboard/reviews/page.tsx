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
    return <ReviewsPageClient reviews={[]} isGuest={true} />
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <ReviewsPageClient reviews={reviews || []} isGuest={false} />
}
