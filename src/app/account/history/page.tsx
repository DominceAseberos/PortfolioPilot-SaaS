import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { ReviewHistory } from '@/components/dashboard/ReviewHistory'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, report:reports(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          Review History
        </h1>
        <p className="text-muted-foreground text-sm">
          Access all your past AI portfolio analyses.
        </p>
      </div>
      <ReviewHistory reviews={reviews || []} />
    </div>
  )
}
