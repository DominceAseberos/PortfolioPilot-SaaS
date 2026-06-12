'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { ScoreBadge, ScoreBar } from '@/components/common/ScoreBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/constants'
import { formatDate } from '@/lib/utils'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  Activity,
  Plus,
  FileText,
  Globe,
  GitBranch,
  User,
  Minus,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

interface Review {
  id: string
  overall_score: number | null
  portfolio_score: number | null
  github_score: number | null
  resume_score: number | null
  detected_name: string | null
  source_types: string[]
  portfolio_url: string | null
  github_username: string | null
  resume_url: string | null
  created_at: string
}

interface PersonMetric {
  name: string
  averageScore: number
  bestScore: number
  improvement: number
  reviewCount: number
  latestDate: string
}

interface Subscription {
  plan: string
  status: string
}

interface DashboardOverviewProps {
  user: SupabaseUser
  totalReviews: number
  averageScore: number
  bestScore: number
  improvementPercentage: number
  recentReviews: Review[]
  subscription: Subscription | null
  personMetrics: PersonMetric[]
}

function ImprovementBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    )
  }
  const isPositive = value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isPositive ? 'text-green-600' : 'text-red-600'
      )}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}
      {value}%
    </span>
  )
}

export function DashboardOverview({
  user,
  totalReviews,
  averageScore,
  bestScore,
  improvementPercentage,
  recentReviews,
  subscription,
  personMetrics,
}: DashboardOverviewProps) {
  const plan = subscription?.plan || 'free'
  const isPro = plan === 'pro'
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Welcome back{user.email ? `, ${user.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm">
            Here&apos;s your portfolio performance overview
          </p>
        </div>
        <Link href={ROUTES.reviews}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Review
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviews}</div>
            <p className="text-muted-foreground text-xs">
              {isPro || isDev
                ? 'Unlimited reviews'
                : `${Math.max(0, 1 - totalReviews)} review${totalReviews >= 1 ? 's' : ''} remaining this month`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageScore > 0 ? `${Math.round(averageScore)}/100` : 'N/A'}
            </div>
            <ScoreBar score={averageScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bestScore > 0 ? `${Math.round(bestScore)}/100` : 'N/A'}
            </div>
            <ScoreBadge score={bestScore} size="sm" className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {improvementPercentage !== 0
                ? `${improvementPercentage > 0 ? '+' : ''}${improvementPercentage}%`
                : 'N/A'}
            </div>
            <p className="text-muted-foreground text-xs">Compared to earlier reviews</p>
          </CardContent>
        </Card>
      </div>

      {personMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>People Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {personMetrics.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-lg border p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/20 bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-full bg-primary/10 p-1.5 shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.reviewCount} review{p.reviewCount !== 1 ? 's' : ''} &middot; Last:{' '}
                        {formatDate(p.latestDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Avg</p>
                      <ScoreBadge score={p.averageScore} size="sm" />
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Best</p>
                      <ScoreBadge score={p.bestScore} size="sm" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Trend</p>
                      <ImprovementBadge value={p.improvement} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Subscription</CardTitle>
          <Badge variant={isPro ? 'success' : 'secondary'}>{isPro ? 'Pro' : 'Free'}</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {isPro || isDev
              ? 'Unlimited reviews. Run as many as you want.'
              : 'Upgrade to Pro for unlimited reviews, detailed reports, and progress tracking.'}
          </p>
          {!isPro && (
            <Link href={ROUTES.billing} className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                Upgrade to Pro
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReviews.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-12 w-12" />}
              title="No reviews yet"
              description="Create your first review to get recruiter-style feedback on your portfolio."
              action={
                <Link href={ROUTES.reviews}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Review
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {recentReviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/20 bg-card"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {review.detected_name ? (
                        <>
                          <div className="rounded-full bg-primary/10 p-1">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <p className="text-sm font-medium">{review.detected_name}</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium">
                          Review from {formatDate(review.created_at)}
                        </p>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {review.source_types?.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-[10px] flex items-center gap-1"
                        >
                          {t === 'portfolio' && <Globe className="h-2.5 w-2.5" />}
                          {t === 'github' && <GitBranch className="h-2.5 w-2.5" />}
                          {t === 'resume' && <FileText className="h-2.5 w-2.5" />}
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <ScoreBadge score={review.overall_score} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
