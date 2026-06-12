'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, FileText, Globe, Loader2, Sparkles } from 'lucide-react'

export function HeroAnimation() {
  const [step, setStep] = useState(0)
  const [typedUrl, setTypedUrl] = useState('')
  const fullUrl = 'https://example.dev'

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    // Typing animation
    if (step === 1) {
      let i = 0
      interval = setInterval(() => {
        setTypedUrl(fullUrl.slice(0, i))
        i++
        if (i > fullUrl.length) {
          clearInterval(interval)
          setTimeout(() => setStep(2), 500)
        }
      }, 50)
    } else if (step === 2) {
      setTimeout(() => setStep(3), 1000)
    } else if (step === 3) {
      setTimeout(() => setStep(4), 800)
    } else if (step === 4) {
      setTimeout(() => setStep(5), 2500)
    } else if (step === 5) {
      setTimeout(() => setStep(6), 3000)
    } else if (step === 6) {
      setTimeout(() => {
        setStep(0)
        setTypedUrl('')
      }, 4000)
    } else if (step === 0) {
      setTimeout(() => setStep(1), 1000)
    }

    return () => clearInterval(interval)
  }, [step])

  return (
    <div className="relative w-full max-w-lg mx-auto bg-card border shadow-2xl rounded-2xl overflow-hidden aspect-[4/3] flex flex-col mt-10 lg:mt-0">
      {/* Mac-like Header */}
      <div className="bg-muted/50 border-b px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="mx-auto bg-background rounded-md text-[10px] text-muted-foreground px-4 py-1 flex items-center gap-2">
          <Globe className="w-3 h-3" />
          portfoliopilot.com/analyze
        </div>
      </div>

      <div className="p-6 flex-1 relative overflow-hidden bg-background">
        
        {/* Form State */}
        <div className={`transition-all duration-500 absolute inset-0 p-6 ${step < 3 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Portfolio URL</label>
              <div className={`h-9 border rounded-md flex items-center px-3 text-sm transition-all ${step === 1 ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                {typedUrl}
                {step === 1 && <span className="w-0.5 h-4 bg-primary animate-pulse ml-1" />}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold">Resume (PDF)</label>
              <div className="h-9 border border-dashed rounded-md flex items-center justify-center text-xs text-muted-foreground bg-muted/20 relative overflow-hidden">
                {step >= 2 ? (
                  <div className="flex items-center gap-2 text-foreground font-medium bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded w-full h-full justify-center">
                    <FileText className="w-4 h-4" />
                    example_resume.pdf
                  </div>
                ) : (
                  "Upload Resume"
                )}
              </div>
            </div>

            <div className={`mt-6 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium transition-transform ${step === 2 ? 'scale-[0.98] brightness-90' : ''}`}>
              Run Review <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>

        {/* AI Agent & Results Container */}
        <div className={`transition-all duration-500 absolute inset-0 p-6 flex flex-col gap-4 ${step >= 3 && step < 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          
          {/* AI Agent State */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm shrink-0">
            <div className="flex w-full items-center gap-3 px-4 py-3 bg-muted/30">
              <Sparkles className={`h-5 w-5 text-primary ${step === 3 || step === 4 ? 'animate-pulse' : ''}`} />
              <p className="text-sm font-medium flex-1">
                {step >= 5 ? 'AI Review Complete' : 'AI Agent thinking...'}
              </p>
            </div>
            
            <div className={`px-4 pb-4 pt-2 border-t text-xs space-y-3 transition-all duration-500 overflow-hidden ${step >= 4 ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0 py-0'}`}>
              <div className="flex items-center gap-2">
                 <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                 <span className="text-muted-foreground">Verified portfolio data</span>
              </div>
              <div className="flex items-center gap-2">
                 <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                 <span className="text-muted-foreground">Parsed resume PDF content</span>
              </div>
              <div className="flex items-center gap-2">
                 {step === 4 ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                 <span className={step === 4 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                   Generating AI insights...
                 </span>
              </div>
            </div>
          </div>

          {/* Results State */}
          <div className={`transition-all duration-700 overflow-hidden shrink-0 ${step >= 5 ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
            <div className="rounded-xl border bg-gradient-to-b from-green-500/10 to-transparent p-4 flex flex-col items-center justify-center text-center h-full">
               <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Overall Score</p>
               <p className="text-4xl font-bold text-green-600 mb-2">85<span className="text-xl text-green-600/50">/100</span></p>
               <p className="text-xs text-muted-foreground">Top 15% of candidates</p>
               <div className="w-full mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                 <div className="h-full bg-green-500 rounded-full w-[85%] animate-[pulse_2s_ease-in-out_infinite]" />
               </div>
            </div>
          </div>
        </div>

        {/* Virtual Cursor */}
        <div 
          className="absolute w-5 h-5 transition-all duration-700 z-50 pointer-events-none"
          style={{
            top: step === 0 ? '90%' : step === 1 ? '15%' : step === 2 ? '57%' : '100%',
            left: step === 0 ? '90%' : step === 1 ? '30%' : step === 2 ? '50%' : '50%',
            opacity: step < 3 ? 1 : 0
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.5 3.21V20.8C5.5 21.45 6.27 21.76 6.7 21.27L11.5 15.83H18.2C18.84 15.83 19.16 15.06 18.72 14.59L6.11 2.87C5.66 2.45 5.5 2.76 5.5 3.21Z" fill="black" stroke="white" strokeWidth="2"/>
          </svg>
        </div>

      </div>
    </div>
  )
}
