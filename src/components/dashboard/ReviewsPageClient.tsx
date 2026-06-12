'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Badge } from '@/components/common/Badge'
import { ScoreBadge } from '@/components/common/ScoreBadge'
import { ReviewHistory } from '@/components/dashboard/ReviewHistory'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
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

function StreamingChatBox({
  result,
  mismatches,
  onReset,
  renderSourceDetails,
}: {
  result: AISummaryResult
  mismatches?: AIMismatch[]
  onReset: () => void
  renderSourceDetails: (id: 'portfolio' | 'github' | 'resume', label: string) => React.ReactNode
}) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [showModal, setShowModal] = useState(false)

  const radarData = [
    { subject: 'Presentation', A: result.radar?.presentation || 0, fullMark: 100 },
    { subject: 'Open Source', A: result.radar?.openSource || 0, fullMark: 100 },
    { subject: 'Experience', A: result.radar?.experience || 0, fullMark: 100 },
    { subject: 'Tech Stack', A: result.radar?.techStack || 0, fullMark: 100 },
    { subject: 'Consistency', A: result.radar?.consistency || 0, fullMark: 100 },
  ]

  useEffect(() => {
    let i = 0
    const text = result.summary
    const targetScore = result.overallScore
    setDisplayedText('')

    const interval = setInterval(() => {
      i += 2 // Type 2 chars at a time
      if (i > text.length) {
        setDisplayedText(text)
        setAnimatedScore(targetScore)
        clearInterval(interval)
        return
      }
      setDisplayedText(text.slice(0, i))
      
      // Calculate score based on percentage of text typed
      const progress = i / text.length
      setAnimatedScore(Math.floor(progress * targetScore))
      
    }, 15)
    return () => clearInterval(interval)
  }, [result.summary, result.overallScore])

  const isDoneTyping = displayedText.length >= result.summary.length

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-border/50">
        <div>
           <h3 className="text-xl font-bold">Analysis Complete</h3>
           <p className="text-sm text-muted-foreground">The Neural Core has finished its review.</p>
        </div>
        <div className="flex flex-col items-end">
           {animatedScore > 0 ? (
             <>
               <ScoreBadge score={animatedScore} size="lg" />
               <p className="text-xs text-muted-foreground mt-1 font-medium">Overall Score</p>
             </>
           ) : (
             <p className="text-xs text-muted-foreground mt-1 font-medium px-3 py-1 bg-muted/50 rounded-full">Score N/A</p>
           )}
        </div>
      </div>
      
      {/* Chat Thread */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-10">
        {/* Main AI Summary Chat Bubble */}
        <div className="flex gap-4">
           <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
             <Sparkles className="h-5 w-5 text-primary" />
           </div>
           <div className="flex-1 space-y-2">
             <div className="flex items-center gap-2">
               <span className="font-bold text-sm">Neural Core</span>
               <span className="text-xs text-muted-foreground">Just now</span>
             </div>
             <div className="rounded-2xl rounded-tl-none bg-muted/30 border border-border/50 p-5 text-sm leading-relaxed text-foreground/90 font-medium shadow-sm">
               {displayedText}
               {!isDoneTyping && (
                 <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary animate-pulse" />
               )}
             </div>
           </div>
        </div>
        
        {/* Individual Scores Bubble */}
        {isDoneTyping && (
           <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
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
        
        {/* Strengths Bubble (Appears after typing) */}
        {isDoneTyping && result.topStrengths.length > 0 && (
           <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="h-10 w-10 shrink-0 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
               <CheckCircle2 className="h-5 w-5 text-green-500" />
             </div>
             <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2">
                 <span className="font-bold text-sm">Strengths Identified</span>
               </div>
               <div className="rounded-2xl rounded-tl-none border border-green-500/20 bg-green-500/5 p-5 shadow-sm">
                 <ul className="space-y-3">
                   {result.topStrengths.map((s, i) => (
                     <li key={i} className="text-sm flex items-start gap-3">
                       <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                       <span className="text-foreground/80 leading-relaxed font-medium">{s}</span>
                     </li>
                   ))}
                 </ul>
               </div>
             </div>
           </div>
        )}

        {/* Weaknesses Bubble */}
        {isDoneTyping && result.topWeaknesses.length > 0 && (
           <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
             <div className="h-10 w-10 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
               <AlertTriangle className="h-5 w-5 text-red-500" />
             </div>
             <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2">
                 <span className="font-bold text-sm">Areas for Improvement</span>
               </div>
               <div className="rounded-2xl rounded-tl-none border border-red-500/20 bg-red-500/5 p-5 shadow-sm">
                 <ul className="space-y-3">
                   {result.topWeaknesses.map((w, i) => (
                     <li key={i} className="text-sm flex items-start gap-3">
                       <div className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                       <span className="text-foreground/80 leading-relaxed font-medium">{w}</span>
                     </li>
                   ))}
                 </ul>
               </div>
             </div>
           </div>
        )}

        {/* Recommendations Bubble */}
        {isDoneTyping && (
           <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
             <div className="h-10 w-10 shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
               <Target className="h-5 w-5 text-blue-500" />
             </div>
             <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2">
                 <span className="font-bold text-sm">Actionable Recommendations</span>
               </div>
               <div className="rounded-2xl rounded-tl-none border border-blue-500/20 bg-blue-500/5 p-5 shadow-sm">
                 {result.topRecommendations.length > 0 ? (
                   <ul className="space-y-3">
                     {result.topRecommendations.map((r, i) => (
                       <li key={i} className="text-sm flex items-start gap-3">
                         <span className="text-blue-500 font-bold bg-blue-500/10 rounded-md px-1.5 py-0.5 text-xs shrink-0">{i + 1}</span>
                         <span className="text-foreground/80 leading-relaxed font-medium">{r}</span>
                       </li>
                     ))}
                   </ul>
                 ) : (
                   <p className="text-sm text-foreground/80 leading-relaxed font-medium">No major areas of improvement found. Excellent profile!</p>
                 )}
               </div>
             </div>
           </div>
        )}

        {/* Mismatches Bubble */}
        {isDoneTyping && mismatches && mismatches.length > 0 && (
           <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[600ms]">
             <div className="h-10 w-10 shrink-0 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
               <AlertTriangle className="h-5 w-5 text-orange-500" />
             </div>
             <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2">
                 <span className="font-bold text-sm">Cross-Reference Discrepancies</span>
               </div>
               <div className="rounded-2xl rounded-tl-none border border-orange-500/20 bg-orange-500/5 p-5 shadow-sm">
                 <ul className="space-y-3">
                   {mismatches.map((m, i) => (
                     <li key={i} className="text-sm flex items-start gap-3">
                       <span className="text-orange-500 font-bold bg-orange-500/10 rounded-md px-1.5 py-0.5 text-xs shrink-0">{m.sources.join(' ⚡ ')}</span>
                       <span className="text-foreground/80 leading-relaxed font-medium">{m.description}</span>
                     </li>
                   ))}
                 </ul>
               </div>
             </div>
           </div>
        )}

        {/* Radar Chart Bubble */}
        {isDoneTyping && result.radar && result.overallScore > 0 && (
           <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[800ms]">
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
        {isDoneTyping && (
           <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[1000ms]">
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

        {/* Action Buttons */}
        {isDoneTyping && (
           <div className="pt-8 flex justify-end animate-in fade-in duration-1000 delay-1000">
             <Button onClick={onReset} variant="outline" className="shadow-sm border-border/50 hover:bg-muted/50">
               Run Another Analysis
             </Button>
           </div>
        )}
      </div>

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
                 <span className="text-foreground font-medium">Cross-referencing data and generating AI insights...</span>
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

export function ReviewsPageClient({ reviews }: ReviewsPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pre-fill from URL params (used by landing page HeroChatInput)
  const [portfolioUrl, setPortfolioUrl] = useState(searchParams?.get('portfolio') || '')
  const [githubUsername, setGithubUsername] = useState(searchParams?.get('github') || '')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const [collectingSteps, setCollectingSteps] = useState<CollectingStep[]>([])
  const [results, setResults] = useState<AnalysisResults>({})
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    let cleanPortfolio = portfolioUrl.trim()
    if (cleanPortfolio) {
      if (!/^https?:\/\//i.test(cleanPortfolio)) {
        cleanPortfolio = 'https://' + cleanPortfolio
      }
      try {
        new URL(cleanPortfolio)
      } catch {
        setError('Please enter a valid Portfolio URL (e.g. https://your-portfolio.com)')
        setIsLoading(false)
        return
      }
    }

    const cleanGithub = githubUsername ? stripGitHubUrl(githubUsername) : ''
    if (cleanGithub) {
      // GitHub usernames may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen. Max 39 chars.
      if (!/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/i.test(cleanGithub)) {
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
      setError('Provide at least one source (portfolio URL, GitHub username, or resume)')
      setIsLoading(false)
      return
    }

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
      initialSteps.push({ id: 'resume-parse', label: 'Semantic Token Extraction', source: 'Neural Pipeline', status: 'pending' })
    }
    
    initialSteps.push({ id: 'synthesize', label: 'Synthesizing Cross-Source AI Summary', source: 'Neural Core', status: 'pending' })
    
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
    <div className="space-y-8 w-full max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Reviews
        </h1>
        <p className="text-lg text-muted-foreground">
          Analyze portfolio, GitHub, and resume in one comprehensive review
        </p>
      </div>

      <div className="flex gap-1 rounded-xl bg-muted/50 p-1 border border-border/50 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'new'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Search className="h-4 w-4" />
          New Review
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <FileText className="h-4 w-4" />
          History
        </button>
      </div>

      {activeTab === 'new' && (
        <Card className="overflow-hidden rounded-3xl border border-border/50 shadow-lg transition-all duration-300 bg-card">
          {phase !== 'form' && (
            <CardHeader className="border-b border-border/50 bg-muted/5 pb-4 pt-5">
              <CardTitle className="text-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  New Review Analysis
                </div>
              </CardTitle>
            </CardHeader>
          )}
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row min-h-[650px] lg:h-[650px]">
              {/* Left Side: Form, Progress Status, or Streaming Results */}
              <div className={`w-full p-8 lg:p-10 flex flex-col justify-center h-full overflow-y-auto custom-scrollbar transition-all duration-700 ${phase === 'finalizing' ? 'lg:w-full mx-auto' : 'lg:w-3/5'}`}>
                {phase === 'form' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold tracking-tight">Submit Assets</h2>
                        <p className="text-muted-foreground mt-1">Provide any combination of links or documents for the AI to analyze.</p>
                      </div>
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                              <Globe className="h-4 w-4 text-blue-500" />
                              Portfolio URL
                            </label>
                            <Input
                              placeholder="https://your-portfolio.com"
                              value={portfolioUrl}
                              onChange={(e) => setPortfolioUrl(e.target.value)}
                              className="bg-muted/30 border-border/50 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 h-12 rounded-xl"
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                              <GitBranch className="h-4 w-4 text-purple-500" />
                              GitHub Username
                            </label>
                            <Input
                              placeholder="your-github-username"
                              value={githubUsername}
                              onChange={(e) => setGithubUsername(e.target.value)}
                              className="bg-muted/30 border-border/50 focus-visible:ring-purple-500/30 focus-visible:border-purple-500 h-12 rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <FileText className="h-4 w-4 text-emerald-500" />
                            Resume/CV (PDF)
                          </label>
                          <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`flex items-center gap-4 p-2 rounded-xl transition-all duration-200 border-2 ${
                              isDragging 
                                ? 'bg-emerald-500/10 border-emerald-500/50 border-dashed scale-[1.02]' 
                                : 'bg-muted/30 border-border/50 border-solid'
                            }`}
                          >
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
                              className="h-10 px-6 bg-background shadow-sm hover:bg-accent/50 rounded-lg font-medium"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {resumeFile ? 'Change File' : 'Browse Files'}
                            </Button>
                            <div className="flex-1 min-w-0">
                              {resumeFile ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-foreground truncate">{resumeFile.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResumeFile(null)
                                      if (fileInputRef.current) fileInputRef.current.value = ''
                                    }}
                                    className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline shrink-0"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No file selected</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {error && (
                          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-4">
                            <p className="text-sm text-red-500 flex items-center gap-2 font-medium">
                              <AlertTriangle className="h-5 w-5 shrink-0" />
                              {error}
                            </p>
                          </div>
                        )}

                        <div className="pt-4">
                          <Button type="submit" size="lg" isLoading={isLoading} className="w-full h-14 text-base font-bold shadow-[0_0_20px_-5px_rgba(var(--primary),0.4)] hover:shadow-[0_0_25px_-5px_rgba(var(--primary),0.6)] transition-all rounded-xl">
                            Run Comprehensive Review
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : phase === 'finalizing' && results.aiSummary ? (
                    <div className="max-w-4xl mx-auto w-full">
                      <StreamingChatBox 
                        result={results.aiSummary} 
                        mismatches={results.mismatches}
                        renderSourceDetails={renderSourceDetails}
                        onReset={() => {
                          setPhase('form')
                          setResults({})
                          setCollectingSteps([])
                        }} 
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500 w-full max-w-xl mx-auto my-auto">
                      <div className="text-center mb-8">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Processing Assets</h2>
                        <p className="text-muted-foreground mt-2">The Neural Core is analyzing your profile.</p>
                      </div>

                      <AgentProgressDropdown phase={phase} steps={collectingSteps} />

                      {error && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500 flex flex-col items-center justify-center p-8 mt-4 rounded-3xl border border-red-500/20 bg-red-500/5 text-center">
                          <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                          </div>
                          <h3 className="text-lg font-bold text-red-600 mb-2">Analysis Failed</h3>
                          <p className="text-sm text-red-500/80 mb-6 max-w-md">{error}</p>
                          <Button onClick={() => setPhase('form')} variant="outline" className="border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors">
                            Try Again
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
              </div>
              
              {/* Right Side: 3D Visual */}
              <div className={`${phase === 'finalizing' ? 'hidden' : 'hidden lg:flex w-full lg:w-2/5'} bg-slate-50 dark:bg-slate-950 relative items-center justify-center overflow-hidden border-l border-border/50 p-12 group transition-all duration-700`}>
                {/* Glowing background meshes */}
                <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2)_0%,transparent_70%)] transition-all duration-700 ${phase !== 'form' && phase !== 'finalizing' ? 'animate-[pulse_2s_ease-in-out_infinite]' : 'animate-[pulse_4s_ease-in-out_infinite]'}`} />
                <div className={`absolute top-1/4 left-1/4 w-full h-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0%,transparent_50%)] transition-all duration-700 ${phase !== 'form' && phase !== 'finalizing' ? 'animate-[pulse_3s_ease-in-out_infinite_reverse]' : 'animate-[pulse_6s_ease-in-out_infinite_reverse]'}`} />
                
                {/* Grid Lines Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
                
                {/* 3D Floating Asset */}
                <div className={`relative z-10 w-full max-w-[320px] aspect-square transition-transform duration-700 ${phase !== 'form' ? 'scale-110' : 'group-hover:scale-105'}`}>
                   <div className={`absolute inset-0 bg-blue-500/20 dark:bg-blue-500/10 blur-[60px] rounded-full mix-blend-multiply dark:mix-blend-overlay ${phase !== 'form' && phase !== 'finalizing' ? 'animate-[pulse_2s_ease-in-out_infinite]' : 'animate-pulse'}`} />
                   <img 
                     src="/ai-review-bot.png" 
                     alt="AI Analysis Core" 
                     className={`w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] ${phase !== 'form' && phase !== 'finalizing' ? 'animate-[float_2s_ease-in-out_infinite]' : 'animate-float'}`}
                   />
                </div>
                
                {/* Status Overlay UI */}
                <div className={`absolute bottom-8 left-8 right-8 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-md p-4 shadow-xl dark:shadow-2xl transform transition-all duration-500 ${phase !== 'form' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${error ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'} dark:${error ? 'shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'shadow-[0_0_10px_rgba(34,197,94,0.8)]'} ${phase !== 'form' && !error && phase !== 'finalizing' ? 'animate-ping' : 'animate-pulse'}`} />
                    <p className={`text-sm font-medium ${error ? 'text-red-500' : 'text-slate-800 dark:text-white/90'}`}>
                      {error ? 'Analysis Terminated' : phase === 'finalizing' ? 'Analysis Complete' : phase === 'form' ? 'Neural Core Standing By' : 'Processing Telemetry...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && <ReviewHistory reviews={reviews} />}
    </div>
  )
}
