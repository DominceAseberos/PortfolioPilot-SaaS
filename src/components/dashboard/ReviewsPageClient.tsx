'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Badge } from '@/components/common/Badge'
import { ScoreBadge } from '@/components/common/ScoreBadge'
import { ReviewHistory } from '@/components/dashboard/ReviewHistory'
import { NeuralChatLanding } from '@/components/dashboard/NeuralChatLanding'
import { getAnalysisCost } from '@/config/pricing'
import { normalizeGitHubUsername } from '@/utils/source-normalizers'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { ReportTemplate } from '@/components/pdf/ReportTemplate'
import dynamic from 'next/dynamic'
import type { ImprovedResumeData } from '@/components/pdf/ImprovedResumeTemplate'

const ImprovedResumeModal = dynamic(() => import('./ImprovedResumeModal'), { ssr: false })
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
  FileCode2,
  X,
  BarChart2,
} from 'lucide-react'

function TypingText({ text, speed = 12, onComplete, isHistory }: { text: string; speed?: number; onComplete?: () => void; isHistory?: boolean }) {
  const [shown, setShown] = useState(isHistory ? text : '')
  const onCompleteRef = useRef(onComplete)
  
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (isHistory) {
      if (onCompleteRef.current) onCompleteRef.current()
      return
    }

    setShown('')
    let index = 0
    let completed = false
    const interval = setInterval(() => {
      index += 2
      setShown(text.slice(0, index))
      if (index >= text.length && !completed) {
        clearInterval(interval)
        completed = true
        if (onCompleteRef.current) {
          setTimeout(() => {
            if (onCompleteRef.current) onCompleteRef.current()
          }, 300)
        }
      }
    }, speed)

    return () => {
      clearInterval(interval)
      completed = true
    }
  }, [text, speed, isHistory])

  return (
    <>
      {shown}
      {shown.length < text.length && !isHistory && (
        <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary animate-pulse" />
      )}
    </>
  )
}

function TypingList({ items, speed = 12, onComplete, isHistory, renderPrefix }: { items: string[]; speed?: number; onComplete?: () => void; isHistory?: boolean; renderPrefix?: (i: number) => React.ReactNode }) {
  const [currentIndex, setCurrentIndex] = useState(isHistory ? items.length : 0)
  const onCompleteRef = useRef(onComplete)
  
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (isHistory) {
      if (onCompleteRef.current) onCompleteRef.current()
    }
  }, [isHistory])

  const handleComplete = useCallback(() => {
    setCurrentIndex(prev => {
      const next = prev + 1
      if (next >= items.length) {
        if (onCompleteRef.current) {
          setTimeout(() => {
            if (onCompleteRef.current) onCompleteRef.current()
          }, 300)
        }
      }
      return next
    })
  }, [items.length])

  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        i <= currentIndex && (
          <li key={i} className="text-sm flex items-start gap-3">
            {renderPrefix && renderPrefix(i)}
            <span className="text-foreground/80 leading-relaxed font-medium">
               {isHistory ? item : <TypingText text={item} speed={speed} isHistory={isHistory} onComplete={i === currentIndex ? handleComplete : undefined} />}
            </span>
          </li>
        )
      ))}
    </ul>
  )
}

function BubbleSkeleton({ tone = 'primary', height = 'h-32' }: { tone?: 'primary' | 'green' | 'red' | 'blue' | 'orange'; height?: string }) {
  const toneClass =
    tone === 'green' ? 'bg-green-500/10 border-green-500/20' :
    tone === 'red' ? 'bg-red-500/10 border-red-500/20' :
    tone === 'blue' ? 'bg-blue-500/10 border-blue-500/20' :
    tone === 'orange' ? 'bg-orange-500/10 border-orange-500/20' :
    'bg-primary/10 border-primary/20'

  return (
    <div className={`rounded-2xl rounded-tl-none border p-5 shadow-sm ${toneClass} ${height} animate-pulse`}>
      <div className="h-3 w-2/3 rounded bg-foreground/10 mb-4" />
      <div className="h-3 w-full rounded bg-foreground/10 mb-3" />
      <div className="h-3 w-5/6 rounded bg-foreground/10" />
    </div>
  )
}

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

function buildFallbackSummary(results: AnalysisResults, reason?: string): AISummaryResult {
  const scores = [results.portfolio?.score, results.github?.score, results.resume?.score].filter(
    (score): score is number => typeof score === 'number'
  )
  const fallbackScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0
  const topStrengths = [
    ...(results.portfolio?.strengths ?? []),
    ...(results.github?.strengths ?? []),
    ...(results.resume?.strengths ?? []),
  ].slice(0, 5)
  const topWeaknesses = [
    ...(results.portfolio?.weaknesses ?? []),
    ...(results.github?.weaknesses ?? []),
    ...(results.resume?.weaknesses ?? []),
  ].slice(0, 5)
  const topRecommendations = [
    ...(results.portfolio?.recommendations ?? []),
    ...(results.github?.recommendations ?? []),
    ...(results.resume?.recommendations ?? []),
  ].slice(0, 5)
  const summary =
    reason ||
    `Source analysis completed. Portfolio scored ${results.portfolio?.score ?? 'N/A'}, GitHub scored ${results.github?.score ?? 'N/A'}, and Resume scored ${results.resume?.score ?? 'N/A'}.`

  return {
    overallScore: fallbackScore,
    summary,
    topStrengths,
    topWeaknesses,
    topRecommendations,
    sourceBreakdown: {
      portfolio: results.portfolio
        ? { score: results.portfolio.score, summary: results.portfolio.strengths.slice(0, 2).join('; ') || 'Analyzed' }
        : null,
      github: results.github
        ? { score: results.github.score, summary: results.github.strengths.slice(0, 2).join('; ') || 'Analyzed' }
        : null,
      resume: results.resume
        ? { score: results.resume.score, summary: results.resume.strengths.slice(0, 2).join('; ') || 'Analyzed' }
        : null,
    },
    radar: {
      presentation: results.portfolio?.score ?? 0,
      openSource: results.github?.score ?? 0,
      experience: results.resume?.score ?? 0,
      techStack: fallbackScore,
      consistency: fallbackScore,
    },
    normalFeedback: {
      overallScore: fallbackScore,
      summary,
      topStrengths,
    },
    deepFeedback: {
      topWeaknesses,
      topRecommendations,
      radar: {
        presentation: results.portfolio?.score ?? 0,
        openSource: results.github?.score ?? 0,
        experience: results.resume?.score ?? 0,
        techStack: fallbackScore,
        consistency: fallbackScore,
      },
    },
  }
}

function StreamingChatBox({
  result,
  mismatches,
  isGuest = false,
  isHistory = false,
  onReset,
  renderSourceDetails,
  portfolioAnalysis,
  githubAnalysis,
  resumeAnalysis,
  portfolioUrl,
  githubUsername,
  resumeFile,
  isGuestFallback = false,
}: {
  result: AISummaryResult
  mismatches?: AIMismatch[]
  isGuest?: boolean
  isHistory?: boolean
  onReset: () => void
  renderSourceDetails: (id: 'portfolio' | 'github' | 'resume', label: string) => React.ReactNode
  portfolioAnalysis?: PortfolioAnalysis | null
  githubAnalysis?: GitHubAnalysis | null
  resumeAnalysis?: ResumeAnalysis | null
  portfolioUrl?: string
  githubUsername?: string
  resumeFile?: File | null
  isGuestFallback?: boolean
}) {
  const [isThinking, setIsThinking] = useState(!isHistory)
  const [animatedScore, setAnimatedScore] = useState(isHistory ? (result.normalFeedback?.overallScore ?? result.overallScore) : 0)
  const [displayedText, setDisplayedText] = useState(isHistory ? (result.normalFeedback?.summary ?? result.summary) : '')
  const [visibleStep, setVisibleStep] = useState(isHistory ? 99 : 0)
  const [showModal, setShowModal] = useState(false)
  const [showResumeModal, setShowResumeModal] = useState(false)
  const [resumeData, setResumeData] = useState<ImprovedResumeData | null>(null)
  const [showRadarChart, setShowRadarChart] = useState(isHistory)
  const pdfRef = useRef<HTMLDivElement>(null)

  const advanceStep = useCallback(() => {
    setVisibleStep(prev => prev + 1)
  }, [])

  const handleGeneratePDF = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isGuest) {
      window.location.href = '/register?next=/dashboard/reviews/latest'
      return
    }
    
    if (!pdfRef.current) return
    
    toast.loading('Generating PDF...', { id: 'pdf-gen' })
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save('PilotReview_Report.pdf')
      toast.success('PDF Generated successfully!', { id: 'pdf-gen' })
    } catch (error) {
      toast.error('Failed to generate PDF', { id: 'pdf-gen' })
    }
  }

  const handleGenerateImprovedResume = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isGuest) {
      window.location.href = '/register?next=/dashboard/reviews/latest'
      return
    }
    
    const details = resumeAnalysis?.details
    const existingSkillNames = new Set((details?.skills ?? []).filter(s => s.found).map(s => s.name.toLowerCase()))
    const githubLanguages = Array.from(new Set((githubAnalysis?.details?.repos ?? []).filter(r => r.language).map(r => r.language as string))).filter(lang => !existingSkillNames.has(lang.toLowerCase()))
    
    const improvedSkills = [
      ...(details?.skills ?? []).filter(s => s.found).map(s => s.name),
      ...githubLanguages.slice(0, 5)
    ]

    const resumeProjectNames = new Set((details?.projects ?? []).map(p => p.name?.toLowerCase() ?? ''))
    const newProjects = (githubAnalysis?.details?.repos ?? [])
      .filter(r => r.stars > 0 && !resumeProjectNames.has(r.name.toLowerCase()))
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 3)
      .map(r => ({
        name: r.name,
        link: githubUsername ? `https://github.com/${githubUsername}/${r.name}` : '',
        description: r.description || r.readmeSummary || `${r.language ?? 'Open source'} project with ${r.stars} stars`,
        isNew: true
      }))

    const initialData: ImprovedResumeData = {
      name: details?.name ?? '',
      email: details?.email ?? '',
      phone: '',
      linkedin: details?.linkedin ?? '',
      github: details?.github ?? (githubUsername ? `https://github.com/${githubUsername}` : ''),
      website: portfolioUrl ?? '',
      summary: result.summary,
      skills: improvedSkills,
      workEntries: (details?.workEntries ?? []).map((w: any) => typeof w === 'string' ? { company: '', role: w, dates: '', description: '' } : w),
      projects: [
        ...(details?.projects ?? []).map((p: any) => ({ ...p, name: p.name ?? '', link: p.link ?? '', description: p.description ?? '' })),
        ...newProjects
      ],
      education: (details?.education ?? []).map((e: any) => ({ degree: e.degree ?? '', school: e.school ?? '', dates: e.dates ?? '' })),
      recommendations: result.topRecommendations
    }

    setResumeData(initialData)
    setShowResumeModal(true)
  }

  const radarData = [
    { subject: 'Presentation', A: result.radar?.presentation || 0, fullMark: 100 },
    { subject: 'Open Source', A: result.radar?.openSource || 0, fullMark: 100 },
    { subject: 'Experience', A: result.radar?.experience || 0, fullMark: 100 },
    { subject: 'Tech Stack', A: result.radar?.techStack || 0, fullMark: 100 },
    { subject: 'Consistency', A: result.radar?.consistency || 0, fullMark: 100 },
  ]

  useEffect(() => {
    if (isHistory) return

    let i = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const text = result.normalFeedback?.summary ?? result.summary
    const targetScore = result.normalFeedback?.overallScore ?? result.overallScore
    setDisplayedText('')
    setVisibleStep(0)
    setShowRadarChart(false)

    const thinkTimeout = setTimeout(() => {
      setIsThinking(false)
      interval = setInterval(() => {
        i += 2 // Type 2 chars at a time
        if (i > text.length) {
          setDisplayedText(text)
          setAnimatedScore(targetScore)
          if (interval) clearInterval(interval)
          setTimeout(advanceStep, 500)
          return
        }
        setDisplayedText(text.slice(0, i))
        
        // Calculate score based on percentage of text typed
        const progress = i / text.length
        setAnimatedScore(Math.floor(progress * targetScore))
        
      }, 15)
    }, 1500) // 1.5 seconds thinking delay

    return () => {
      clearTimeout(thinkTimeout)
      if (interval) clearInterval(interval)
    }
  }, [result.summary, result.overallScore, result.normalFeedback, isHistory, advanceStep])

  const activeSourceCount = [result.sourceBreakdown.portfolio, result.sourceBreakdown.github, result.sourceBreakdown.resume].filter(Boolean).length

  useEffect(() => {
    if (isHistory) return
    
    // Auto-advance logic for non-typing steps
    if (visibleStep === 1) {
      if (activeSourceCount > 1) {
        const t = setTimeout(advanceStep, 1500)
        return () => clearTimeout(t)
      } else {
        advanceStep()
      }
    }
    
    // Auto-skip empty list steps
    if (visibleStep === 2 && (result.normalFeedback?.topStrengths ?? result.topStrengths).length === 0) {
      advanceStep()
    }
    
    // Guest jump logic (guests only see up to step 2 visually typing, then it blurs out and jumps to 8)
    if (visibleStep === 3) {
      if (isGuest) {
        setVisibleStep(8)
      } else if ((result.deepFeedback?.topWeaknesses ?? result.topWeaknesses).length === 0) {
        advanceStep()
      }
    }
    
    if (visibleStep === 4 && (result.deepFeedback?.topRecommendations ?? result.topRecommendations).length === 0) {
      // Recommendations actually uses a "No major areas" text if empty, so we don't auto-skip
    }
    
    if (visibleStep === 5 && (!mismatches || mismatches.length === 0)) {
      advanceStep()
    }
    
    if (visibleStep === 6) {
      if (result.radar && result.overallScore > 0) {
        const t = setTimeout(() => {
          setShowRadarChart(true)
          setTimeout(advanceStep, 1000)
        }, 2500)
        return () => clearTimeout(t)
      } else {
        advanceStep()
      }
    }
    
    if (visibleStep === 7) {
      const t = setTimeout(advanceStep, 1500)
      return () => clearTimeout(t)
    }
    
  }, [visibleStep, isHistory, activeSourceCount, result, mismatches, isGuest, advanceStep])

  const isDoneTyping = isHistory || (!isThinking && displayedText.length >= (result.normalFeedback?.summary ?? result.summary).length)
  const showStep = (step: number) => isHistory || (isDoneTyping && visibleStep >= step)

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Chat Thread */}
      <div className="flex-1 pr-2 space-y-6 pb-10">
        {/* Main AI Summary Chat Bubble */}
        <div className="flex gap-4">
           <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
             <Sparkles className="h-5 w-5 text-primary" />
           </div>
           <div className="flex-1 space-y-2">
             <div className="flex items-center gap-2">
               <span className="font-bold text-sm">Pilot Agent</span>
               <span className="text-xs text-muted-foreground">Just now</span>
             </div>
             <div className="rounded-2xl rounded-tl-none bg-muted/30 border border-border/50 p-5 text-sm leading-relaxed text-foreground/90 font-medium shadow-sm">
                {isThinking ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="italic">Analyzing code and formulating report...</span>
                  </div>
                ) : (
                  <>
                    {displayedText}
                    {!isDoneTyping && (
                      <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary animate-pulse" />
                    )}
                  </>
                )}
             </div>
           </div>
        </div>
        
        {showStep(1) && activeSourceCount > 1 && (
           <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
               <BarChart2 className="h-5 w-5 text-indigo-500" />
             </div>
             <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2">
                 <span className="font-bold text-sm">Individual Scores</span>
               </div>
               <div className="flex flex-wrap gap-4">
                 {result.sourceBreakdown.portfolio && (
                   <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 flex items-center gap-3">
                     <Globe className="h-5 w-5 text-indigo-500" />
                     <div className="flex flex-col">
                       <span className="text-xs text-muted-foreground font-medium">Portfolio</span>
                       <span className="font-bold text-indigo-600">{result.sourceBreakdown.portfolio.score}/100</span>
                     </div>
                   </div>
                 )}
                 {result.sourceBreakdown.github && (
                   <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 flex items-center gap-3">
                     <GitBranch className="h-5 w-5 text-indigo-500" />
                     <div className="flex flex-col">
                       <span className="text-xs text-muted-foreground font-medium">GitHub</span>
                       <span className="font-bold text-indigo-600">{result.sourceBreakdown.github.score}/100</span>
                     </div>
                   </div>
                 )}
                 {result.sourceBreakdown.resume && (
                   <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 flex items-center gap-3">
                     <FileText className="h-5 w-5 text-indigo-500" />
                     <div className="flex flex-col">
                       <span className="text-xs text-muted-foreground font-medium">Resume</span>
                       <span className="font-bold text-indigo-600">{result.sourceBreakdown.resume.score}/100</span>
                     </div>
                   </div>
                 )}
               </div>
             </div>
           </div>
        )}

        {/* Step 1.5 — Portfolio Live Snapshot */}
        {showStep(1) && portfolioAnalysis && portfolioUrl && (
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-10 w-10 shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Live Portfolio Snapshot</span>
                <a href={portfolioUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 ml-auto">
                  {portfolioUrl.replace(/^https?:\/\//, '').slice(0, 30)} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="rounded-2xl rounded-tl-none border border-blue-500/20 bg-blue-500/5 overflow-hidden shadow-sm">
                <div className="relative w-full h-[220px] sm:h-[300px] bg-muted/50">
                  <div className="absolute top-0 left-0 w-[200%] h-[200%] origin-top-left scale-50">
                    <iframe
                      src={portfolioUrl.startsWith('http') ? portfolioUrl : `https://${portfolioUrl}`}
                      className="w-full h-full border-0 bg-background"
                      title="Portfolio in Report"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-blue-500/10 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Score: <span className="font-bold text-blue-600">{portfolioAnalysis.score}/100</span></span>
                  <span className="text-xs text-muted-foreground">{portfolioAnalysis.strengths.length} strengths · {portfolioAnalysis.weaknesses.length} areas to improve</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1.6 — GitHub Activity Metrics */}
        {showStep(1) && githubAnalysis?.details && (
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-10 w-10 shrink-0 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <GitBranch className="h-5 w-5 text-purple-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">GitHub Activity</span>
                {githubUsername && (
                  <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noreferrer" className="text-xs text-purple-500 hover:underline flex items-center gap-1 ml-auto">
                    @{githubUsername} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="rounded-2xl rounded-tl-none border border-purple-500/20 bg-purple-500/5 p-5 shadow-sm space-y-4">
                {/* Metric grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                    <p className="text-xl font-bold">{githubAnalysis.details.profile.followers.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Followers</p>
                  </div>
                  <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                    <p className="text-xl font-bold">{githubAnalysis.details.profile.public_repos}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Repos</p>
                  </div>
                  <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                    <p className="text-xl font-bold">{githubAnalysis.details.repos.filter(r => r.stars > 0).length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Starred</p>
                  </div>
                  <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                    <p className="text-xl font-bold">{new Set(githubAnalysis.details.repos.filter(r => r.language).map(r => r.language)).size}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Languages</p>
                  </div>
                </div>
                {githubAnalysis.details.contributions && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center">
                      <p className="text-xl font-bold text-green-500">{githubAnalysis.details.contributions.totalContributions.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Year Contrib.</p>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                      <p className="text-xl font-bold text-amber-500">{githubAnalysis.details.contributions.currentStreak}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Day Streak</p>
                    </div>
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                      <p className="text-xl font-bold text-blue-500">{githubAnalysis.details.contributions.longestStreak}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Best Streak</p>
                    </div>
                    <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-center">
                      <p className="text-xl font-bold text-purple-500">{githubAnalysis.details.contributions.averagePerWeek.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg/Week</p>
                    </div>
                  </div>
                )}
                {/* Top repos */}
                {githubAnalysis.details.repos.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Top Repositories</p>
                    {githubAnalysis.details.repos.slice(0, 5).map(repo => (
                      <div key={repo.name} className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/40 px-3 py-2 text-sm">
                        <span className="font-medium flex-1 truncate">{repo.name}</span>
                        {repo.language && <Badge variant="outline" className="text-[10px] shrink-0">{repo.language}</Badge>}
                        {repo.stars > 0 && <span className="flex items-center gap-0.5 text-yellow-600 text-xs shrink-0"><Star className="h-3 w-3" />{repo.stars}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 1.7 — Resume at a Glance */}
        {showStep(1) && resumeAnalysis?.details && (
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <FileText className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Resume at a Glance</span>
              </div>
              <div className="rounded-2xl rounded-tl-none border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  {resumeAnalysis.details.name && <span className="font-bold text-base">{resumeAnalysis.details.name}</span>}
                  {resumeAnalysis.details.predictedSeniority && (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">{resumeAnalysis.details.predictedSeniority}</Badge>
                  )}
                  {resumeAnalysis.details.tone && (
                    <Badge variant="outline" className="text-xs">{resumeAnalysis.details.tone} tone</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                    <p className="text-xl font-bold">{resumeAnalysis.details.wordCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Words</p>
                  </div>
                  <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                    <p className="text-xl font-bold">{resumeAnalysis.details.skills.filter(s => s.found).length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Skills</p>
                  </div>
                  <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                    <p className="text-xl font-bold">{resumeAnalysis.details.workEntries.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Positions</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {resumeAnalysis.details.skills.filter(s => s.found).slice(0, 8).map(s => (
                    <Badge key={s.name} variant="secondary" className="text-xs">{s.name}</Badge>
                  ))}
                  {resumeAnalysis.details.skills.filter(s => s.found).length > 8 && (
                    <Badge variant="outline" className="text-xs border-dashed">+{resumeAnalysis.details.skills.filter(s => s.found).length - 8} more</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Strengths Bubble */}
        {showStep(2) && (result.normalFeedback?.topStrengths ?? result.topStrengths).length > 0 && (
           <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="h-10 w-10 shrink-0 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
               <CheckCircle2 className="h-5 w-5 text-green-500" />
             </div>
             <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2">
                 <span className="font-bold text-sm">Strengths Identified</span>
               </div>
               <div className="rounded-2xl rounded-tl-none border border-green-500/20 bg-green-500/5 p-5 shadow-sm">
                 <TypingList 
                   items={result.normalFeedback?.topStrengths ?? result.topStrengths} 
                   onComplete={advanceStep} 
                   isHistory={isHistory}
                   renderPrefix={() => <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                 />
               </div>
             </div>
           </div>
        )}

        <div className="space-y-8 mt-8">
          {/* Weaknesses Bubble */}
                {/* Weaknesses Bubble */}
                {showStep(3) && (result.deepFeedback?.topWeaknesses ?? result.topWeaknesses).length > 0 && (
               <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="h-10 w-10 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                   <AlertTriangle className="h-5 w-5 text-red-500" />
                 </div>
                 <div className="flex-1 space-y-2">
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-sm">Areas for Improvement</span>
                   </div>
                   <div className="rounded-2xl rounded-tl-none border border-red-500/20 bg-red-500/5 p-5 shadow-sm">
                     <TypingList 
                       items={result.deepFeedback?.topWeaknesses ?? result.topWeaknesses} 
                       onComplete={advanceStep} 
                       isHistory={isHistory}
                       renderPrefix={() => <div className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />}
                     />
                   </div>
                 </div>
               </div>
            )}

            {/* Recommendations Bubble */}
            {showStep(4) && (
               <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="h-10 w-10 shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                   <Target className="h-5 w-5 text-blue-500" />
                 </div>
                 <div className="flex-1 space-y-2">
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-sm">Actionable Recommendations</span>
                   </div>
                   <div className="rounded-2xl rounded-tl-none border border-blue-500/20 bg-blue-500/5 p-5 shadow-sm">
                     {(result.deepFeedback?.topRecommendations ?? result.topRecommendations).length > 0 ? (
                       <TypingList 
                         items={result.deepFeedback?.topRecommendations ?? result.topRecommendations} 
                         onComplete={advanceStep} 
                         isHistory={isHistory}
                         renderPrefix={(i) => <span className="text-blue-500 font-bold bg-blue-500/10 rounded-md px-1.5 py-0.5 text-xs shrink-0">{i + 1}</span>}
                       />
                     ) : (
                       <p className="text-sm text-foreground/80 leading-relaxed font-medium"><TypingText text="No major areas of improvement found. Excellent profile!" onComplete={advanceStep} isHistory={isHistory} /></p>
                     )}
                   </div>
                 </div>
               </div>
            )}

            {/* Comparative Analysis Bubble (redesigned mismatches) */}
            {showStep(5) && (() => {
              // Compute client-side: which GitHub languages/repos are missing from resume
              const resumeSkillNames = new Set(
                (resumeAnalysis?.details?.skills ?? []).filter(s => s.found).map(s => s.name.toLowerCase())
              )
              const resumeProjectNames = new Set(
                (resumeAnalysis?.details?.projects ?? []).map(p => (p.name ?? '').toLowerCase())
              )
              const githubLanguages = Array.from(
                new Set((githubAnalysis?.details?.repos ?? []).filter(r => r.language).map(r => r.language as string))
              ).filter(lang => !resumeSkillNames.has(lang.toLowerCase()))
              const githubTopRepos = (githubAnalysis?.details?.repos ?? [])
                .filter(r => r.stars > 0)
                .sort((a, b) => b.stars - a.stars)
                .slice(0, 3)
                .filter(r => !resumeProjectNames.has(r.name.toLowerCase()))

              const notAligned = mismatches ?? []
              const missingFromResume: string[] = [
                ...githubLanguages.slice(0, 3).map(lang => `${lang} appears in your GitHub repos but is not listed in your resume skills`),
                ...githubTopRepos.map(r => `"${r.name}" (⭐${r.stars}) is a top GitHub project not mentioned in your resume`),
              ]
              const canBeAdded: string[] = [
                ...(githubLanguages.length > 0 ? [`Add ${githubLanguages.slice(0, 3).join(', ')} to your skills section — detected across your GitHub repositories`] : []),
                ...(githubAnalysis?.details?.contributions && githubAnalysis.details.contributions.totalContributions > 100
                  ? [`Mention your ${githubAnalysis.details.contributions.totalContributions.toLocaleString()} GitHub contributions this year — a strong signal of activity`]
                  : []),
                ...((resumeAnalysis?.details?.hasMetrics === false) ? ['Add quantified metrics to your work experience (e.g. "reduced load time by 30%")'] : []),
              ]

              const hasAnyData = notAligned.length > 0 || missingFromResume.length > 0 || canBeAdded.length > 0
              if (!hasAnyData) return null

              return (
                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Comparative Analysis</span>
                    </div>
                    <div className="rounded-2xl rounded-tl-none border border-orange-500/20 bg-orange-500/5 p-5 shadow-sm space-y-5">

                      {notAligned.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            Not Aligned
                          </p>
                          <TypingList
                            items={notAligned.map(m => m.description)}
                            onComplete={advanceStep}
                            isHistory={isHistory}
                            renderPrefix={(i) => <span className="text-red-500 font-bold bg-red-500/10 rounded-md px-1.5 py-0.5 text-[11px] shrink-0">{notAligned[i].sources.join(' ↔ ')}</span>}
                          />
                        </div>
                      )}

                      {missingFromResume.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            Missing from Resume
                          </p>
                          <TypingList
                            items={missingFromResume}
                            onComplete={notAligned.length === 0 ? advanceStep : undefined}
                            isHistory={isHistory}
                            renderPrefix={() => <span className="text-amber-500 shrink-0">↳</span>}
                          />
                        </div>
                      )}

                      {canBeAdded.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            Can Be Added / Improved
                          </p>
                          <TypingList
                            items={canBeAdded}
                            onComplete={advanceStep}
                            isHistory={isHistory}
                            renderPrefix={(i) => <span className="text-blue-500 font-bold bg-blue-500/10 rounded-md px-1.5 py-0.5 text-[11px] shrink-0">{i + 1}</span>}
                          />
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Radar Chart Bubble */}
            {isDoneTyping && result.radar && result.overallScore > 0 && visibleStep === 6 && !showRadarChart && (
              <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center"><Target className="h-5 w-5 text-primary opacity-50" /></div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Competency Radar</span>
                    <span className="text-xs text-muted-foreground animate-pulse ml-2">Visualizing...</span>
                  </div>
                  <BubbleSkeleton height="h-72" />
                </div>
              </div>
            )}

            {showStep(6) && showRadarChart && result.radar && result.overallScore > 0 && (
               <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                   <Target className="h-5 w-5 text-primary" />
                 </div>
                 <div className="flex-1 space-y-2">
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-sm">Competency Radar</span>
                   </div>
                    <div className="rounded-2xl rounded-tl-none border border-primary/20 bg-primary/5 p-5 shadow-sm h-72 min-h-[288px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={200}>
                       <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                         <PolarGrid stroke="#888888" strokeOpacity={0.2} />
                         <PolarAngleAxis dataKey="subject" tick={{ fill: '#888888', fontSize: 11, fontWeight: 'bold' }} />
                         <Radar name="Candidate" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                       </RadarChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               </div>
            )}

            {/* Telemetry Attachment Bubble */}
            {showStep(7) && (
               <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="h-10 w-10 shrink-0 rounded-full bg-muted/50 flex items-center justify-center border border-border/50">
                   <FileCode2 className="h-5 w-5 text-muted-foreground" />
                 </div>
                 <div className="flex-1 space-y-2">
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-sm">Extracted Telemetry</span>
                   </div>
                   <div 
                     onClick={() => setShowModal(true)}
                     className="rounded-xl border border-border/50 bg-card p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-muted/30 hover:border-primary/30 transition-all group"
                   >
                     <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                       <FileText className="h-6 w-6 text-primary" />
                     </div>
                     <div className="flex-1">
                       <p className="font-bold text-sm group-hover:text-primary transition-colors">raw_source_telemetry.md</p>
                       <p className="text-xs text-muted-foreground mt-0.5">Click to view detailed extraction logs</p>
                     </div>
                   </div>
                 </div>
               </div>
            )}
            
          {/* Final Overall Score Bubble */}
            {showStep(8) && (
               <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
                 <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                   <Sparkles className="h-5 w-5 text-primary" />
                 </div>
                 <div className="flex-1 space-y-2">
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-sm">Final Evaluation</span>
                   </div>
                   <div className="rounded-2xl rounded-tl-none border border-primary/20 bg-card p-5 shadow-sm flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-primary">Analysis Complete</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">The Pilot Review agent has finalized the report.</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider hidden sm:block">Overall Score</p>
                         {animatedScore > 0 ? (
                           <ScoreBadge score={animatedScore} size="lg" />
                         ) : (
                           <span className="text-xs text-muted-foreground font-medium px-3 py-1 bg-muted/50 rounded-full">N/A</span>
                         )}
                      </div>
                   </div>
                 </div>
               </div>
            )}
            
             {/* NEW: Action Buttons */}
            {showStep(8) && (
              <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[600ms] mt-8 justify-center">
                 {isGuest || isGuestFallback ? (
                   <div className="flex flex-col items-center gap-3 text-center">
                     <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                       <Sparkles className="h-4 w-4 text-primary" />
                       Your analysis is complete! Create a free account to generate PDF reports and save your history.
                     </p>
                     <div className="flex gap-3">
                       <Button onClick={() => window.location.href = '/register?next=/dashboard/reviews'} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/25">
                         <Sparkles className="w-4 h-4" /> Create Free Account
                       </Button>
                       <Button variant="outline" onClick={() => window.location.href = '/login'} className="gap-2">
                         Log In
                       </Button>
                     </div>
                   </div>
                 ) : (
                   <>
                     <Button onClick={handleGeneratePDF} className="shadow-lg hover:scale-105 transition-transform bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <FileText className="w-4 h-4" /> Generate PDF Report
                     </Button>
                     {result.sourceBreakdown.resume && (
                       <Button onClick={handleGenerateImprovedResume} variant="outline" className="shadow-sm hover:scale-105 transition-transform gap-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="w-4 h-4" /> Generate Improved Resume
                       </Button>
                     )}
                    </>
                 )}
              </div>
            )}
        </div>
      </div>

      <ReportTemplate ref={pdfRef} result={result} mismatches={mismatches} />

      {/* Telemetry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-card w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl border border-border/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileCode2 className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Raw Source Telemetry</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-8 bg-muted/5">
              {result.sourceBreakdown.portfolio && renderSourceDetails('portfolio', 'Portfolio Details')}
              {result.sourceBreakdown.github && renderSourceDetails('github', 'GitHub Metrics')}
              {result.sourceBreakdown.resume && renderSourceDetails('resume', 'Resume Extract')}
            </div>
          </div>
        </div>
      )}

      {showResumeModal && resumeData && (
        <ImprovedResumeModal
          initialData={resumeData}
          resumeFile={resumeFile ?? null}
          onClose={() => setShowResumeModal(false)}
        />
      )}
    </div>
  )
}

function AgentProgressDropdown({ phase, steps }: { phase: string; steps: CollectingStep[] }) {
  const isDone = phase === 'finalizing'
  const hasError = steps.some(s => s.status === 'error')

  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm transition-all duration-300 ${hasError ? 'bg-red-500/5 border-red-500/20' : 'bg-card'}`}>
      <div className="flex w-full items-center gap-3 px-5 py-4 bg-muted/30 border-b border-border/50 text-left">
        <div className="shrink-0">
          {isDone ? (
             <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : hasError ? (
             <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : (
             <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${hasError ? 'text-red-500' : 'text-foreground'}`}>
             {isDone ? 'AI Review Complete' : hasError ? 'AI Agent encountered an error' : 'AI Agent thinking...'}
          </p>
        </div>
      </div>

      <div className={`px-5 pb-5 pt-4 text-sm ${hasError ? 'bg-red-500/5' : 'bg-card'}`}>
          <div className="space-y-4">
            {steps.map(step => (
              <div key={step.id} className="flex items-start gap-3">
                 <div className="mt-0.5 shrink-0">
                   {step.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : 
                    step.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> :
                    step.status === 'error' ? <XCircle className="h-4 w-4 text-red-500" /> :
                    <div className="h-4 w-4 rounded-full border-2 border-dashed border-muted-foreground/30" />}
                 </div>
                 <div className="flex flex-col">
                   <span className={step.status === 'loading' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {step.status === 'loading' ? `Executing ${step.label.toLowerCase()}...` : 
                       step.status === 'success' ? `Completed ${step.label.toLowerCase()}` :
                       step.status === 'error' ? `Failed ${step.label.toLowerCase()}` : 
                       `Waiting for ${step.label.toLowerCase()}`}
                   </span>
                   {step.status === 'success' && step.source && (
                     <span className="text-xs text-muted-foreground/70 truncate max-w-[250px]">
                       {step.source}
                     </span>
                   )}
                 </div>
              </div>
            ))}
            
            {phase === 'analyzing' && (
              <div className="flex items-start gap-3">
                 <div className="mt-0.5 shrink-0">
                   <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                 </div>
                 <span className="text-foreground font-medium">
                   {steps.length > 2 ? 'Cross-referencing data and generating AI insights...' : 'Generating AI insights from source data...'}
                 </span>
              </div>
            )}
            
            {phase === 'finalizing' && (
              <div className="flex items-start gap-3">
                 <div className="mt-0.5 shrink-0">
                   <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                 </div>
                 <span className="text-muted-foreground">Analysis successfully compiled</span>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}

function LiveCrawlerPreview({ 
  portfolioUrl, 
  githubUsername, 
  resumeFileName 
}: { 
  portfolioUrl?: string; 
  githubUsername?: string; 
  resumeFileName?: string;
}) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  
  const crawlerPhases = [
    { action: 'Spidering', label: 'site structure & links' },
    { action: 'Compiling', label: 'DOM layers & text nodes' },
    { action: 'Extracting', label: 'semantic metadata' },
    { action: 'Running', label: 'heuristic algorithms' },
    { action: 'Finalizing', label: 'Markdown distillation payload' }
  ]

  const resumePhases = [
    { action: 'Parsing', label: 'PDF structure & layout' },
    { action: 'Extracting', label: 'embedded URLs & text nodes' },
    { action: 'Cross-referencing', label: 'discovered Portfolio & GitHub profiles' },
    { action: 'Compiling', label: 'unified multi-source data points' },
    { action: 'Finalizing', label: 'Deep Resume distillation payload' }
  ]

  useEffect(() => {
    if (!portfolioUrl && !resumeFileName) return
    const interval = setInterval(() => {
      setCurrentPhaseIndex(prev => (prev + 1) % (portfolioUrl ? crawlerPhases.length : resumePhases.length))
    }, 2500)
    return () => clearInterval(interval)
  }, [portfolioUrl, resumeFileName])

  const activePhase = portfolioUrl ? crawlerPhases[currentPhaseIndex] : (resumeFileName ? resumePhases[currentPhaseIndex] : crawlerPhases[0])
  const normalizedUrl = portfolioUrl ? (portfolioUrl.startsWith('http') ? portfolioUrl : `https://${portfolioUrl}`) : ''
  const baseUrl = normalizedUrl.replace(/\/$/, '')

  return (
    <div className="w-full flex flex-col space-y-4 animate-in fade-in zoom-in duration-500 p-2">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        <span className="italic text-sm">
          {portfolioUrl ? (
            <>{activePhase.action} <span className="font-mono text-primary font-bold">{activePhase.label}</span>...</>
          ) : githubUsername ? (
            <>Cloning and analyzing GitHub repositories for <span className="font-mono text-purple-500 font-bold">{githubUsername}</span>...</>
          ) : (
            <>{activePhase.action} <span className="font-mono text-emerald-500 font-bold">{activePhase.label}</span> for <span className="font-mono text-emerald-500 font-bold">{resumeFileName}</span>...</>
          )}
        </span>
      </div>
    </div>
  )
}

export function ReviewsPageClient({ isGuest = false, reviewCount = 0, credits = 0, reviews = [], initialReviewData }: { isGuest?: boolean, reviewCount?: number, credits?: number, reviews?: ReviewHistoryItem[], initialReviewData?: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isGuestFallback, setIsGuestFallback] = useState(false)

  // Guest email gate state
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [guestEmail, setGuestEmail] = useState('')
  const [guestEmailSubmitting, setGuestEmailSubmitting] = useState(false)
  const [guestEmailVerified, setGuestEmailVerified] = useState(false)
  const [guestEmailError, setGuestEmailError] = useState<string | null>(null)

  // Pre-fill from URL params (used by landing page HeroChatInput)
  const [portfolioUrl, setPortfolioUrl] = useState(searchParams?.get('portfolio') || '')
  const [githubUsername, setGithubUsername] = useState(searchParams?.get('github') || '')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [analysisId, setAnalysisId] = useState<string>(initialReviewData?.id || '')
  const [activeIframeUrl, setActiveIframeUrl] = useState<string | null>(initialReviewData?.portfolio_url || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>(initialReviewData ? 'finalizing' : 'form')
  const [collectingSteps, setCollectingSteps] = useState<CollectingStep[]>([])
  const [results, setResults] = useState<AnalysisResults>(initialReviewData?.full_results || {})
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [isHistoryMode, setIsHistoryMode] = useState(!!initialReviewData)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  const [historyList, setHistoryList] = useState<ReviewHistoryItem[]>(reviews)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const handleHistorySelect = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('reviews')
        .select('full_results')
        .eq('id', id)
        .single()

      if (fetchError || !data?.full_results) {
        throw new Error('Failed to load review details.')
      }

      setResults(data.full_results)
      setIsHistoryMode(true)
      
      const selectedReview = historyList.find((r) => r.id === id)
      if (selectedReview?.portfolio_url) {
        setActiveIframeUrl(selectedReview.portfolio_url)
      } else {
        setActiveIframeUrl(null)
      }

      setPhase('finalizing')
    } catch (err: any) {
      toast.error(err.message || 'Error loading review.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type === 'application/pdf') {
      setResumeFile(file)
      setError(null)
    } else if (file) {
      setError('Please upload a valid PDF file for your resume/CV.')
    }
  }

  const toggleDetail = (id: string) => {
    setShowDetails((prev) => ({ ...prev, [id]: !prev[id] }))
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

    let cleanPortfolio = portfolioUrl.trim()
    if (cleanPortfolio) {
      if (!/^https?:\/\//i.test(cleanPortfolio)) {
        cleanPortfolio = 'https://' + cleanPortfolio
      }
      try {
        new URL(cleanPortfolio)
        setActiveIframeUrl(cleanPortfolio)
      } catch {
        setError('Please enter a valid Portfolio URL (e.g. https://your-portfolio.com)')
        setIsLoading(false)
        return
      }
    } else {
      setActiveIframeUrl(null)
    }

    const cleanGithub = githubUsername ? normalizeGitHubUsername(githubUsername) : ''
    if (cleanGithub) {
      // GitHub usernames may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen. Max 39 chars.
      if (!/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/i.test(cleanGithub)) {
        toast.error('Invalid GitHub username')
        setError('Please enter a valid GitHub username')
        setIsLoading(false)
        return
      }
    }

    const sources: { id: 'portfolio' | 'github' | 'resume'; label: string; source: string }[] = []
    if (cleanPortfolio)
      sources.push({ id: 'portfolio', label: 'Portfolio', source: cleanPortfolio })
    if (cleanGithub) sources.push({ id: 'github', label: 'GitHub Profile', source: cleanGithub })
    if (resumeFile) sources.push({ id: 'resume', label: 'Resume', source: resumeFile.name })

    if (sources.length === 0) {
      toast.error('Missing sources')
      setError('Provide at least one source (portfolio URL, GitHub username, or resume)')
      setIsLoading(false)
      return
    }

    let totalCost = 0
    if (cleanPortfolio) totalCost += getAnalysisCost('portfolio')
    if (cleanGithub) totalCost += getAnalysisCost('github')
    if (resumeFile) totalCost += getAnalysisCost('resume')
    if (totalCost > 0) totalCost += 1
    
    if (credits < totalCost) {
      toast.error('Insufficient Credits')
      setError(isGuest 
        ? `Oops! You're out of credits. To proceed, please sign up to get more. Credits left: ${credits}, Needed: ${totalCost}`
        : `Oops! You're out of credits. To proceed, please top up your credits. Credits left: ${credits}, Needed: ${totalCost}`
      )
      setIsLoading(false)
      return
    }

    if (isGuest) {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        const { data, error: authError } = await supabase.auth.signInAnonymously()
        if (authError) {
          toast.warning('Guest sessions unavailable. PDF generation disabled.', { duration: 6000 })
          setIsGuestFallback(true)
          // DO NOT return. Proceed with analysis in fallback mode.
        }
        // Database trigger handle_new_user automatically assigns initial credits
      }
    }

    toast.success('Initiating Pilot Review...')

    // ── Phase 1: Collect sources sequentially ──
    setPhase('collecting')
    
    // Build initial dynamic steps
    const initialSteps: CollectingStep[] = []
    
    // Only resumes get malware scanned
    if (resumeFile) {
      initialSteps.push({ id: 'resume-scan', label: 'Security & Malware Scan', source: 'System Sandbox', status: 'pending' })
    }
    
    // Fetch steps
    sources.forEach(s => {
      let fetchLabel = `Fetching ${s.label}`
      if (s.id === 'portfolio') fetchLabel = 'Scraping Portfolio Web Content'
      if (s.id === 'github') fetchLabel = 'Fetching GitHub API Telemetry'
      if (s.id === 'resume') fetchLabel = 'Extracting PDF Contents'
      
      initialSteps.push({ id: s.id, label: fetchLabel, source: s.source, status: 'pending' })
    })

    // Only resumes need heavy semantic extraction
    if (resumeFile) {
      initialSteps.push({ id: 'resume-parse', label: 'Semantic Token Extraction', source: 'Pilot Pipeline', status: 'pending' })
    }
    
    const synthesizeLabel = sources.length > 1 ? 'Synthesizing Cross-Source AI Summary' : 'Synthesizing AI Analysis'
    initialSteps.push({ id: 'synthesize', label: synthesizeLabel, source: 'Pilot Agent', status: 'pending' })
    
    setCollectingSteps(initialSteps)

    const collected: AnalysisResults = {}
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

    // Run Malware Scan if needed
    if (resumeFile) {
      setCollectingSteps(prev => prev.map(s => s.id === 'resume-scan' ? { ...s, status: 'loading' } : s))
      await delay(1500)
      setCollectingSteps(prev => prev.map(s => s.id === 'resume-scan' ? { ...s, status: 'success' } : s))
      await delay(400)
    }

    let serverError: string | null = null

    for (const source of sources) {
      setCollectingSteps((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, status: 'loading' } : s))
      )
      await delay(800) // added delay for realistic load time

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
            if (!serverError) serverError = `No verifiable data found for ${source.id}`
          }
        } else {
          setCollectingSteps((prev) =>
            prev.map((s) => (s.id === source.id ? { ...s, status: 'error' } : s))
          )
          if (!serverError && res.message) {
            serverError = res.message
          }
        }
      } catch (err: any) {
        setCollectingSteps((prev) =>
          prev.map((s) => (s.id === source.id ? { ...s, status: 'error' } : s))
        )
        if (!serverError) serverError = err.message || `Failed to connect to ${source.id} service`
      }

      await delay(600)
    }

    setResults({ ...collected })

    const hasAnyData = Object.values(collected).some(Boolean)
    if (!hasAnyData) {
      setError(serverError || 'All provided sources failed. Check each source and try again.')
      setIsLoading(false)
      return
    }

    if (resumeFile) {
      setCollectingSteps(prev => prev.map(s => s.id === 'resume-parse' ? { ...s, status: 'loading' } : s))
      await delay(1800)
      setCollectingSteps(prev => prev.map(s => s.id === 'resume-parse' ? { ...s, status: 'success' } : s))
      await delay(500)
    }

    // ── Phase 2: AI Analysis ──
    setPhase('analyzing')
    setCollectingSteps(prev => prev.map(s => s.id === 'synthesize' ? { ...s, status: 'loading' } : s))

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
        setCollectingSteps(prev => prev.map(s => s.id === 'synthesize' ? { ...s, status: 'success' } : s))
      } else {
        const message = typeof aiRes.message === 'string' ? aiRes.message : ''
        const fallbackReason = message.toLowerCase().includes('insufficient')
          ? 'AI synthesis could not run because there are not enough credits for the final summary. Showing typed source-level results instead.'
          : 'AI synthesis could not complete. Showing typed source-level results instead.'
        collected.aiSummary = buildFallbackSummary(collected, fallbackReason)
        collected.mismatches = []
        setResults({ ...collected })
        setCollectingSteps(prev => prev.map(s => s.id === 'synthesize' ? { ...s, status: 'success' } : s))
        if (message) toast.error(message)
      }
    } catch {
      collected.aiSummary = buildFallbackSummary(
        collected,
        'AI synthesis could not be reached. Showing typed source-level results instead.'
      )
      collected.mismatches = []
      setResults({ ...collected })
      setCollectingSteps(prev => prev.map(s => s.id === 'synthesize' ? { ...s, status: 'success' } : s))
      // AI summary failed — results still shown without AI
    }

    // ── Phase 3: Finalizing (save + show results) ──
    setPhase('finalizing')
    setAnalysisId(Date.now().toString())

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
        toast.success('Analysis securely stored to history')
        if (createJson.data) {
          setHistoryList(prev => [createJson.data, ...prev])
          window.history.replaceState(null, '', `/dashboard/reviews/${createJson.data.id}`)
        }
      } else {
        toast.error('Failed to store analysis in history')
      }
    } catch {
      toast.error('Network error while saving analysis')
    }

    setIsLoading(false)

    // Show email gate for guests after analysis
    if (isGuest || isGuestFallback) {
      setTimeout(() => setShowEmailGate(true), 2000)
    }
  }

  const handleGuestEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuestEmailError(null)
    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      setGuestEmailError('Please enter a valid email address.')
      return
    }
    setGuestEmailSubmitting(true)
    try {
      const res = await fetch('/api/guest/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: guestEmail }),
      })
      const json = await res.json()
      if (!res.ok) {
        setGuestEmailError(json.error || 'Failed to verify email.')
        return
      }
      setGuestEmailVerified(true)
      setShowEmailGate(false)
      toast.success('Results saved to your email! Create a free account to access them anytime.')
    } catch {
      setGuestEmailError('Network error. Please try again.')
    } finally {
      setGuestEmailSubmitting(false)
    }
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
      <div className="space-y-8 p-2">
        {/* Top Level Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card to-muted/10 p-5 text-center shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <p className="text-3xl font-extrabold text-foreground mb-1 group-hover:scale-105 transition-transform">{details.wordCount}</p>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Words</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card to-muted/10 p-5 text-center shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <p className="text-3xl font-extrabold text-foreground mb-1 group-hover:scale-105 transition-transform">{details.skills.filter((s) => s.found).length}</p>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Skills</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-card to-muted/10 p-5 text-center shadow-sm relative overflow-hidden group hover:border-purple-500/30 transition-colors">
            <p className="text-3xl font-extrabold text-foreground mb-1 group-hover:scale-105 transition-transform">{details.workEntries.length}</p>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Positions</p>
          </div>
        </div>

        {/* Identity & Health Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-muted/20 border border-border/50 p-4">
          {details.name && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-background border shadow-sm">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span className="text-base font-bold tracking-tight">{details.name}</span>
              {details.isAIAnalyzed && (
                <Badge variant="success" className="text-[10px] ml-1 bg-green-500/10 text-green-600 border-green-500/20">
                  <Sparkles className="h-3 w-3 mr-1" /> AI Processed
                </Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant={details.hasEmail ? 'success' : 'outline'} className={`text-xs px-2.5 py-1 ${details.hasEmail ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}`}>
              {details.hasEmail ? '✓' : '✗'} Email
            </Badge>
            <Badge variant={details.hasLinkedIn ? 'success' : 'outline'} className={`text-xs px-2.5 py-1 ${details.hasLinkedIn ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}`}>
              {details.hasLinkedIn ? '✓' : '✗'} LinkedIn
            </Badge>
            <Badge variant={details.hasGithub ? 'success' : 'outline'} className={`text-xs px-2.5 py-1 ${details.hasGithub ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}`}>
              {details.hasGithub ? '✓' : '✗'} GitHub
            </Badge>
            <Badge variant={details.hasMetrics ? 'success' : 'outline'} className={`text-xs px-2.5 py-1 ${details.hasMetrics ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}`}>
              {details.hasMetrics ? '✓' : '✗'} Metrics
            </Badge>
            <Badge variant={details.hasActionVerbs ? 'success' : 'outline'} className={`text-xs px-2.5 py-1 ${details.hasActionVerbs ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}`}>
              {details.hasActionVerbs ? '✓' : '✗'} Action Verbs
            </Badge>
          </div>
        </div>

        {/* Skills & Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/50"></span>
              Detected Skills
            </h4>
            <div className="flex flex-wrap gap-1.5 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
              {details.skills.slice(0, 15).map((s) => (
                <Badge key={s.name} variant={s.found ? 'default' : 'outline'} className={`text-xs px-2.5 py-0.5 ${s.found ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'opacity-50'}`}>
                  {s.name}
                </Badge>
              ))}
              {details.skills.filter((s) => !s.found).length > 3 && (
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-dashed">
                  +{details.skills.filter((s) => !s.found).length} missing
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/50"></span>
              Detected Sections
            </h4>
            <div className="flex flex-wrap gap-1.5 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
              {details.sections.map((s) => (
                <Badge key={s.name} variant={s.found ? 'default' : 'outline'} className={`text-[10px] uppercase tracking-wider px-2 py-1 ${s.found ? 'bg-slate-800 text-slate-100' : 'opacity-50'}`}>
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Work Experience */}
        {(details.workEntries ?? []).length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/50"></span>
              Work Experience Timeline
            </h4>
            <div className="space-y-4 border-l-2 border-muted/50 ml-2 pl-6 relative">
              {details.workEntries.map((entry, i) => {
                if (typeof entry === 'string') {
                  return (
                    <div key={i} className="relative">
                      <div className="absolute -left-[31px] top-2 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground" />
                      <p className="text-sm text-foreground/80 leading-relaxed bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                        {entry}
                      </p>
                    </div>
                  )
                }
                const obj = entry as ResumeWorkEntry
                return (
                  <div key={i} className="relative group">
                    <div className="absolute -left-[31px] top-5 h-3 w-3 rounded-full border-2 border-background bg-primary/40 group-hover:bg-primary transition-colors duration-300 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    <div className="bg-card hover:bg-muted/10 p-5 rounded-2xl border border-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
                        {obj.role && <span className="font-bold text-base text-foreground tracking-tight">{obj.role}</span>}
                        {obj.company && obj.company !== 'null' && (
                          <span className="text-muted-foreground text-sm font-medium">at <span className="text-foreground/90">{obj.company}</span></span>
                        )}
                        {obj.dates && obj.dates !== 'null' && (
                          <span className="text-xs text-muted-foreground font-semibold sm:ml-auto bg-muted/50 px-2 py-1 rounded-md border border-border/50">— {obj.dates}</span>
                        )}
                      </div>
                      {obj.description && (
                        <p className="text-sm text-muted-foreground/90 leading-relaxed font-medium mt-3">{obj.description}</p>
                      )}
                    </div>
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

    return (
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm mb-6">
        <div className="flex w-full items-center gap-4 px-6 py-4 text-left border-b border-border/50 bg-muted/5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {id === 'portfolio' && <Globe className="h-5 w-5 shrink-0" />}
            {id === 'github' && <GitBranch className="h-5 w-5 shrink-0" />}
            {id === 'resume' && <FileText className="h-5 w-5 shrink-0" />}
          </div>
          <span className="text-lg font-bold tracking-tight">{label}</span>
        </div>
        <div className="px-6 py-6 bg-gradient-to-b from-muted/5 to-transparent">
          {id === 'portfolio' && <PortfolioDetails analysis={d as PortfolioAnalysis} />}
          {id === 'github' && <GitHubDetails analysis={d as GitHubAnalysis} />}
          {id === 'resume' && <ResumeDetailView analysis={d as ResumeAnalysis} />}
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────
  return (
    <div className="w-full flex h-[calc(100vh-64px)] overflow-hidden relative bg-background">
      
      {/* The Desktop History Sidebar has been removed in favor of the ChatGPT-style top-left dropdown */}
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden w-full">
        
        {/* ChatGPT-style History Dropdown Button (Always visible) */}
        <div className="absolute top-4 left-4 z-[60]">
          <Button 
            variant="ghost" 
            className="font-bold gap-2 text-xl bg-transparent hover:bg-muted/30 border-transparent text-foreground rounded-2xl px-4 py-2.5 h-auto transition-all" 
            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
          >
            PortfolioPilot
            {historyList.length > 0 && (
              <span className="text-muted-foreground text-base font-medium opacity-60">v{historyList.length}</span>
            )}
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showHistoryDropdown ? 'rotate-180' : ''}`} />
          </Button>
          
          {/* Dropdown Menu */}
          {showHistoryDropdown && (
               <div className="absolute top-full mt-2 left-0 w-[320px] bg-card/80 backdrop-blur-3xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-3xl max-h-[60vh] overflow-y-auto p-3 animate-in fade-in zoom-in-95 slide-in-from-top-2 z-50 origin-top-left">
                 <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-3 pt-2">Recent Scans</h3>
                 <div className="space-y-1">
                   {historyList.length === 0 ? (
                     <div className="px-3 py-6 text-sm text-muted-foreground text-center italic">No history found.</div>
                   ) : (
                     historyList.map(r => (
                        <button 
                          key={r.id} 
                          onClick={() => { setShowHistoryDropdown(false); router.push(`/dashboard/reviews/${r.id}`) }} 
                          className={`w-full text-left px-3 py-3 rounded-xl transition-colors flex flex-col gap-1 group ${analysisId === r.id ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary text-foreground'}`}
                        >
                           <div className="flex items-center justify-between w-full">
                             <span className={`text-sm font-semibold truncate pr-2 ${analysisId !== r.id && 'group-hover:text-primary'}`}>{r.detected_name || (r.portfolio_url ? r.portfolio_url.replace(/^https?:\/\//, '') : 'Unnamed Scan')}</span>
                             {r.overall_score !== null && <ScoreBadge score={r.overall_score} size="sm" />}
                           </div>
                           <span className="text-[10px] opacity-70 truncate w-full">
                             {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                           </span>
                        </button>
                     ))
                   )}
                 </div>
               </div>
             )}
           </div>
      <div className={`flex flex-col lg:flex-row flex-1 w-full h-full gap-8 lg:gap-12`}>
        {/* Left Side: Form, Progress Status, or Streaming Results */}
        <div className={`w-full h-full transition-all duration-700 flex flex-col justify-start relative`}>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full flex flex-col justify-start">
                  <NeuralChatLanding 
                       portfolioUrl={portfolioUrl}
                       setPortfolioUrl={setPortfolioUrl}
                       githubUsername={githubUsername}
                       setGithubUsername={setGithubUsername}
                       resumeFile={resumeFile}
                       setResumeFile={setResumeFile}
                       onSubmit={handleSubmit}
                       isLoading={isLoading}
                       credits={credits}
                       analysisId={analysisId}
                       isScanning={phase === 'collecting' || phase === 'analyzing'}
                       collectingNode={
                         phase === 'collecting' || phase === 'analyzing' ? (
                           <div className="w-full max-w-xl space-y-3">
                             <div className="rounded-2xl border border-border/50 bg-card p-2 shadow-sm">
                               <LiveCrawlerPreview 
                                 portfolioUrl={portfolioUrl} 
                                 githubUsername={githubUsername} 
                                 resumeFileName={resumeFile?.name} 
                               />
                             </div>
                             <AgentProgressDropdown phase={phase} steps={collectingSteps} />
                           </div>
                         ) : null
                       }
                       errorNode={
                         error ? (
                           <div className="flex flex-col items-center justify-center p-6 mt-4 rounded-[1.5rem] border-2 border-red-500/20 bg-red-500/5 text-center relative overflow-hidden w-full max-w-xl">
                             <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                             <h3 className="text-lg font-extrabold text-red-600 mb-1">{error?.includes('Oops!') ? 'Out of Credits' : 'Analysis Terminated'}</h3>
                             <p className="text-sm text-red-500/80 mb-4">{error}</p>
                             <Button onClick={() => setPhase('form')} size="sm" variant="outline" className="border-red-500/30 text-red-600 hover:bg-red-500/10">
                               Re-initialize Scan
                             </Button>
                           </div>
                         ) : null
                       }
                       resultNode={
                         phase === 'finalizing' && results.aiSummary ? (
                             <StreamingChatBox 
                               result={results.aiSummary} 
                               mismatches={results.mismatches}
                               isGuest={isGuest}
                               isHistory={isHistoryMode}
                               renderSourceDetails={renderSourceDetails}
                               portfolioAnalysis={results.portfolio}
                               githubAnalysis={results.github}
                               resumeAnalysis={results.resume}
                               portfolioUrl={portfolioUrl}
                               githubUsername={githubUsername}
                               resumeFile={resumeFile}
                               isGuestFallback={isGuestFallback}
                               onReset={() => {
                                 setPhase('form')
                                 setResults({})
                                 setCollectingSteps([])
                                 setIsHistoryMode(false)
                               }} 
                             />
                         ) : null
                       }
                     />
                    </div>
              </div>
              
              {/* Right Side: 3D Visual (Removed) */}
              <div className="hidden">
                
                {/* Desktop Iframe/Screenshot Preview */}
                {activeIframeUrl && phase !== 'form' ? (
                  <div className="absolute inset-0 z-0 bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center p-8">
                     {/* Overlay to prevent clicking iframe during animation */}
                     <div className="absolute inset-0 z-10 bg-transparent" />
                     <div className="relative w-full h-full flex items-center justify-center">
                       {credits > 0 ? (
                         <div className="w-[1280px] h-[800px] origin-center scale-[0.35] sm:scale-[0.4] md:scale-[0.45] lg:scale-[0.5] xl:scale-[0.6] 2xl:scale-[0.7] transition-transform duration-500 rounded-2xl overflow-hidden border border-border/50 shadow-2xl bg-background">
                           <img 
                             src={`https://api.microlink.io?url=${encodeURIComponent(activeIframeUrl)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1280&viewport.height=800`}
                             alt="Portfolio Preview Screenshot"
                             className="w-full h-full object-cover opacity-90"
                             loading="eager"
                           />
                         </div>
                       ) : (
                         <div className="w-[1280px] h-[800px] origin-center scale-[0.35] sm:scale-[0.4] md:scale-[0.45] lg:scale-[0.5] xl:scale-[0.6] 2xl:scale-[0.7] transition-transform duration-500 rounded-2xl overflow-hidden border border-border/50 shadow-2xl bg-background">
                           <iframe 
                             src={activeIframeUrl} 
                             className="w-full h-full border-none opacity-90"
                             title="Portfolio Preview"
                             scrolling="no"
                             sandbox="allow-same-origin allow-scripts"
                           />
                         </div>
                       )}
                     </div>
                  </div>
                ) : (
                  <>
                    {/* Glowing background meshes */}
                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2)_0%,transparent_70%)] transition-all duration-700 ${phase !== 'form' && phase !== 'finalizing' ? 'animate-[pulse_2s_ease-in-out_infinite]' : 'animate-[pulse_4s_ease-in-out_infinite]'}`} />
                    <div className={`absolute top-1/4 left-1/4 w-full h-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0%,transparent_50%)] transition-all duration-700 ${phase !== 'form' && phase !== 'finalizing' ? 'animate-[pulse_3s_ease-in-out_infinite_reverse]' : 'animate-[pulse_6s_ease-in-out_infinite_reverse]'}`} />
                  </>
                )}
                
                {/* Grid Lines Overlay */}
                <div className={`absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] transition-opacity duration-1000 ${activeIframeUrl && phase !== 'form' ? 'opacity-30 [mask-image:linear-gradient(to_top,black_10%,transparent_50%)]' : '[mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]'}`} />
                
                {/* 3D Floating Asset */}
                <div className={`z-20 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  activeIframeUrl && phase !== 'form'
                    ? 'absolute bottom-28 right-8 w-[140px] h-[140px] opacity-100 drop-shadow-2xl'
                    : `relative w-full max-w-[320px] aspect-square ${phase !== 'form' ? 'scale-110' : 'group-hover:scale-105'}`
                }`}>
                   <div className={`absolute inset-0 bg-blue-500/20 dark:bg-blue-500/10 blur-[60px] rounded-full mix-blend-multiply dark:mix-blend-overlay ${phase !== 'form' && phase !== 'finalizing' ? 'animate-[pulse_2s_ease-in-out_infinite]' : 'animate-pulse'}`} />
                   <img 
                     src="/ai-review-bot.png" 
                     alt="AI Analysis Core" 
                     className={`w-full h-full object-contain ${
                       activeIframeUrl && phase !== 'form'
                         ? 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]'
                         : 'drop-shadow-[0_20px_30px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]'
                     } ${phase !== 'form' && phase !== 'finalizing' ? 'animate-[float_2s_ease-in-out_infinite]' : 'animate-float'}`}
                   />
                </div>
                
                {/* Status Overlay UI */}
                <div className={`absolute bottom-8 left-8 right-8 z-20 rounded-2xl bg-white/80 dark:bg-black/40 border border-black/5 dark:border-white/10 backdrop-blur-xl p-4 shadow-xl dark:shadow-2xl transform transition-all duration-500 ${phase !== 'form' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${error ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'} dark:${error ? 'shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'shadow-[0_0_10px_rgba(34,197,94,0.8)]'} ${phase !== 'form' && !error && phase !== 'finalizing' ? 'animate-ping' : 'animate-pulse'}`} />
                    <p className={`text-sm font-medium ${error ? 'text-red-500' : 'text-slate-800 dark:text-white/90'}`}>
                      {error ? (error.includes('Oops!') ? 'Insufficient Credits' : 'Analysis Terminated') : phase === 'finalizing' ? 'Analysis Complete' : phase === 'form' ? 'Pilot Agent Standing By' : 'Processing Telemetry...'}
                    </p>
                  </div>
                </div>
              </div>
          </div>


      {/* Email Gate Modal - shows after guest analysis completes */}
      {showEmailGate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border/60 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 fade-in duration-300">
            {/* Dismiss button */}
            <button
              onClick={() => setShowEmailGate(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-5 border border-primary/20">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight mb-2">Save Your Results</h2>
              <p className="text-sm text-muted-foreground">
                Enter your email to save this analysis and get notified about improvements. We&apos;ll never spam you.
              </p>
            </div>

            <form onSubmit={handleGuestEmailSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="h-12 text-base"
                required
                autoFocus
              />

              {guestEmailError && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {guestEmailError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-[0_0_20px_-5px_rgba(var(--primary),0.5)] bg-primary hover:bg-primary/90"
                disabled={guestEmailSubmitting}
              >
                {guestEmailSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save My Results'
                )}
              </Button>

              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.location.href = '/register?next=/dashboard/reviews'}
              >
                <Sparkles className="w-4 h-4" /> Create Free Account
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Free accounts get <strong>unlimited scans</strong>, PDF exports, and review history.
            </p>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}
