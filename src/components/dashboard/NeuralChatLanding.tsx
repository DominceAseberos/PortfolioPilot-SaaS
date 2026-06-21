import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Globe, GitBranch, FileText, Upload, ArrowRight, Loader2, Sparkles, AlertTriangle, Users, Folder, ExternalLink, CheckCircle2, XCircle, Link2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { getAnalysisCost } from '@/config/pricing'
import { FILE_UPLOAD } from '@/constants'
import CURATED_BANNED_WORDS from '@/constants/curated-banned-words.json'
import { normalizeGitHubUsername } from '@/utils/source-normalizers'

interface ChatMessage {
  id: string
  role: 'system' | 'user'
  content: React.ReactNode
  fullWidth?: boolean
  naked?: boolean
}

interface ValidatedDetectedLink {
  url: string
  normalized: string
  isValid: boolean
  message?: string
}

interface ValidatedGitHubLink extends ValidatedDetectedLink {
  username: string
  profile?: {
    login: string
    name: string
    avatarUrl?: string
    bio?: string
    publicRepos?: number
    followers?: number
  }
}

interface ResumeValidatedLinks {
  github: ValidatedGitHubLink[]
  linkedin: { url: string; normalized: string }[]
  portfolioCandidates: ValidatedDetectedLink[]
}

const DynamicProceedContext = React.createContext<{
  portfolioUrl: string
  githubUsername: string
  resumeFile: File | null
  isScanning: boolean
}>({
  portfolioUrl: '',
  githubUsername: '',
  resumeFile: null,
  isScanning: false
})

function SmartPortfolioPreview({ url, originalInput }: { url: string, originalInput: string }) {
  const { portfolioUrl, isScanning } = React.useContext(DynamicProceedContext)
  const isSelected = originalInput === portfolioUrl
  const isDismissed = portfolioUrl && !isSelected
  if (isDismissed) return <div className="mt-4 p-4 text-center text-sm text-muted-foreground italic border border-dashed border-border/50 rounded-xl bg-muted/10 flex items-center justify-center gap-2"><Globe className="h-4 w-4 opacity-50"/>Previous Preview Dismissed</div>
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  return (
    <div className="mt-4 relative w-full h-[300px] sm:h-[400px] rounded-xl overflow-hidden border border-border/50 shadow-sm bg-muted/50 flex items-center justify-center group/preview">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes inline-scan-line {
          0% { top: -30%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
      <div className="absolute top-0 left-0 w-[200%] h-[200%] origin-top-left scale-50">
         <iframe src={normalizedUrl} className="w-full h-full border-0 bg-background custom-scrollbar" title="Portfolio Live Preview" sandbox="allow-scripts allow-same-origin" />
      </div>
      {isScanning && isSelected && (
         <>
           <div className="absolute inset-0 z-10 bg-primary/10 mix-blend-overlay pointer-events-none transition-opacity duration-1000" />
           <div 
             className="absolute left-0 right-0 z-20 pointer-events-none border-b border-green-500 shadow-[0_4px_15px_rgba(34,197,94,0.4)]" 
             style={{ 
               height: '30%',
               background: 'linear-gradient(to bottom, transparent 0%, rgba(34, 197, 94, 0.02) 50%, rgba(34, 197, 94, 0.15) 100%)',
               animation: 'inline-scan-line 3s linear infinite' 
             }}
           />
           <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-green-500/50 z-20 pointer-events-none" />
           <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-green-500/50 z-20 pointer-events-none" />
           <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-green-500/50 z-20 pointer-events-none" />
           
           <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-md px-3 py-2 rounded-md text-[10px] sm:text-xs font-mono text-muted-foreground border border-border/50 shadow-sm flex items-center gap-2 z-20">
             <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
             <span className="uppercase tracking-wider font-bold">Layer 2 Extractor Active</span>
           </div>
         </>
      )}
    </div>
  )
}

function SmartGithubPreview({ profile, username }: { profile: any, username: string }) {
  const { githubUsername } = React.useContext(DynamicProceedContext)
  const isSelected = username === githubUsername
  const isDismissed = githubUsername && !isSelected
  if (isDismissed) return <div className="mt-4 p-4 text-center text-sm text-muted-foreground italic border border-dashed border-border/50 rounded-xl bg-muted/10 flex items-center justify-center gap-2"><GitBranch className="h-4 w-4 opacity-50"/>Previous Profile Dismissed</div>
  return (
    <div className="mt-4 w-full rounded-2xl border border-border/50 bg-muted/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm relative overflow-hidden group">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 blur-[60px] rounded-full group-hover:bg-purple-500/20 transition-colors pointer-events-none" />
      <img src={profile.avatarUrl} alt={profile.login} className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-background shadow-md relative z-10 bg-muted" />
      <div className="flex-1 text-center sm:text-left relative z-10 w-full">
        <h3 className="text-2xl font-bold tracking-tight">{profile.name}</h3>
        <a href={`https://github.com/${profile.login}`} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-500 hover:text-purple-400 transition-colors flex items-center justify-center sm:justify-start gap-1 mb-4 font-medium">
          @{profile.login} <ExternalLink className="h-3 w-3" />
        </a>
        {profile.bio && <p className="text-sm text-muted-foreground mb-5 max-w-xl leading-relaxed">{profile.bio}</p>}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <Badge variant="secondary" className="bg-background/80 hover:bg-background/80 flex items-center gap-1.5 py-1.5 px-3">
            <Folder className="h-3.5 w-3.5 text-purple-500" /> {profile.publicRepos} Public Repos
          </Badge>
          <Badge variant="secondary" className="bg-background/80 hover:bg-background/80 flex items-center gap-1.5 py-1.5 px-3">
            <Users className="h-3.5 w-3.5 text-purple-500" /> {profile.followers} Followers
          </Badge>
        </div>
      </div>
    </div>
  )
}

function SmartResumePreview({ pdfUrl, fileObj, fileName }: { pdfUrl: string | null, fileObj: File | null, fileName: string }) {
  const { resumeFile } = React.useContext(DynamicProceedContext)
  const isSelected = resumeFile && fileObj && resumeFile.name === fileName && resumeFile.size === fileObj.size
  const isDismissed = resumeFile && !isSelected
  if (isDismissed) return <div className="mt-4 p-4 text-center text-sm text-muted-foreground italic border border-dashed border-border/50 rounded-xl bg-muted/10 flex items-center justify-center gap-2"><FileText className="h-4 w-4 opacity-50"/>Previous Resume Dismissed</div>
  return (
    <div className="mt-4 w-full rounded-2xl border border-border/50 bg-muted/20 p-4 shadow-sm relative overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 mb-4 p-3 bg-background rounded-xl border border-border/50">
        <FileText className="h-8 w-8 text-emerald-500 shrink-0" />
        <div className="flex flex-col overflow-hidden">
           <span className="font-semibold text-sm truncate">{fileName}</span>
           <span className="text-xs text-muted-foreground">{fileObj ? (fileObj.size / 1024 / 1024).toFixed(2) : 'Unknown'} MB</span>
        </div>
      </div>
      {pdfUrl && (
        <div className="relative w-full h-[300px] sm:h-[400px] rounded-xl overflow-hidden border border-border/50 shadow-sm bg-muted flex items-center justify-center">
           <iframe src={`${pdfUrl}#toolbar=0&navpanes=0`} className="w-full h-full border-0 bg-background" title="Resume Live Preview" />
        </div>
      )}
    </div>
  )
}

// ── Approval Row Components ──────────────────────────────────────────────────

function PortfolioApprovalRow({
  initialUrl,
  onAccept,
  onReject,
  onChangeUrl,
}: {
  initialUrl: string
  onAccept: (url: string) => void
  onReject: () => void
  onChangeUrl: (url: string) => void
}) {
  const [mode, setMode] = useState<'idle' | 'change' | 'accepted' | 'rejected'>('idle')
  const [input, setInput] = useState(initialUrl.replace(/^https?:\/\//, ''))

  if (mode === 'accepted') {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-500 mt-3 pt-3 border-t border-border/30">
        <CheckCircle2 className="h-4 w-4" /> Portfolio added to analysis
      </div>
    )
  }

  if (mode === 'rejected') {
    return (
      <p className="text-xs text-muted-foreground italic mt-3 pt-3 border-t border-border/30">
        Portfolio skipped. You can still add one manually via the input bar.
      </p>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/30 space-y-2 animate-in fade-in duration-300">
      {mode === 'change' ? (
        <div className="flex gap-2 items-center">
          <Globe className="h-4 w-4 text-blue-500 shrink-0" />
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter new portfolio URL..."
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shrink-0"
            onClick={() => {
              const newUrl = input.startsWith('http') ? input : `https://${input}`
              onChangeUrl(newUrl)
              setMode('accepted')
            }}
          >Confirm</button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border border-border text-xs hover:bg-muted/50 transition-colors shrink-0"
            onClick={() => setMode('idle')}
          >Cancel</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm shadow-blue-500/20"
            onClick={() => { onAccept(initialUrl); setMode('accepted') }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Use this Portfolio
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 text-xs font-bold transition-all hover:scale-105 active:scale-95"
            onClick={() => { onReject(); setMode('rejected') }}
          >
            <XCircle className="h-3.5 w-3.5" /> Skip
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted hover:bg-muted/70 text-foreground border border-border/50 text-xs font-bold transition-all hover:scale-105 active:scale-95"
            onClick={() => setMode('change')}
          >
            <Edit2 className="h-3.5 w-3.5" /> Change URL
          </button>
        </div>
      )}
    </div>
  )
}

function GitHubApprovalRow({
  initialUsername,
  onAccept,
  onReject,
  onChangeUsername,
}: {
  initialUsername: string
  onAccept: (username: string) => void
  onReject: () => void
  onChangeUsername: (username: string) => void
}) {
  const [mode, setMode] = useState<'idle' | 'change' | 'accepted' | 'rejected'>('idle')
  const [input, setInput] = useState(initialUsername)

  if (mode === 'accepted') {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-purple-500 mt-3 pt-3 border-t border-border/30">
        <CheckCircle2 className="h-4 w-4" /> GitHub profile added to analysis
      </div>
    )
  }

  if (mode === 'rejected') {
    return (
      <p className="text-xs text-muted-foreground italic mt-3 pt-3 border-t border-border/30">
        GitHub skipped. You can still add one manually via the input bar.
      </p>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/30 space-y-2 animate-in fade-in duration-300">
      {mode === 'change' ? (
        <div className="flex gap-2 items-center">
          <GitBranch className="h-4 w-4 text-purple-500 shrink-0" />
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter GitHub username..."
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shrink-0"
            onClick={() => {
              const normalized = normalizeGitHubUsername(input.trim())
              onChangeUsername(normalized)
              setMode('accepted')
            }}
          >Confirm</button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border border-border text-xs hover:bg-muted/50 transition-colors shrink-0"
            onClick={() => setMode('idle')}
          >Cancel</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm shadow-purple-500/20"
            onClick={() => { onAccept(initialUsername); setMode('accepted') }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Use this GitHub Profile
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 text-xs font-bold transition-all hover:scale-105 active:scale-95"
            onClick={() => { onReject(); setMode('rejected') }}
          >
            <XCircle className="h-3.5 w-3.5" /> Skip
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted hover:bg-muted/70 text-foreground border border-border/50 text-xs font-bold transition-all hover:scale-105 active:scale-95"
            onClick={() => setMode('change')}
          >
            <Edit2 className="h-3.5 w-3.5" /> Different Username
          </button>
        </div>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface NeuralChatLandingProps {
  portfolioUrl: string
  setPortfolioUrl: (val: string) => void
  githubUsername: string
  setGithubUsername: (val: string) => void
  resumeFile: File | null
  setResumeFile: (val: File | null) => void
  onSubmit: (e: any) => void
  isLoading: boolean
  isScanning?: boolean
  hideInput?: boolean
  collectingNode?: React.ReactNode
  errorNode?: React.ReactNode
  resultNode?: React.ReactNode
  analysisId?: string
  credits?: number
}

export function NeuralChatLanding({
  portfolioUrl,
  setPortfolioUrl,
  githubUsername,
  setGithubUsername,
  resumeFile,
  setResumeFile,
  onSubmit,
  isLoading,
  isScanning = false,
  hideInput = false,
  collectingNode,
  errorNode,
  resultNode,
  analysisId,
  credits = 0
}: NeuralChatLandingProps) {
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'system',
      content: (
        <div className="space-y-4">
          <p className="text-base font-medium">Pilot Review agent standing by.</p>
          <p className="text-sm">Upload your Resume/CV. I'll automatically detect your portfolio and GitHub, show you a live preview, and let you approve, reject, or change each one before analysis.</p>
        </div>
      )
    }
  ])

  const [activeInputMode, setActiveInputMode] = useState<'portfolio' | 'github' | 'resume'>('resume')
  const [chatInputValue, setChatInputValue] = useState('')
  const [isChatProcessing, setIsChatProcessing] = useState(false)
  const submitLock = useRef(false)
  
  const sourceCost = (portfolioUrl ? getAnalysisCost('portfolio') : 0) +
                    (githubUsername ? getAnalysisCost('github') : 0) +
                    (resumeFile ? getAnalysisCost('resume') : 0)
  const totalCost = sourceCost > 0 ? sourceCost + 1 : 0

  const onSubmitRef = useRef(onSubmit)
  useEffect(() => {
    onSubmitRef.current = onSubmit
  }, [onSubmit])

  // Stable ref for addChatFlow to avoid stale closures in approval callbacks
  const addChatFlowRef = useRef<(value: string, mode: 'portfolio' | 'github' | 'resume', fileObj?: File, autoDetected?: boolean) => Promise<void>>(async () => {})

  const chatScrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll chat to bottom
  useEffect(() => {
    const node = chatScrollRef.current
    if (!node) return

    const scrollToLatest = () => {
      requestAnimationFrame(() => {
        node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
      })
    }

    scrollToLatest()
    const observer = new MutationObserver(scrollToLatest)
    observer.observe(node, { childList: true, subtree: true, characterData: true })

    return () => observer.disconnect()
  }, [chatLog, isChatProcessing, resultNode])

  // Append resultNode to chatLog for continuous session history
  useEffect(() => {
    if (resultNode && analysisId) {
      setChatLog(prev => {
        const resultId = `result-${analysisId}`
        if (prev.find(m => m.id === resultId)) return prev
        
        const storedNode = (
          <div className="w-full mt-6">
            {resultNode}
          </div>
        )
        
        return [...prev, {
          id: resultId,
          role: 'system',
          fullWidth: true,
          naked: true,
          content: storedNode
        }]
      })
    }
  }, [resultNode, analysisId])

  const renderDetectedLinks = (links: ResumeValidatedLinks | undefined) => {
    if (!links) return null

    const validGithub = links.github.filter((l) => l.isValid)
    const validPortfolios = links.portfolioCandidates.filter((l) => l.isValid)
    const hasLinks = validGithub.length > 0 || validPortfolios.length > 0

    if (!hasLinks) {
      return (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground flex items-center gap-2">
          <Link2 className="h-4 w-4 shrink-0" />
          No valid portfolio or GitHub URL was detected in this resume. You can add them manually below.
        </div>
      )
    }

    const items: string[] = []
    if (validPortfolios.length > 0) items.push(`${validPortfolios.length} portfolio link${validPortfolios.length > 1 ? 's' : ''}`)
    if (validGithub.length > 0) items.push(`${validGithub.length} GitHub profile${validGithub.length > 1 ? 's' : ''}`)
    if (links.linkedin.length > 0) items.push('LinkedIn')

    return (
      <div className="rounded-2xl border border-border/50 bg-background/80 p-4 flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10 border border-primary/20">
          <Link2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold">Links detected: {items.join(', ')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Loading previews for review...</p>
        </div>
        <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto shrink-0" />
      </div>
    )
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isChatProcessing || isLoading || submitLock.current) return
    
    submitLock.current = true
    setTimeout(() => { submitLock.current = false }, 1000)

    if (activeInputMode === 'resume') {
       fileInputRef.current?.click()
    } else if (activeInputMode === 'portfolio' && chatInputValue.trim()) {
       const val = chatInputValue.trim()
       
       const urlPattern = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d+)?(\/.*)?$/i;
       if (!urlPattern.test(val) || val.includes('github/')) {
          setChatLog(prev => [...prev, { id: Date.now().toString(), role: 'user', content: val }])
          setIsChatProcessing(true)
          setTimeout(() => {
             setChatLog(prev => [...prev, {
                id: Date.now().toString() + '-err',
                role: 'system',
                content: (
                  <div className="flex items-center gap-3 text-red-500">
                     <AlertTriangle className="h-4 w-4 shrink-0" />
                     <span className="text-sm font-medium">Invalid URL detected. The URL provided is not reachable or not a valid portfolio link.</span>
                  </div>
                )
             }])
             setIsChatProcessing(false)
          }, 800)
          setChatInputValue('')
          return
       }

       setChatInputValue('')
       addChatFlow(val, 'portfolio')
    } else if (activeInputMode === 'github' && chatInputValue.trim()) {
       const val = normalizeGitHubUsername(chatInputValue.trim())
       setChatInputValue('')
       addChatFlow(val, 'github')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
       if (file.size > FILE_UPLOAD.maxFileSize) {
         const maxMb = FILE_UPLOAD.maxFileSize / (1024 * 1024)
         setChatLog(prev => [...prev, { id: Date.now().toString(), role: 'user', content: file.name }])
         setChatLog(prev => [...prev, { 
            id: Date.now().toString() + '-sys', 
            role: 'system', 
            content: (
              <div className="flex items-center gap-3 animate-in fade-in text-red-500">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Upload Failed: File is too large. Maximum size is {maxMb}MB.</span>
              </div>
            ) 
         }])
         toast.error(`File is too large. Maximum size is ${maxMb}MB.`)
         if (fileInputRef.current) fileInputRef.current.value = ''
         return
       }
       addChatFlow(file.name, 'resume', file)
    } else if (file) {
       toast.error('Please upload a PDF file.')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addChatFlow = async (
    value: string,
    mode: 'portfolio' | 'github' | 'resume',
    fileObj?: File,
    autoDetected = false
  ) => {
     const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

     // For manual entries: run banned word filter, show user bubble, set processing state
     if (!autoDetected) {
       const lowerValue = value.toLowerCase()
       
       if (CURATED_BANNED_WORDS.some(word => lowerValue.includes(word))) {
          setChatLog(prev => [...prev, { id: Date.now().toString(), role: 'user', content: value }])
          setChatLog(prev => [...prev, { 
            id: Date.now().toString() + '-sys', 
            role: 'system', 
            content: (
              <div className="flex items-center gap-3 animate-in fade-in text-red-500">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Input Blocked: Contains restricted keywords. Please maintain professional decorum.</span>
              </div>
            ) 
          }])
          return
       }

       setChatLog(prev => [...prev, { id: Date.now().toString(), role: 'user', content: value }])
       setIsChatProcessing(true)
     }

      if (mode === 'portfolio') {
         const normalizedUrl = value.trim().match(/^https?:\/\//i) ? value.trim() : `https://${value.trim()}`
         
         const stepId = Date.now().toString() + `-sys-portfolio`
         setChatLog(prev => [...prev, { 
           id: stepId, 
           role: 'system', 
           content: (
             <div className="flex items-center gap-3 animate-in fade-in text-muted-foreground">
               <Loader2 className="h-4 w-4 animate-spin shrink-0" />
               <span className="text-sm font-medium">Verifying portfolio URL...</span>
             </div>
           ) 
         }])
         
         try {
           const valRes = await fetch('/api/reviews/validate-portfolio', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ portfolioUrl: normalizedUrl })
           })
           const valData = await valRes.json()

           if (!valData.success) {
              setChatLog(prev => prev.map(msg => msg.id === stepId ? {
                ...msg,
                content: (
                  <div className="flex items-center gap-3 animate-in fade-in text-red-500">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Validation Failed: {valData.message}</span>
                  </div>
                )
              } : msg))
              if (!autoDetected) setIsChatProcessing(false)
              return
           }
         } catch (e) {
            setChatLog(prev => prev.map(msg => msg.id === stepId ? {
              ...msg,
              content: (
                <div className="flex items-center gap-3 animate-in fade-in text-red-500">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Validation Failed: Could not reach the provided URL. Ensure it is publicly accessible.</span>
                </div>
              )
            } : msg))
            if (!autoDetected) setIsChatProcessing(false)
            return
         }

         // For manual entries, accept immediately. For auto-detected, show approval row.
         if (!autoDetected) {
           setPortfolioUrl(value.trim())
         }

         setChatLog(prev => prev.map(msg => {
            if (msg.role === 'system' && msg.id.includes('-sys-portfolio') && msg.id !== stepId) {
               return {
                 ...msg,
                 fullWidth: false,
                 content: <div className="mt-4 p-4 text-center text-sm text-muted-foreground italic border border-dashed border-border/50 rounded-xl bg-muted/10 flex items-center justify-center gap-2"><Globe className="h-4 w-4 opacity-50"/>Previous Preview Dismissed</div>
               }
            }
            if (msg.id === stepId) {
               return {
                 ...msg,
                 content: (
                   <div className="flex items-center gap-3 animate-in fade-in text-blue-500">
                     <Globe className="h-4 w-4 shrink-0" />
                     <span className="text-sm font-medium">Valid portfolio detected. Loading preview...</span>
                   </div>
                 )
               }
            }
            return msg
         }))

         await delay(1000)

         setChatLog(prev => prev.map(msg => msg.id === stepId ? {
           ...msg,
           fullWidth: true,
           content: (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Connecting to live website...
                </p>
                <div className="relative w-full h-[300px] sm:h-[400px] rounded-xl border border-border/50 shadow-sm bg-muted animate-pulse"></div>
             </div>
           )
         } : msg))

         await delay(1500)

         setChatLog(prev => prev.map(msg => msg.id === stepId ? {
           ...msg,
           content: (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <p className="text-sm font-bold text-blue-500 flex items-center gap-2">
                     <Globe className="h-4 w-4 shrink-0" /> Preview ready
                   </p>
                </div>
                <SmartPortfolioPreview url={normalizedUrl} originalInput={autoDetected ? normalizedUrl : value} />
                {autoDetected && (
                  <PortfolioApprovalRow
                    initialUrl={normalizedUrl}
                    onAccept={(url) => {
                      setPortfolioUrl(url)
                      toast.success('Portfolio added to analysis')
                    }}
                    onReject={() => {
                      // URL not set — user rejected
                    }}
                    onChangeUrl={(newUrl) => {
                      addChatFlowRef.current(newUrl, 'portfolio', undefined, true)
                    }}
                  />
                )}
             </div>
           )
         } : msg))

     } else if (mode === 'github') {
         const stepId = Date.now().toString() + `-sys-github`
         setChatLog(prev => [...prev, { 
           id: stepId, 
           role: 'system', 
           content: (
             <div className="flex items-center gap-3 animate-in fade-in text-muted-foreground">
               <Loader2 className="h-4 w-4 animate-spin shrink-0" />
               <span className="text-sm font-medium">Pinging GitHub API...</span>
             </div>
           ) 
         }])
         
         try {
           const res = await fetch('/api/reviews/validate-github', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ username: value })
           })
           const data = await res.json()

           if (!data.success) {
              setChatLog(prev => prev.map(msg => msg.id === stepId ? {
                ...msg,
                content: (
                  <div className="flex items-center gap-3 animate-in fade-in text-red-500">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Validation Failed: {data.message}</span>
                  </div>
                )
              } : msg))
              if (!autoDetected) setIsChatProcessing(false)
              return
           }

           const profile = data.data

           // For manual entries, accept immediately. For auto-detected, show approval row.
           if (!autoDetected) {
             setGithubUsername(value)
           }
           
           setChatLog(prev => prev.map(msg => {
             if (msg.role === 'system' && msg.id.includes('-sys-github') && msg.id !== stepId) {
                return {
                  ...msg,
                  fullWidth: false,
                  content: <div className="mt-4 p-4 text-center text-sm text-muted-foreground italic border border-dashed border-border/50 rounded-xl bg-muted/10 flex items-center justify-center gap-2"><GitBranch className="h-4 w-4 opacity-50"/>Previous Profile Dismissed</div>
                }
             }
             if (msg.id === stepId) {
                return {
                  ...msg,
                  fullWidth: true,
                  content: (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 w-full">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <p className="text-sm font-bold text-purple-500 flex items-center gap-2">
                            <GitBranch className="h-4 w-4 shrink-0" /> GitHub Profile Verified
                          </p>
                       </div>
                       <SmartGithubPreview profile={profile} username={value} />
                       {autoDetected && (
                         <GitHubApprovalRow
                           initialUsername={value}
                           onAccept={(username) => {
                             setGithubUsername(username)
                             toast.success('GitHub profile added to analysis')
                           }}
                           onReject={() => {
                             // Username not set — user rejected
                           }}
                           onChangeUsername={(newUsername) => {
                             addChatFlowRef.current(newUsername, 'github', undefined, true)
                           }}
                         />
                       )}
                    </div>
                  )
                }
             }
             return msg
           }))

         } catch (e) {
            setChatLog(prev => prev.map(msg => msg.id === stepId ? {
              ...msg,
              content: (
                <div className="flex items-center gap-3 animate-in fade-in text-red-500">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Validation Failed: Could not reach the GitHub API.</span>
                </div>
              )
            } : msg))
            if (!autoDetected) setIsChatProcessing(false)
            return
         }
     } else {
         // ── Resume flow ──────────────────────────────────────────────────
         const step1Id = Date.now().toString() + `-sys-resume`
        setChatLog(prev => [...prev, { 
          id: step1Id, 
          role: 'system', 
          content: (
            <div className="flex items-center gap-3 animate-in fade-in text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Verifying PDF file signature...</span>
            </div>
          ) 
        }])
        
        await delay(800)

        setChatLog(prev => prev.map(msg => msg.id === step1Id ? {
          ...msg,
          content: (
            <div className="flex items-center gap-3 animate-in fade-in text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Scanning document contents...</span>
            </div>
          )
        } : msg))

        // Hoist detected links so we can auto-trigger previews after resume display
        let autoDetectedPortfolio: ValidatedDetectedLink | null = null
        let autoDetectedGithub: ValidatedGitHubLink | null = null

        if (fileObj) {
          try {
            const formData = new FormData()
            formData.append('file', fileObj)

            const res = await fetch('/api/reviews/validate-resume', {
              method: 'POST',
              body: formData
            })
            const data = await res.json()

            if (!data.success) {
              setChatLog(prev => prev.map(msg => msg.id === step1Id ? {
                ...msg,
                content: (
                  <div className="flex items-center gap-3 animate-in fade-in text-red-500">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Validation Failed: {data.message}</span>
                  </div>
                )
              } : msg))
              setIsChatProcessing(false)
              return
            }

            const detectedLinks = data.data?.detectedLinks as ResumeValidatedLinks | undefined
            if (detectedLinks) {
              // Pick first valid of each type for auto-preview
              autoDetectedPortfolio = detectedLinks.portfolioCandidates.filter(l => l.isValid)[0] ?? null
              autoDetectedGithub = detectedLinks.github.filter(l => l.isValid)[0] ?? null

              setChatLog(prev => [...prev, {
                id: Date.now().toString() + '-detected-links',
                role: 'system',
                fullWidth: true,
                content: (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 w-full">
                    {renderDetectedLinks(detectedLinks)}
                  </div>
                )
              }])
            }
          } catch (e) {
            setChatLog(prev => prev.map(msg => msg.id === step1Id ? {
              ...msg,
              content: (
                <div className="flex items-center gap-3 animate-in fade-in text-red-500">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Validation Failed: Could not analyze document.</span>
                </div>
              )
            } : msg))
            setIsChatProcessing(false)
            return
          }
        }

        setChatLog(prev => prev.map(msg => msg.id === step1Id ? {
          ...msg,
          content: (
            <div className="flex items-center gap-3 animate-in fade-in text-emerald-500">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Document validated. Rendering preview...</span>
            </div>
          )
        } : msg))

        await delay(1000)
        
        setResumeFile(fileObj || null)
        const pdfPreviewUrl = fileObj ? URL.createObjectURL(fileObj) : null

        setChatLog(prev => prev.map(msg => {
            if (msg.role === 'system' && msg.id.includes('-sys-resume') && msg.id !== step1Id) {
               return {
                 ...msg,
                 fullWidth: false,
                 content: <div className="mt-4 p-4 text-center text-sm text-muted-foreground italic border border-dashed border-border/50 rounded-xl bg-muted/10 flex items-center justify-center gap-2"><FileText className="h-4 w-4 opacity-50"/>Previous Resume Dismissed</div>
               }
            }
            if (msg.id === step1Id) {
               return {
                 ...msg,
                 fullWidth: true,
                 content: (
                   <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 w-full">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <p className="text-sm font-bold text-emerald-500 flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0" /> Resume Verified
                          </p>
                       </div>
                       <SmartResumePreview pdfUrl={pdfPreviewUrl} fileObj={fileObj || null} fileName={value} />
                   </div>
                 )
               }
            }
            return msg
         }))

        // Auto-trigger previews for detected links (with approval rows)
        if (autoDetectedPortfolio) {
          await delay(500)
          await addChatFlowRef.current(autoDetectedPortfolio.normalized, 'portfolio', undefined, true)
        }
        if (autoDetectedGithub) {
          await delay(500)
          await addChatFlowRef.current(autoDetectedGithub.username, 'github', undefined, true)
        }

        // If no links detected, show manual add hint
        if (!autoDetectedPortfolio && !autoDetectedGithub) {
          await delay(300)
          setChatLog(prev => [...prev, {
            id: Date.now().toString() + '-manual-hint',
            role: 'system',
            content: (
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 text-sm">
                <p className="font-semibold text-foreground mb-2">No portfolio or GitHub detected in the resume.</p>
                <p className="text-muted-foreground text-xs">You can still add them manually using the input bar below — switch to Portfolio or GitHub mode using the icon on the left.</p>
              </div>
            )
          }])
        }
     }
     
     if (!autoDetected) {
       setIsChatProcessing(false)
     }
  }

  // Keep addChatFlowRef always current to avoid stale closures in approval callbacks
  addChatFlowRef.current = addChatFlow

  return (
    <DynamicProceedContext.Provider value={{ portfolioUrl, githubUsername, resumeFile, isScanning: isScanning ?? false }}>
      <div className="flex flex-col h-full w-full mx-auto relative pt-4">
      {/* Messages */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto w-full pb-48 pt-8 custom-scrollbar px-2 sm:px-6 scroll-smooth"
        style={{ WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%, black 100%)', maskImage: 'linear-gradient(to top, transparent 0%, black 15%, black 100%)' }}
      >
        <div className="w-full max-w-5xl mx-auto flex flex-col space-y-8">
          <div className="flex flex-col items-center justify-center mb-16 pt-8">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-8 animate-float z-10">
               <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full mix-blend-multiply dark:mix-blend-overlay animate-pulse" />
               <img src="/ai-review-bot.png" alt="AI Pilot Agent" className="relative z-10 w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent text-center">
              Unleash the Pilot Review Agent.
            </h2>
          </div>

          {chatLog.map((msg) => (
             <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500 w-full`}>
               {msg.role === 'system' && !msg.naked && (
                  <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mr-3 sm:mr-4 mt-1">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
               )}
               <div className={`${msg.fullWidth ? 'w-full' : 'max-w-[85%] sm:max-w-[75%]'} ${msg.naked ? '' : `rounded-[1.5rem] px-5 py-4 shadow-sm ${msg.role === 'user' ? 'bg-foreground text-background rounded-tr-sm' : 'bg-card border border-border/50 text-foreground rounded-tl-sm'}`}`}>
                 {msg.content}
               </div>
             </div>
          ))}

          {collectingNode && (
             <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
               <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mr-3 sm:mr-4 mt-1">
                 <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
               </div>
               <div className="w-full max-w-[85%] sm:max-w-[75%]">
                 {collectingNode}
               </div>
             </div>
          )}

          {errorNode && (
             <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
               <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mr-3 sm:mr-4 mt-1">
                 <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
               </div>
               <div className="w-full max-w-[85%] sm:max-w-[75%]">
                 {errorNode}
               </div>
             </div>
          )}

          {isChatProcessing && (
             <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
               <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mr-3 sm:mr-4 mt-1">
                 <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse" />
               </div>
               <div className="max-w-[85%] sm:max-w-[75%] rounded-[1.5rem] rounded-tl-sm px-5 py-4 shadow-sm bg-card border border-border/50 text-foreground">
                 <div className="flex items-center gap-3 text-muted-foreground">
                   <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                   <span className="text-sm font-medium animate-pulse">Processing...</span>
                 </div>
               </div>
             </div>
          )}

        </div>
      </div>

      {/* Input Bar Overlay (Always visible for continuous session) */}
      {!hideInput && (
        <div className="absolute bottom-0 left-0 right-0 pt-4 pb-6 px-4 sm:px-6 z-20 pointer-events-none">
          <div className="w-full max-w-3xl lg:w-1/2 lg:min-w-[600px] mx-auto flex flex-col gap-3 pointer-events-auto">
            
            {/* Active Attachment Pills & Proceed Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
               <div className="flex flex-wrap gap-2">
                  {portfolioUrl && (
                     <Badge variant="secondary" className="gap-1.5 bg-card border-border/50 shadow-sm py-1.5 px-3 rounded-full text-xs font-semibold cursor-default hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all group" onClick={() => setPortfolioUrl('')}>
                       <Globe className="h-3.5 w-3.5 text-blue-500" />
                       <span className="truncate max-w-[150px]">{portfolioUrl.replace(/^https?:\/\//, '')}</span>
                       <span className="hidden group-hover:inline ml-1 text-red-500">×</span>
                     </Badge>
                  )}
                  {githubUsername && (
                     <Badge variant="secondary" className="gap-1.5 bg-card border-border/50 shadow-sm py-1.5 px-3 rounded-full text-xs font-semibold cursor-default hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all group" onClick={() => setGithubUsername('')}>
                       <GitBranch className="h-3.5 w-3.5 text-purple-500" />
                       <span className="truncate max-w-[150px]">{githubUsername}</span>
                       <span className="hidden group-hover:inline ml-1 text-red-500">×</span>
                     </Badge>
                  )}
                  {resumeFile && (
                     <Badge variant="secondary" className="gap-1.5 bg-card border-border/50 shadow-sm py-1.5 px-3 rounded-full text-xs font-semibold cursor-default hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all group" onClick={() => setResumeFile(null)}>
                       <FileText className="h-3.5 w-3.5 text-emerald-500" />
                       <span className="truncate max-w-[150px]">{resumeFile.name}</span>
                       <span className="hidden group-hover:inline ml-1 text-red-500">×</span>
                     </Badge>
                  )}
               </div>

               {totalCost > 0 && (
                  <Button onClick={(e) => onSubmitRef.current(e as any)} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 rounded-full px-5 animate-in fade-in slide-in-from-bottom-2 shrink-0">
                    Proceed ({totalCost} {totalCost === 1 ? 'Credit' : 'Credits'}) <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
               )}
            </div>

            {/* Chat Input Container */}
            <form onSubmit={handleChatSubmit} className="relative flex items-center bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-[2rem] p-1.5 sm:p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all group/form">
               
               {/* Tab Selector inside input left */}
               <div className="relative group/tabs flex items-center shrink-0">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground transition-colors shrink-0">
                     {activeInputMode === 'portfolio' ? <Globe className="h-5 w-5 text-blue-500" /> : activeInputMode === 'github' ? <GitBranch className="h-5 w-5 text-purple-500" /> : <FileText className="h-5 w-5 text-emerald-500" />}
                  </div>
                  {/* Dropdown for tabs */}
                  <div className="absolute bottom-full left-0 mb-3 w-56 bg-card border border-border/50 shadow-2xl rounded-2xl p-2 opacity-0 invisible group-hover/tabs:opacity-100 group-hover/tabs:visible transition-all -translate-y-2 group-hover/tabs:translate-y-0">
                     <div className="text-xs font-bold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Analysis Mode</div>
                     <button type="button" onClick={() => setActiveInputMode('portfolio')} className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-3 transition-colors ${activeInputMode === 'portfolio' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}>
                       <Globe className="h-4 w-4 text-blue-500" /> 
                       <span className="flex-1">Live Portfolio URL</span>
                       <span className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{getAnalysisCost('portfolio')} <span className="text-[10px]">Token</span></span>
                     </button>
                     <button type="button" onClick={() => setActiveInputMode('github')} className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-3 transition-colors mt-1 ${activeInputMode === 'github' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}>
                       <GitBranch className="h-4 w-4 text-purple-500" /> 
                       <span className="flex-1">GitHub Username</span>
                       <span className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{getAnalysisCost('github')} <span className="text-[10px]">Token</span></span>
                     </button>
                     <button type="button" onClick={() => setActiveInputMode('resume')} className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-3 transition-colors mt-1 ${activeInputMode === 'resume' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}>
                       <FileText className="h-4 w-4 text-emerald-500" /> 
                       <span className="flex-1">Resume/CV (PDF)</span>
                       <span className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{getAnalysisCost('resume')} <span className="text-[10px]">Token</span></span>
                     </button>
                  </div>
               </div>

               {activeInputMode === 'resume' ? (
                  <div className="flex-1 px-3 h-10 sm:h-12 flex items-center bg-transparent border-none focus:outline-none">
                     <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors h-full w-full justify-start text-left">
                       <Upload className="h-4 w-4" /> Upload your Resume/CV PDF first... (Max {FILE_UPLOAD.maxFileSize / (1024 * 1024)}MB)
                     </button>
                  </div>
               ) : (
                 <input 
                    type="text"
                    value={chatInputValue}
                    onChange={(e) => setChatInputValue(e.target.value)}
                    placeholder={activeInputMode === 'portfolio' ? "Enter portfolio URL..." : "Enter GitHub username..."}
                    className="flex-1 px-3 h-10 sm:h-12 text-sm sm:text-base font-medium bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground w-full"
                 />
               )}

               {/* Send Button */}
               <button 
                 type="submit"
                 disabled={isChatProcessing || isLoading || (activeInputMode !== 'resume' && !chatInputValue.trim())}
                 className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-[1.25rem] bg-foreground text-background hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none disabled:scale-100"
               >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
               </button>
            </form>
            
             <p className="text-center text-xs font-medium text-muted-foreground/60 mt-1">
               Upload your resume — portfolio & GitHub are auto-detected with live previews.
             </p>
          </div>
       </div>
      )}
      
      </div>
    </DynamicProceedContext.Provider>
  )
}
