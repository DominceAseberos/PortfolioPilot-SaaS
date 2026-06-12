import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Globe, GitBranch, FileText, Upload, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  role: 'system' | 'user'
  content: React.ReactNode
}

interface NeuralChatLandingProps {
  portfolioUrl: string
  setPortfolioUrl: (val: string) => void
  githubUsername: string
  setGithubUsername: (val: string) => void
  resumeFile: File | null
  setResumeFile: (val: File | null) => void
  onSubmit: (e: any) => void
  isLoading: boolean
}

export function NeuralChatLanding({
  portfolioUrl,
  setPortfolioUrl,
  githubUsername,
  setGithubUsername,
  resumeFile,
  setResumeFile,
  onSubmit,
  isLoading
}: NeuralChatLandingProps) {
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'system',
      content: (
        <div className="space-y-4">
          <p className="text-base font-medium">Neural Core standing by.</p>
          <p className="text-sm">Drop your Portfolio URL, GitHub username, or Resume PDF to trigger an autonomous, AI-driven technical assessment.</p>
        </div>
      )
    }
  ])

  const [activeInputMode, setActiveInputMode] = useState<'portfolio' | 'github' | 'resume'>('portfolio')
  const [chatInputValue, setChatInputValue] = useState('')
  const [isChatProcessing, setIsChatProcessing] = useState(false)
  
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatLog, isChatProcessing])

  const stripGitHubUrl = (input: string): string => {
    const match = input
      .trim()
      .match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_-]+)(?:\/.*)?$/i)
    return match ? match[1] : input.trim()
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isChatProcessing || isLoading) return

    if (activeInputMode === 'portfolio' && chatInputValue.trim()) {
       const val = chatInputValue.trim()
       setPortfolioUrl(val)
       setChatInputValue('')
       addChatFlow(val, 'portfolio')
    } else if (activeInputMode === 'github' && chatInputValue.trim()) {
       const val = stripGitHubUrl(chatInputValue.trim())
       setGithubUsername(val)
       setChatInputValue('')
       addChatFlow(val, 'github')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
       setResumeFile(file)
       addChatFlow(file.name, 'resume')
    } else if (file) {
       toast.error('Please upload a PDF file.')
    }
  }

  const addChatFlow = (value: string, mode: 'portfolio' | 'github' | 'resume') => {
     setChatLog(prev => [...prev, { id: Date.now().toString(), role: 'user', content: value }])
     setIsChatProcessing(true)
     
     setTimeout(() => {
        setIsChatProcessing(false)
        const sysId = Date.now().toString()
        
        let content: React.ReactNode = null
        if (mode === 'portfolio') {
           content = (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-sm font-bold text-blue-500 flex items-center gap-2"><Globe className="h-4 w-4" /> Validating Live Portfolio...</p>
                <img 
                  src={`https://api.microlink.io?url=${encodeURIComponent(value)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1280&viewport.height=800`} 
                  className="w-full h-48 sm:h-64 object-cover rounded-xl border border-border/50 shadow-sm" 
                  alt="Portfolio Preview" 
                  loading="lazy"
                />
                <p className="text-sm font-medium">Portfolio is valid. Should we proceed to analyze or provide Resume/CV or GITHUB?</p>
                <div className="flex flex-wrap gap-2 pt-2">
                   <Button size="sm" variant="outline" onClick={() => setActiveInputMode('github')}>Provide GitHub</Button>
                   <Button size="sm" variant="outline" onClick={() => setActiveInputMode('resume')}>Provide Resume/CV</Button>
                   <Button size="sm" onClick={(e) => onSubmit(e as any)}>Proceed Analysis</Button>
                </div>
             </div>
           )
        } else if (mode === 'github') {
           content = (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-sm font-bold text-purple-500 flex items-center gap-2"><GitBranch className="h-4 w-4" /> Orchestrating GitHub Telemetry...</p>
                <p className="text-sm font-medium">GitHub mapped successfully. Proceed to analyze or provide more context?</p>
                <div className="flex flex-wrap gap-2 pt-2">
                   <Button size="sm" variant="outline" onClick={() => setActiveInputMode('portfolio')}>Provide Portfolio</Button>
                   <Button size="sm" variant="outline" onClick={() => setActiveInputMode('resume')}>Provide Resume/CV</Button>
                   <Button size="sm" onClick={(e) => onSubmit(e as any)}>Proceed Analysis</Button>
                </div>
             </div>
           )
        } else {
           content = (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-sm font-bold text-emerald-500 flex items-center gap-2"><FileText className="h-4 w-4" /> Validating PDF Structure...</p>
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                  <FileText className="h-8 w-8 text-emerald-500" />
                  <span className="font-semibold text-sm truncate">{value}</span>
                </div>
                <p className="text-sm font-medium">Resume parsing ready. Proceed to analyze or provide more context?</p>
                <div className="flex flex-wrap gap-2 pt-2">
                   <Button size="sm" variant="outline" onClick={() => setActiveInputMode('portfolio')}>Provide Portfolio</Button>
                   <Button size="sm" variant="outline" onClick={() => setActiveInputMode('github')}>Provide GitHub</Button>
                   <Button size="sm" onClick={(e) => onSubmit(e as any)}>Proceed Analysis</Button>
                </div>
             </div>
           )
        }
        
        setChatLog(prev => [...prev, { id: sysId, role: 'system', content }])
     }, 2000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto relative mt-4">
      {/* Messages */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto pb-48 pt-8 space-y-8 custom-scrollbar px-2 sm:px-6 scroll-smooth"
      >
        <div className="flex flex-col items-center justify-center mb-16 pt-8">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-8 animate-float z-10">
             <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full mix-blend-multiply dark:mix-blend-overlay animate-pulse" />
             <img src="/ai-review-bot.png" alt="AI Neural Core" className="relative z-10 w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent text-center">
            Unleash the Neural Core.
          </h2>
        </div>

        {chatLog.map((msg) => (
           <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500 w-full`}>
             {msg.role === 'system' && (
                <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mr-3 sm:mr-4 mt-1">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
             )}
             <div className={`max-w-[85%] sm:max-w-[75%] rounded-[1.5rem] px-5 py-4 shadow-sm ${msg.role === 'user' ? 'bg-foreground text-background rounded-tr-sm' : 'bg-card border border-border/50 text-foreground rounded-tl-sm'}`}>
               {msg.content}
             </div>
           </div>
        ))}
        {isChatProcessing && (
           <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 w-full">
             <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mr-3 sm:mr-4 mt-1">
               <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
             </div>
             <div className="max-w-[85%] rounded-[1.5rem] rounded-tl-sm bg-card border border-border/50 px-6 py-5 shadow-sm flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-semibold text-muted-foreground">Orchestration happens here...</span>
             </div>
           </div>
        )}
      </div>

      {/* Input Bar Overlay */}
      <div className="absolute bottom-0 left-0 right-0 pt-10 pb-6 px-4 sm:px-6 bg-gradient-to-t from-background via-background/95 to-transparent z-20">
         <div className="max-w-3xl mx-auto flex flex-col gap-3">
            
            {/* Active Attachment Pills */}
            <div className="flex flex-wrap gap-2 px-1">
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
                       <Globe className="h-4 w-4 text-blue-500" /> Live Portfolio URL
                     </button>
                     <button type="button" onClick={() => setActiveInputMode('github')} className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-3 transition-colors mt-1 ${activeInputMode === 'github' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}>
                       <GitBranch className="h-4 w-4 text-purple-500" /> GitHub Username
                     </button>
                     <button type="button" onClick={() => setActiveInputMode('resume')} className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-3 transition-colors mt-1 ${activeInputMode === 'resume' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}>
                       <FileText className="h-4 w-4 text-emerald-500" /> Resume/CV (PDF)
                     </button>
                  </div>
               </div>

               {activeInputMode === 'resume' ? (
                  <div className="flex-1 px-3 h-10 sm:h-12 flex items-center bg-transparent border-none focus:outline-none">
                     <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors h-full w-full justify-start text-left">
                       <Upload className="h-4 w-4" /> Drop your PDF here or click to browse...
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
              Neural Core uses autonomous orchestration. Press enter to validate input.
            </p>
         </div>
      </div>
    </div>
  )
}
