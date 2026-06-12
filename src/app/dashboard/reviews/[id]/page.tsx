import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { ReviewDetailView } from '@/components/dashboard/ReviewDetailView'
import type { Review } from '@/types'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { id } = await params

  // Use service role key to fetch review (bypassing RLS for anonymous review access)
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: review } = await supabaseAdmin
    .from('reviews')
    .select('*, report:reports(*)')
    .eq('id', id)
    .single()

  if (!review) {
    redirect('/dashboard/reviews')
  }

  const isAnonymousUser = review.user_id === '6cd090d1-f91a-4f73-9718-099ae3163a0e'
  const isOwner = user && review.user_id === user.id

  if (!isAnonymousUser && !isOwner) {
    redirect('/dashboard/reviews')
  }

  const isAnonymous = !user && isAnonymousUser

  return <ReviewDetailView review={review as Review} isAnonymous={isAnonymous} />
}
