import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: creditData } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', user.id)
    .single()

  const credits = creditData?.credits || 0
  const totalReviews = reviews?.length || 0
  const scores = reviews?.map((r) => r.overall_score).filter((s): s is number => s !== null) || []
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0

  let improvementPercentage = 0
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2)
    // scores is descending (newest first)
    const newerHalf = scores.slice(0, mid)
    const olderHalf = scores.slice(mid)
    const newerAvg = newerHalf.reduce((a, b) => a + b, 0) / newerHalf.length
    const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length
    improvementPercentage = olderAvg > 0 ? Math.round(((newerAvg - olderAvg) / olderAvg) * 100) : 0
  }

  const reviewList = reviews || []
  const personMap = new Map<
    string,
    { scores: number[]; dates: string[]; reviews: typeof reviewList }
  >()
  for (const r of reviewList) {
    const name = r.detected_name || 'Unnamed'
    if (!personMap.has(name)) personMap.set(name, { scores: [], dates: [], reviews: [] })
    const entry = personMap.get(name)!
    if (r.overall_score !== null) entry.scores.push(r.overall_score)
    entry.dates.push(r.created_at)
    entry.reviews.push(r)
  }

  const personMetrics = [...personMap.entries()]
    .map(([name, data]) => {
      const s = data.scores // This is descending (newest first)
      const avg = s.length > 0 ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0
      const best = s.length > 0 ? Math.max(...s) : 0
      const latest = s.length > 0 ? s[0] : 0 // Newest is at index 0
      const first = s.length > 0 ? s[s.length - 1] : 0 // Oldest is at end
      const improvement = first > 0 ? Math.round(((latest - first) / first) * 100) : 0
      const latestDate = data.dates.sort().reverse()[0] || ''
      return {
        name,
        averageScore: avg,
        bestScore: best,
        improvement,
        reviewCount: data.reviews.length,
        latestDate,
      }
    })
    .sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime())

  return (
    <DashboardOverview
      user={user}
      totalReviews={totalReviews}
      averageScore={averageScore}
      bestScore={bestScore}
      improvementPercentage={improvementPercentage}
      recentReviews={(reviews || []).slice(0, 5)}
      credits={credits}
      personMetrics={personMetrics}
    />
  )
}
