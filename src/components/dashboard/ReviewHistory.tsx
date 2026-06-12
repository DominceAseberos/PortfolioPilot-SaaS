'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/common/Badge'
import { ScoreBadge, ScoreBar } from '@/components/common/ScoreBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import {
  FileText,
  Globe,
  GitBranch,
  User,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  BarChart3,
  ExternalLink,
} from 'lucide-react'
import { formatDate, formatScore } from '@/lib/utils'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ReviewHistoryItem {
  id: string
  portfolio_url: string | null
  github_username: string | null
  resume_url: string | null
  overall_score: number | null
  portfolio_score: number | null
  github_score: number | null
  resume_score: number | null
  detected_name: string | null
  source_types: string[]
  created_at: string
}

interface ReviewHistoryProps {
  reviews: ReviewHistoryItem[]
}

interface PersonGroup {
  name: string
  reviews: ReviewHistoryItem[]
  averageScore: number
  bestScore: number
  firstScore: number
  latestScore: number
  improvement: number
  count: number
  uniqueLinks: {
    portfolios: string[]
    githubs: string[]
    resumes: string[]
  }
}

function groupReviewsByPerson(reviews: ReviewHistoryItem[]): PersonGroup[] {
  const groups = new Map<string, ReviewHistoryItem[]>()
  for (const r of reviews) {
    const key = r.detected_name || 'Unnamed'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  const result: PersonGroup[] = []
  for (const [name, personReviews] of groups) {
    const scores = personReviews.map((r) => r.overall_score).filter((s): s is number => s !== null)
    const sorted = [...personReviews].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const avg =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const best = scores.length > 0 ? Math.max(...scores) : 0
    const first = scores.length > 0 ? scores[0] : 0
    const latest = scores.length > 0 ? scores[scores.length - 1] : 0
    const improvement = first > 0 ? Math.round(((latest - first) / first) * 100) : 0

    const portfolios = [
      ...new Set(personReviews.map((r) => r.portfolio_url).filter(Boolean) as string[]),
    ]
    const githubs = [
      ...new Set(personReviews.map((r) => r.github_username).filter(Boolean) as string[]),
    ]
    const resumes = [...new Set(personReviews.map((r) => r.resume_url).filter(Boolean) as string[])]

    result.push({
      name,
      reviews: sorted,
      averageScore: avg,
      bestScore: best,
      firstScore: first,
      latestScore: latest,
      improvement,
      count: personReviews.length,
      uniqueLinks: { portfolios, githubs, resumes },
    })
  }

  result.sort((a, b) => {
    const aLatest = new Date(a.reviews[a.reviews.length - 1].created_at).getTime()
    const bLatest = new Date(b.reviews[b.reviews.length - 1].created_at).getTime()
    return bLatest - aLatest
  })

  return result
}

const sourceConfig: Record<string, { icon: typeof Globe; label: string }> = {
  portfolio: { icon: Globe, label: 'Portfolio' },
  github: { icon: GitBranch, label: 'GitHub' },
  resume: { icon: FileText, label: 'Resume' },
}

function ImprovementBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> No change
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

function PersonSection({ group }: { group: PersonGroup }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasLinks =
    group.uniqueLinks.portfolios.length > 0 ||
    group.uniqueLinks.githubs.length > 0 ||
    group.uniqueLinks.resumes.length > 0

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 py-4 text-left hover:bg-accent/20 -mx-2 px-2 rounded-lg transition-colors"
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-1.5">
              <User className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold truncate">{group.name}</p>
            <Badge variant="secondary" className="text-xs shrink-0">
              {group.count} review{group.count !== 1 ? 's' : ''}
            </Badge>
          </div>

          {hasLinks && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {group.uniqueLinks.portfolios.map((url) => (
                <span key={url} className="truncate max-w-[200px] flex items-center gap-1">
                  <Globe className="h-3 w-3 shrink-0" />
                  {url.replace(/^https?:\/\//, '')}
                </span>
              ))}
              {group.uniqueLinks.githubs.map((user) => (
                <span key={user} className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3 shrink-0" />@{user}
                </span>
              ))}
              {group.uniqueLinks.resumes.map((url) => (
                <span key={url} className="truncate max-w-[150px] flex items-center gap-1">
                  <FileText className="h-3 w-3 shrink-0" />
                  {url}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Avg</p>
            <p className="text-sm font-semibold">{formatScore(group.averageScore)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Best</p>
            <p className="text-sm font-semibold">{formatScore(group.bestScore)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Trend</p>
            <ImprovementBadge value={group.improvement} />
          </div>
        </div>

        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="pb-3 pl-2 space-y-2">
          <div className="grid grid-cols-3 gap-3 mb-3 sm:hidden">
            <div className="text-center bg-muted/20 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-sm font-semibold">{formatScore(group.averageScore)}</p>
            </div>
            <div className="text-center bg-muted/20 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Best</p>
              <p className="text-sm font-semibold">{formatScore(group.bestScore)}</p>
            </div>
            <div className="text-center bg-muted/20 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Trend</p>
              <ImprovementBadge value={group.improvement} />
            </div>
          </div>

          <ScoreBar score={group.averageScore} className="mb-3" />

          <div className="divide-y divide-border/30 rounded-lg border border-border/50">
            {group.reviews.map((review) => {
              const sourceMeta = review.source_types.map((t) => sourceConfig[t]).filter(Boolean)
              return (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/20 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{formatDate(review.created_at)}</span>
                      <div className="flex items-center gap-1">
                        {sourceMeta.map(({ icon: Icon, label }) => (
                          <Icon key={label} className="h-3 w-3 text-muted-foreground" />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      {review.portfolio_url && (
                        <span className="truncate max-w-[180px]">
                          {review.portfolio_url.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                      {review.github_username && <span>@{review.github_username}</span>}
                      {review.resume_url && (
                        <span className="truncate max-w-[120px]">{review.resume_url}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ScoreBadge score={review.overall_score} size="sm" />
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function ReviewHistory({ reviews }: ReviewHistoryProps) {
  const groups = useMemo(() => groupReviewsByPerson(reviews), [reviews])
  const totalPeople = groups.length

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="border-b bg-muted/20 pb-3">
        <CardTitle className="text-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Review History
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Run your first review from the New Review tab to get started."
          />
        ) : (
          <div className="divide-y divide-border/50">
            {groups.map((group) => (
              <PersonSection key={group.name} group={group} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
