import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { ReviewDetailView } from '@/components/dashboard/ReviewDetailView'
import type { Review } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const { id } = await params

  const { data: review } = await supabase
    .from('reviews')
    .select('*, report:reports(*)')
    .eq('id', id)
    .single()

  if (!review || review.user_id !== user.id) {
    redirect('/dashboard/reviews')
  }

  return <ReviewDetailView review={review as Review} />
}
