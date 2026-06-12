'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { ScoreBadge } from '@/components/common/ScoreBadge'
import {
  ArrowLeft,
  Globe,
  GitBranch,
  FileText,
  User,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Target,
  Link2,
  Users,
  Star,
  ChevronDown,
  ChevronRight,
  Lock,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import type {
  Review,
  PortfolioAnalysis,
  GitHubAnalysis,
  ResumeAnalysis,
  AISummaryResult,
  PortfolioCheck,
  ResumeWorkEntry,
  ResumeEducation,
  AIMismatch,
} from '@/types'

interface ReviewDetailViewProps {
  review: Review
  isAnonymous?: boolean
}

const sourceIcons: Record<string, typeof Globe> = {
  portfolio: Globe,
  github: GitBranch,
  resume: FileText,
}

const sourceColors: Record<string, string> = {
  portfolio: 'border-blue-500/30 bg-blue-500/5',
  github: 'border-purple-500/30 bg-purple-500/5',
  resume: 'border-emerald-500/30 bg-emerald-500/5',
}

function PortfolioDetails({ analysis }: { analysis: PortfolioAnalysis }) {
  const details = analysis.details
  const checks = details?.checks || []
  const passed = checks.filter((c) => c.status === 'passed').length
  const failed = checks.filter((c) => c.status === 'failed').length
  const unverifiable = checks.filter((c) => c.status === 'unverifiable').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-green-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-green-500">{passed}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Passed</p>
        </div>
        <div className="rounded-lg bg-red-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{failed}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Failed</p>
        </div>
        {unverifiable > 0 && (
          <div className="rounded-lg bg-amber-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{unverifiable}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Unverified</p>
          </div>
        )}
        <div className="rounded-lg bg-blue-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-blue-500">{checks.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {checks.map((check) => {
          const statusBg =
            check.status === 'passed'
              ? 'border-green-500/30 bg-green-500/5'
              : check.status === 'unverifiable'
                ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-red-500/20 bg-red-500/5'
          return (
            <div
              key={check.name}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] ${statusBg}`}
              title={check.detail}
            >
              {check.status === 'passed' ? (
                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
              ) : check.status === 'unverifiable' ? (
                <HelpCircle className="h-3 w-3 text-amber-500 shrink-0" />
              ) : (
                <XCircle className="h-3 w-3 text-red-400 shrink-0" />
              )}
              <span className="text-muted-foreground leading-tight">{check.name}</span>
            </div>
          )
        })}
      </div>

      {details?.contentLinkCount !== undefined && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            <Link2 className="h-3 w-3 mr-1" />
            {details.contentLinkCount} links
          </Badge>
          <Badge variant="outline" className="text-xs">
            {details.contentImageCount ?? 0} images
          </Badge>
        </div>
      )}
    </div>
  )
}

function GitHubDetails({ analysis }: { analysis: GitHubAnalysis }) {
  const details = analysis.details
  if (!details) return <p className="text-sm text-muted-foreground">No GitHub data available.</p>
  const { profile, repos, events, contributions } = details

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl font-bold">{profile.followers.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Followers</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <p className="text-xl font-bold">{profile.public_repos}</p>
          <p className="text-[10px] text-muted-foreground">Repositories</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <p className="text-xl font-bold">{repos.filter((r) => r.stars > 0).length}</p>
          <p className="text-[10px] text-muted-foreground">Starred repos</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <p className="text-xl font-bold">
            {new Set(repos.filter((r) => r.language).map((r) => r.language)).size}
          </p>
          <p className="text-[10px] text-muted-foreground">Languages</p>
        </div>
      </div>

      {contributions && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg bg-green-500/10 p-3 text-center">
            <p className="text-xl font-bold text-green-500">
              {contributions.totalContributions.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Year Contributions
            </p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3 text-center">
            <p className="text-xl font-bold text-amber-500">{contributions.currentStreak}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Day Streak</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-3 text-center">
            <p className="text-xl font-bold text-blue-500">{contributions.longestStreak}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Longest Streak
            </p>
          </div>
          <div className="rounded-lg bg-purple-500/10 p-3 text-center">
            <p className="text-xl font-bold text-purple-500">
              {contributions.averagePerWeek.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg / Week</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ResumeDetails({ analysis }: { analysis: ResumeAnalysis }) {
  const details = analysis.details
  if (!details) return <p className="text-sm text-muted-foreground">No resume data available.</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <p className="text-xl font-bold">{details.wordCount}</p>
          <p className="text-[10px] text-muted-foreground">Words</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <p className="text-xl font-bold">{details.skills.filter((s) => s.found).length}</p>
          <p className="text-[10px] text-muted-foreground">Skills</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-center">
          <p className="text-xl font-bold">{details.workEntries.length}</p>
          <p className="text-[10px] text-muted-foreground">Positions</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant={details.hasEmail ? 'success' : 'outline'} className="text-xs">
          {details.hasEmail ? '✓' : '✗'} Email
        </Badge>
        <Badge variant={details.hasLinkedIn ? 'success' : 'outline'} className="text-xs">
          {details.hasLinkedIn ? '✓' : '✗'} LinkedIn
        </Badge>
        <Badge variant={details.hasGithub ? 'success' : 'outline'} className="text-xs">
          {details.hasGithub ? '✓' : '✗'} GitHub
        </Badge>
        <Badge variant={details.hasMetrics ? 'success' : 'outline'} className="text-xs">
          {details.hasMetrics ? '✓' : '✗'} Metrics
        </Badge>
        <Badge variant={details.hasActionVerbs ? 'success' : 'outline'} className="text-xs">
          {details.hasActionVerbs ? '✓' : '✗'} Action Verbs
        </Badge>
      </div>
    </div>
  )
}

function AISummaryCard({ result }: { result: AISummaryResult }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-amber-500/15 p-1.5">
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <span className="text-base font-bold">AI Overall Assessment</span>
        </div>
        <ScoreBadge score={result.overallScore} size="lg" />
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {result.sourceBreakdown.portfolio && (
          <div className="rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent p-3">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-blue-500" />
              <p className="text-xs font-semibold uppercase tracking-wide">Portfolio</p>
            </div>
            <p className="text-2xl font-bold text-blue-500">
              {result.sourceBreakdown.portfolio.score}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {result.sourceBreakdown.portfolio.summary}
            </p>
          </div>
        )}
        {result.sourceBreakdown.github && (
          <div className="rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-500/5 to-transparent p-3">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="h-4 w-4 text-purple-500" />
              <p className="text-xs font-semibold uppercase tracking-wide">GitHub</p>
            </div>
            <p className="text-2xl font-bold text-purple-500">
              {result.sourceBreakdown.github.score}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {result.sourceBreakdown.github.summary}
            </p>
          </div>
        )}
        {result.sourceBreakdown.resume && (
          <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent p-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-emerald-500" />
              <p className="text-xs font-semibold uppercase tracking-wide">Resume</p>
            </div>
            <p className="text-2xl font-bold text-emerald-500">
              {result.sourceBreakdown.resume.score}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {result.sourceBreakdown.resume.summary}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {result.topStrengths.length > 0 && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
            </p>
            <div className="space-y-1">
              {result.topStrengths.map((s, i) => (
                <p key={i} className="text-xs flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                  <span>{s}</span>
                </p>
              ))}
            </div>
          </div>
        )}
        {result.topWeaknesses.length > 0 && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Weaknesses
            </p>
            <div className="space-y-1">
              {result.topWeaknesses.map((w, i) => (
                <p key={i} className="text-xs flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1 shrink-0" />
                  <span>{w}</span>
                </p>
              ))}
            </div>
          </div>
        )}
        {result.topRecommendations.length > 0 && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Target className="h-3.5 w-3.5" /> Recommendations
            </p>
            <div className="space-y-1">
              {result.topRecommendations.map((r, i) => (
                <p key={i} className="text-xs flex items-start gap-1.5">
                  <span className="text-blue-500 font-medium">{i + 1}.</span>
                  <span>{r}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MismatchBanner({ mismatches }: { mismatches: AIMismatch[] }) {
  if (!mismatches.length) return null

  const severityColors: Record<string, string> = {
    high: 'border-red-500/30 bg-red-500/10',
    medium: 'border-amber-500/30 bg-amber-500/10',
    low: 'border-blue-500/30 bg-blue-500/10',
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <p className="text-sm font-semibold text-red-500">Information Mismatches Detected</p>
      </div>
      <div className="space-y-2">
        {mismatches.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg border px-3 py-2 ${severityColors[m.severity] || severityColors.low}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] uppercase">
                {m.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {m.type}
              </Badge>
            </div>
            <p className="text-sm">{m.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sources: {m.sources.join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReviewDetailView({ review, isAnonymous }: ReviewDetailViewProps) {
  const router = useRouter()
  const [showSource, setShowSource] = useState<Record<string, boolean>>({})
  const fullResults = review.full_results
  const mismatches = fullResults?.mismatches ?? []

  const toggleSource = (id: string) => {
    setShowSource((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/reviews')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Header Card */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <CardTitle className="text-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {review.detected_name ? (
                  <>
                    <div className="rounded-full bg-primary/10 p-1.5">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <span>{review.detected_name}</span>
                  </>
                ) : (
                  <span>Review Details</span>
                )}
              </div>
              <ScoreBadge score={review.overall_score} size="lg" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(review.created_at)}
            </div>
            {review.source_types.map((t) => {
              const Icon = sourceIcons[t] || FileText
              return (
                <Badge key={t} variant="outline" className="flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Badge>
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {review.portfolio_url && (
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Portfolio</p>
                <p className="text-sm font-medium truncate">{review.portfolio_url}</p>
              </div>
            )}
            {review.github_username && (
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">GitHub</p>
                <p className="text-sm font-medium">@{review.github_username}</p>
              </div>
            )}
            {review.resume_url && (
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Resume</p>
                <p className="text-sm font-medium truncate">{review.resume_url}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Summary */}
      {fullResults?.aiSummary && <AISummaryCard result={fullResults.aiSummary} />}

      <div className="relative mt-8">
        {isAnonymous && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
            <div className="max-w-sm p-6 text-center space-y-4 bg-card border shadow-xl rounded-xl">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Unlock Full Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Create a free account to unlock your detailed 360° review and save it forever.
              </p>
              <Button className="w-full" onClick={() => router.push('/register')}>
                Sign up to unlock
              </Button>
            </div>
          </div>
        )}

        <div className={isAnonymous ? "opacity-30 pointer-events-none space-y-6 select-none" : "space-y-6"}>
          {/* Mismatches */}
          {mismatches.length > 0 && <MismatchBanner mismatches={mismatches} />}

          {/* Source Details */}
          {fullResults?.portfolio && (
            <Card className="border-blue-500/20">
              <CardHeader className="border-b pb-3">
                <button
                  type="button"
                  onClick={() => toggleSource('portfolio')}
                  className="flex w-full items-center gap-2 text-left"
                >
                  {showSource.portfolio ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Globe className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-semibold">Portfolio Analysis</span>
                  <span className="ml-auto">
                    <ScoreBadge score={fullResults.portfolio.score} size="sm" />
                  </span>
                </button>
              </CardHeader>
              {showSource.portfolio && (
                <CardContent className="p-4">
                  <PortfolioDetails analysis={fullResults.portfolio} />
                </CardContent>
              )}
            </Card>
          )}

          {fullResults?.github && (
            <Card className="border-purple-500/20">
              <CardHeader className="border-b pb-3">
                <button
                  type="button"
                  onClick={() => toggleSource('github')}
                  className="flex w-full items-center gap-2 text-left"
                >
                  {showSource.github ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <GitBranch className="h-5 w-5 text-purple-500" />
                  <span className="text-sm font-semibold">GitHub Profile</span>
                  <span className="ml-auto">
                    <ScoreBadge score={fullResults.github.score} size="sm" />
                  </span>
                </button>
              </CardHeader>
              {showSource.github && (
                <CardContent className="p-4">
                  <GitHubDetails analysis={fullResults.github} />
                </CardContent>
              )}
            </Card>
          )}

          {fullResults?.resume && (
            <Card className="border-emerald-500/20">
              <CardHeader className="border-b pb-3">
                <button
                  type="button"
                  onClick={() => toggleSource('resume')}
                  className="flex w-full items-center gap-2 text-left"
                >
                  {showSource.resume ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <FileText className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-semibold">Resume Analysis</span>
                  <span className="ml-auto">
                    <ScoreBadge score={fullResults.resume.score} size="sm" />
                  </span>
                </button>
              </CardHeader>
              {showSource.resume && (
                 <CardContent className="p-4">
                  <ResumeDetails analysis={fullResults.resume} />
                </CardContent>
              )}
            </Card>
          )}

          {/* Raw Results */}
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              View raw JSON data
            </summary>
            <pre className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto rounded-lg border bg-muted/50 p-3 leading-relaxed">
              {JSON.stringify(fullResults, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}
