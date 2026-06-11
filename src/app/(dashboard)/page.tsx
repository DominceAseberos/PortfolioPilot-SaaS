import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const totalReviews = reviews?.length || 0
  const scores = reviews?.map(r => r.overall_score).filter((s): s is number => s !== null) || []
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0

  let improvementPercentage = 0
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2)
    const firstHalf = scores.slice(0, mid)
    const secondHalf = scores.slice(mid)
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    improvementPercentage = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0
  }

  return (
    <DashboardOverview
      user={user}
      totalReviews={totalReviews}
      averageScore={averageScore}
      bestScore={bestScore}
      improvementPercentage={improvementPercentage}
      recentReviews={(reviews || []).slice(0, 5)}
      subscription={subscription}
    />
  )
}
