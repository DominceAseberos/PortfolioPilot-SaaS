'use client'

import { Badge } from '@/components/common/Badge'
import { ScoreBadge } from '@/components/common/ScoreBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { FileText, Globe, GitBranch, User, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

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

const sourceConfig: Record<string, { icon: typeof Globe; label: string }> = {
  portfolio: { icon: Globe, label: 'Portfolio' },
  github: { icon: GitBranch, label: 'GitHub' },
  resume: { icon: FileText, label: 'Resume' },
}

export function ReviewHistory({ reviews }: ReviewHistoryProps) {
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
            {reviews.map((review) => {
              const sourceMeta = review.source_types.map((t) => sourceConfig[t]).filter(Boolean)

              return (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="flex items-center gap-3 py-4 first:pt-0 last:pb-0 hover:bg-accent/20 -mx-2 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      {review.detected_name ? (
                        <>
                          <div className="rounded-full bg-primary/10 p-1">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <p className="text-sm font-semibold truncate">{review.detected_name}</p>
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-muted-foreground">
                          Unnamed Review
                        </p>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(review.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {sourceMeta.map(({ icon: Icon, label }) => (
                        <Badge
                          key={label}
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {review.portfolio_url && (
                        <span className="truncate max-w-[200px]">
                          {review.portfolio_url.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                      {review.github_username && <span>@{review.github_username}</span>}
                      {review.resume_url && (
                        <span className="truncate max-w-[150px]">{review.resume_url}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ScoreBadge score={review.overall_score} size="md" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
