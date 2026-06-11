'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Badge } from '@/components/common/Badge'
import { ScoreBadge } from '@/components/common/ScoreBadge'
import { ReviewHistory } from '@/components/dashboard/ReviewHistory'
import type {
  PortfolioAnalysis,
  GitHubAnalysis,
  ResumeAnalysis,
  AISummaryResult,
  AIMismatch,
  ResumeWorkEntry,
  ResumeEducation,
} from '@/types'
import {
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  Globe,
  GitBranch,
  FileText,
  ChevronDown,
  ChevronRight,
  Star,
  Sparkles,
  Search,
  Users,
  Link2,
  AlertTriangle,
  Target,
  ExternalLink,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'

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

interface ReviewsPageClientProps {
  reviews: ReviewHistoryItem[]
}

type Phase = 'form' | 'collecting' | 'analyzing' | 'finalizing'

interface CollectingStep {
  id: string
  label: string
  source: string
  status: 'pending' | 'loading' | 'success' | 'error'
}

interface AnalysisResults {
  portfolio?: PortfolioAnalysis
  github?: GitHubAnalysis
  resume?: ResumeAnalysis
  aiSummary?: AISummaryResult
  mismatches?: AIMismatch[]
}

const sourceColors: Record<string, string> = {
  portfolio: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
  github: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
  resume: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
}

function AISummaryDisplay({ result }: { result: AISummaryResult }) {
  return (
    <div className="space-y-4">
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

function CollectingCard({ steps }: { steps: CollectingStep[] }) {
  const sourceIcons: Record<string, typeof Globe> = {
    portfolio: Globe,
    github: GitBranch,
    resume: FileText,
  }
  const allDone = steps.every((s) => s.status === 'success' || s.status === 'error')

  return (
    <div className="rounded-xl border bg-gradient-to-r from-blue-500/20 to-blue-600/5 border-blue-500/30 overflow-hidden transition-all duration-300">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <div className="rounded-full bg-blue-500/15 p-1">
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Collecting Source Data</p>
            <p className="text-xs text-muted-foreground">
              Gathering information from all sources...
            </p>
          </div>
          {allDone && (
            <div className="rounded-full bg-green-500/15 p-1">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>

        <div className="ml-9 space-y-2">
          {steps.map((step) => {
            const Icon = sourceIcons[step.id] || Loader2
            const color = sourceColors[step.id] || ''
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all duration-300 ${
                  step.status === 'loading'
                    ? 'bg-muted/20 border-primary/30'
                    : step.status === 'success'
                      ? `${color} bg-opacity-50`
                      : step.status === 'error'
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-muted/30 opacity-50'
                }`}
              >
                <div className="shrink-0">
                  {step.status === 'loading' ? (
                    <div className="relative">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <div className="absolute inset-0 h-4 w-4 animate-ping rounded-full bg-blue-500/20" />
                    </div>
                  ) : step.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : step.status === 'error' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-dashed border-muted-foreground/30" />
                  )}
                </div>
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1">{step.label}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {step.source}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AnalyzingCard({ steps }: { steps: CollectingStep[] }) {
  const completedCount = steps.filter((s) => s.status === 'success').length
  const totalCount = steps.length

  return (
    <div className="rounded-xl border bg-gradient-to-r from-amber-500/20 to-amber-600/5 border-amber-500/30 overflow-hidden transition-all duration-300">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              <div className="absolute inset-0 h-5 w-5 animate-ping rounded-full bg-amber-500/20" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">AI Analysis</p>
            <p className="text-xs text-muted-foreground">
              Combining data from {completedCount}/{totalCount} sources...
            </p>
          </div>
        </div>

        <div className="ml-9 space-y-1.5 border-l-2 border-amber-500/30 pl-3">
          <div className="flex items-center gap-2 text-sm">
            <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-muted-foreground">Collecting all gathered data...</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-muted-foreground">
              Analyzing portfolio, GitHub, and resume...
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-muted-foreground">Generating overall assessment...</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <span
              className="inline-block h-1 w-1 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="inline-block h-1 w-1 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="inline-block h-1 w-1 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
            <span className="ml-1">Processing...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FinalizingCard({ steps, results }: { steps: CollectingStep[]; results: AnalysisResults }) {
  const succeeded = steps.filter((s) => s.status === 'success')
  const failed = steps.filter((s) => s.status === 'error')
  const resultKeys = Object.keys(results)

  return (
    <div className="rounded-xl border bg-gradient-to-r from-green-500/20 to-green-600/5 border-green-500/30 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="shrink-0">
            <div className="rounded-full bg-green-500/15 p-1">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Analysis Complete</p>
            <p className="text-xs text-muted-foreground">
              {succeeded.length} source(s) analyzed
              {failed.length > 0 && `, ${failed.length} failed`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {resultKeys.map(
              (k) =>
                (results as Record<string, { score?: number }>)[k]?.score !== undefined && (
                  <ScoreBadge
                    key={k}
                    score={(results as Record<string, { score?: number }>)[k].score!}
                    size="sm"
                  />
                )
            )}
          </div>
        </div>

        {succeeded.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
            <span className="font-medium text-foreground">{s.label}</span>
            <span className="truncate max-w-[200px]">— {s.source}</span>
          </div>
        ))}
        {failed.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <XCircle className="h-3 w-3 text-red-500 shrink-0" />
            <span className="font-medium text-foreground">{s.label}</span>
            <span className="text-red-500">— Failed</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReviewsPageClient({ reviews }: ReviewsPageClientProps) {
  const router = useRouter()
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const [collectingSteps, setCollectingSteps] = useState<CollectingStep[]>([])
  const [results, setResults] = useState<AnalysisResults>({})
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleDetail = (id: string) => {
    setShowDetails((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const stripGitHubUrl = (input: string): string => {
    const match = input
      .trim()
      .match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_-]+)(?:\/.*)?$/i)
    return match ? match[1] : input.trim()
  }

  const hasDetails = useCallback((result: Record<string, unknown>, id: string): boolean => {
    if (id === 'portfolio') return Array.isArray(result.checks) && result.checks.length > 0
    if (id === 'github') return !!result.profile || !!result.repos
    if (id === 'resume')
      return (
        !!(result.name || result.email) ||
        (Array.isArray(result.skills) && result.skills.length > 0)
      )
    return false
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResults({})
    setShowDetails({})

    const cleanGithub = githubUsername ? stripGitHubUrl(githubUsername) : ''
    const cleanPortfolio = portfolioUrl.trim()

    const sources: { id: 'portfolio' | 'github' | 'resume'; label: string; source: string }[] = []
    if (cleanPortfolio)
      sources.push({ id: 'portfolio', label: 'Portfolio', source: cleanPortfolio })
    if (cleanGithub) sources.push({ id: 'github', label: 'GitHub Profile', source: cleanGithub })
    if (resumeFile) sources.push({ id: 'resume', label: 'Resume', source: resumeFile.name })

    if (sources.length === 0) {
      setError('Provide at least one source (portfolio URL, GitHub username, or resume)')
      setIsLoading(false)
      return
    }

    // ── Phase 1: Collect sources sequentially ──
    setPhase('collecting')
    setCollectingSteps(sources.map((s) => ({ ...s, status: 'pending' })))

    const collected: AnalysisResults = {}
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

    for (const source of sources) {
      setCollectingSteps((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, status: 'loading' } : s))
      )
      await delay(400)

      try {
        let res: { success: boolean; data?: unknown; message?: string }
        if (source.id === 'portfolio') {
          res = await fetch('/api/reviews/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portfolioUrl: cleanPortfolio }),
          }).then((r) => r.json())
        } else if (source.id === 'github') {
          res = await fetch('/api/reviews/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ githubUsername: cleanGithub }),
          }).then((r) => r.json())
        } else {
          const fd = new FormData()
          fd.append('resume', resumeFile!)
          res = await fetch('/api/reviews/resume', { method: 'POST', body: fd }).then((r) =>
            r.json()
          )
        }

        if (res.success && res.data) {
          const result = res.data as Record<string, unknown>
          const details = result.details as Record<string, unknown> | undefined
          if (details && hasDetails(details, source.id)) {
            collected[source.id] = res.data as never
            setCollectingSteps((prev) =>
              prev.map((s) => (s.id === source.id ? { ...s, status: 'success' } : s))
            )
          } else {
            setCollectingSteps((prev) =>
              prev.map((s) => (s.id === source.id ? { ...s, status: 'error' } : s))
            )
          }
        } else {
          setCollectingSteps((prev) =>
            prev.map((s) => (s.id === source.id ? { ...s, status: 'error' } : s))
          )
        }
      } catch {
        setCollectingSteps((prev) =>
          prev.map((s) => (s.id === source.id ? { ...s, status: 'error' } : s))
        )
      }

      await delay(600)
    }

    setResults({ ...collected })

    const hasAnyData = Object.values(collected).some(Boolean)
    if (!hasAnyData) {
      setError('All provided sources failed. Check each source and try again.')
      setIsLoading(false)
      return
    }

    // ── Phase 2: AI Analysis ──
    setPhase('analyzing')

    try {
      const aiRes = await fetch('/api/reviews/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio: collected.portfolio,
          github: collected.github,
          resume: collected.resume,
        }),
      }).then((r) => r.json())

      if (aiRes.success && aiRes.data) {
        collected.aiSummary = aiRes.data.summary
        collected.mismatches = aiRes.data.mismatches
        setResults({ ...collected })
      }
    } catch {
      // AI summary failed — results still shown without AI
    }

    // ── Phase 3: Finalizing (save + show results) ──
    setPhase('finalizing')

    try {
      const payload: Record<string, unknown> = {}
      if (cleanPortfolio) payload.portfolioUrl = cleanPortfolio
      if (cleanGithub) payload.githubUsername = cleanGithub
      if (resumeFile) payload.resumeFileName = resumeFile.name
      if (collected.portfolio) payload.portfolio = collected.portfolio
      if (collected.github) payload.github = collected.github
      if (collected.resume) payload.resume = collected.resume
      if (collected.aiSummary) payload.aiSummary = collected.aiSummary
      if (collected.mismatches?.length) payload.mismatches = collected.mismatches

      const createRes = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const createJson = await createRes.json()

      if (createJson.success) {
        setPortfolioUrl('')
        setGithubUsername('')
        setResumeFile(null)
        setTimeout(() => router.refresh(), 2000)
      }
    } catch {
      // save failed — results still shown
    }

    setIsLoading(false)
  }

  // ── Results layout ─────────────────────────────────────
  const hasAnyResults = Object.keys(results).length > 0
  const isDone = phase === 'finalizing' && !isLoading

  // ── Detail sub-components ──────────────────────────────

  const PortfolioDetails = ({ analysis }: { analysis: PortfolioAnalysis }) => {
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Unverified
              </p>
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

        {unverifiable > 0 && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
            <p className="text-xs text-amber-600 flex items-start gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {unverifiable} check(s) could not be verified because the site uses JavaScript
                rendering.
              </span>
            </p>
          </div>
        )}
      </div>
    )
  }

  const GitHubDetails = ({ analysis }: { analysis: GitHubAnalysis }) => {
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Day Streak
              </p>
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Avg / Week
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {profile.name && (
            <>
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{profile.name}</span>
            </>
          )}
          {profile.location && (
            <>
              <span className="text-muted-foreground">Location</span>
              <span>{profile.location}</span>
            </>
          )}
          {profile.company && (
            <>
              <span className="text-muted-foreground">Company</span>
              <span>{profile.company}</span>
            </>
          )}
          {profile.blog && (
            <>
              <span className="text-muted-foreground">Website</span>
              <a
                href={profile.blog}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline inline-flex items-center gap-1"
              >
                {profile.blog.replace(/^https?:\/\//, '').slice(0, 30)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>

        {repos.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1">
              <GitBranch className="h-4 w-4" />
              Recent Repositories
            </p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {repos.slice(0, 10).map((repo) => (
                <div
                  key={repo.name}
                  className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{repo.name}</span>
                  {repo.language && (
                    <Badge variant="outline" className="text-[10px]">
                      {repo.language}
                    </Badge>
                  )}
                  {repo.stars > 0 && (
                    <span className="flex items-center gap-0.5 text-yellow-600 text-xs ml-auto">
                      <Star className="h-3 w-3" />
                      {repo.stars}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {events && events.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Recent Activity</p>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {events.map((ev, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                  {ev.type.replace('Event', '')} — {ev.repo.split('/')[1] || ev.repo}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const ResumeDetailView = ({ analysis }: { analysis: ResumeAnalysis }) => {
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

        {details.name && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{details.name}</span>
            {details.isAIAnalyzed && (
              <Badge variant="success" className="text-[10px]">
                <Sparkles className="h-3 w-3 mr-0.5" />
                AI
              </Badge>
            )}
          </div>
        )}

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Skills
            </p>
            <div className="flex flex-wrap gap-1">
              {details.skills.slice(0, 10).map((s) => (
                <Badge
                  key={s.name}
                  variant={s.found ? 'default' : 'outline'}
                  className="text-[10px]"
                >
                  {s.name}
                </Badge>
              ))}
              {details.skills.filter((s) => !s.found).length > 3 && (
                <Badge variant="outline" className="text-[10px]">
                  +{details.skills.filter((s) => !s.found).length} missing
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Sections
            </p>
            <div className="flex flex-wrap gap-1">
              {details.sections.map((s) => (
                <Badge
                  key={s.name}
                  variant={s.found ? 'default' : 'outline'}
                  className="text-[10px]"
                >
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {(details.workEntries ?? []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Work Experience
            </p>
            <div className="space-y-1">
              {details.workEntries.map((entry, i) => {
                if (typeof entry === 'string') {
                  return (
                    <p key={i} className="text-sm flex items-start gap-1">
                      <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>{entry}</span>
                    </p>
                  )
                }
                const obj = entry as ResumeWorkEntry
                return (
                  <div key={i} className="rounded-lg border border-border/50 px-3 py-2 text-sm">
                    {obj.role && <span className="font-semibold">{obj.role}</span>}
                    {obj.company && (
                      <span className="text-muted-foreground"> at {obj.company}</span>
                    )}
                    {obj.dates && (
                      <span className="text-muted-foreground text-xs ml-2">— {obj.dates}</span>
                    )}
                    {obj.description && (
                      <p className="text-xs text-muted-foreground mt-1">{obj.description}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {(details.education ?? []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Education
            </p>
            <div className="space-y-1">
              {(details.education ?? []).map((entry, i) => {
                const edu = entry as ResumeEducation
                return (
                  <div key={i} className="rounded-lg border border-border/50 px-3 py-2 text-sm">
                    {edu.degree && <span className="font-semibold">{edu.degree}</span>}
                    {edu.school && <span className="text-muted-foreground"> at {edu.school}</span>}
                    {edu.dates && (
                      <span className="text-muted-foreground text-xs ml-2">— {edu.dates}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {details.rawText && (
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              View extracted raw text ({details.rawText.length} chars)
            </summary>
            <pre className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto rounded-lg border bg-muted/50 p-3 leading-relaxed">
              {details.rawText}
            </pre>
          </details>
        )}
      </div>
    )
  }

  const renderSourceDetails = (id: 'portfolio' | 'github' | 'resume', label: string) => {
    const d = results[id]
    if (!d) return null
    const score = 'score' in d ? d.score : 0
    const isOpen = showDetails[id] ?? false
    return (
      <div className="rounded-xl border bg-card overflow-hidden transition-all duration-200">
        <button
          type="button"
          onClick={() => toggleDetail(id)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-semibold">{label}</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isOpen ? 'Hide details' : 'View details'}
            </span>
            <ScoreBadge score={score} size="sm" />
          </span>
        </button>
        {isOpen && (
          <div className="border-t px-4 py-3">
            {id === 'portfolio' && <PortfolioDetails analysis={d as PortfolioAnalysis} />}
            {id === 'github' && <GitHubDetails analysis={d as GitHubAnalysis} />}
            {id === 'resume' && <ResumeDetailView analysis={d as ResumeAnalysis} />}
          </div>
        )}
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          Analyze portfolio, GitHub, and resume in one comprehensive review
        </p>
      </div>

      <div className="flex gap-1 rounded-xl bg-muted/50 p-1 border border-border/50 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'new'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="h-4 w-4" />
          New Review
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          History
        </button>
      </div>

      {activeTab === 'new' && (
        <Card className="overflow-hidden border-border/50 shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-lg">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                New Review
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {phase === 'form' ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Globe className="h-4 w-4" />
                    <span className="font-medium text-foreground">Portfolio URL</span>
                  </div>
                  <Input
                    placeholder="https://your-portfolio.com"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <GitBranch className="h-4 w-4" />
                    <span className="font-medium text-foreground">GitHub Username</span>
                  </div>
                  <Input
                    placeholder="your-github-username"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium text-foreground">Resume (PDF)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {resumeFile ? resumeFile.name : 'Upload Resume'}
                    </Button>
                    {resumeFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setResumeFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="text-sm text-red-500 hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
                    <p className="text-sm text-red-500 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {error}
                    </p>
                  </div>
                )}

                <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
                  Run Review
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Phase 1: Collecting */}
                {(phase === 'collecting' || phase === 'analyzing' || phase === 'finalizing') && (
                  <CollectingCard steps={collectingSteps} />
                )}

                {/* Phase 2: Analyzing */}
                {(phase === 'analyzing' || phase === 'finalizing') && (
                  <AnalyzingCard steps={collectingSteps} />
                )}

                {/* Phase 3: Finalizing - results */}
                {phase === 'finalizing' && isDone && hasAnyResults && (
                  <>
                    <FinalizingCard steps={collectingSteps} results={results} />

                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                          Results
                        </p>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
                      </div>

                      {results.aiSummary && (
                        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-4">
                          <AISummaryDisplay result={results.aiSummary} />
                        </div>
                      )}
                      {results.portfolio && renderSourceDetails('portfolio', 'Portfolio Analysis')}
                      {results.github && renderSourceDetails('github', 'GitHub Profile')}
                      {results.resume && renderSourceDetails('resume', 'Resume Analysis')}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && <ReviewHistory reviews={reviews} />}
    </div>
  )
}
