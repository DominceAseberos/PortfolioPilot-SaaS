'use client'
import { BarChart3, FileSearch, GitBranch, Shield, TrendingUp, CheckCircle2 } from 'lucide-react'
import { ScrollReveal } from '@/components/common/ScrollReveal'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

function CenterTrigger({ children, className }: { children: React.ReactNode, className?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentRef = ref.current
    if (!currentRef) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.8 }
    )
    observer.observe(currentRef)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn(className, isVisible && 'is-centered')}>
      {children}
    </div>
  )
}

export function LandingFeatures() {
  return (
    <section id="features" className="relative py-32 bg-muted/30 overflow-hidden border-t">
      {/* Premium ambient glow instead of a messy circle */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal animation="blur-in" duration={1000}>
          <div className="mx-auto max-w-3xl text-center mb-24 relative">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-8 leading-[1.1] flex flex-col items-center gap-4">
              <span className="text-foreground">The Ultimate Recruiter</span>
              
              {/* The Infinity Laser Pill */}
              <div className="relative group mt-4">
                {/* Ambient Breathing Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                
                <div className="relative flex items-center justify-center px-10 py-4 rounded-full overflow-hidden bg-background border border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
                  {/* Spinning Laser Border effect */}
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(59,130,246,0.8)_360deg)]" />
                  </div>
                  
                  {/* Inner Core Mask (Solid to prevent inner radar bleed) */}
                  <div className="absolute inset-[2px] rounded-full bg-white dark:bg-slate-950" />
                  
                  {/* Typography */}
                  <span className="relative z-10 text-blue-600 dark:text-blue-400 font-black tracking-[0.2em] uppercase text-2xl md:text-3xl drop-shadow-sm">
                    Cheat Sheet
                  </span>
                </div>
              </div>

            </h2>
            <p className="text-foreground/80 text-lg md:text-[1.15rem] leading-relaxed max-w-2xl mx-auto font-medium relative z-10">
              We reverse-engineered the hiring process. Stop guessing what recruiters want—our orchestration engine analyzes every pixel, commit, and bullet point.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto auto-rows-[300px]">
          
          {/* Bento Box 1: Large Feature (Portfolio) */}
          <ScrollReveal animation="fade-up" delay={100} className="md:col-span-2 md:row-span-2">
            <CenterTrigger className="h-full rounded-3xl bg-card border shadow-sm overflow-hidden relative group transition-all duration-500 [.is-centered]:shadow-xl [.is-centered]:border-blue-500/30">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-[.is-centered]:opacity-100 transition-opacity duration-500" />
               <div className="p-8 md:p-12 h-full flex flex-col relative z-10">
                  <div className="bg-blue-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-[.is-centered]:scale-110 duration-500">
                     <FileSearch className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="mt-auto md:mt-0">
                     <h3 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Deep Portfolio Analysis</h3>
                     <p className="text-foreground/80 text-lg md:text-xl max-w-md leading-relaxed font-medium">
                       We don't just look at text. Our vision models evaluate layout, responsiveness, color contrast, and UX/UI patterns against top-tier tech industry standards.
                     </p>
                  </div>
               </div>
               {/* Abstract Graphic */}
               <div className="absolute -right-20 -bottom-20 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl group-[.is-centered]:bg-blue-500/10 transition-colors duration-700" />
               <div className="hidden md:block absolute right-0 bottom-0 p-8 translate-x-12 translate-y-12 group-[.is-centered]:translate-x-4 group-[.is-centered]:-translate-y-4 transition-transform duration-700 ease-out">
                 <div className="w-72 h-56 rounded-2xl border-2 border-blue-500/10 bg-background shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] p-5 flex flex-col gap-4 relative">
                    
                    {/* Floating Scanning Badge */}
                    <div className="absolute -top-4 -left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5 opacity-0 group-[.is-centered]:opacity-100 transition-opacity duration-700 delay-300 z-20">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Scanning UX...
                    </div>

                    {/* Mock Image Box */}
                    <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden relative border border-border/50 group-[.is-centered]:border-blue-500/40 transition-colors duration-700">
                      {/* Scanner sweep */}
                      <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-blue-500/20 to-transparent translate-y-full group-[.is-centered]:translate-y-0 transition-transform duration-[1500ms] ease-out" />
                      
                      {/* Computer Vision Bounding Boxes */}
                      <div className="absolute top-4 left-4 w-16 h-12 border-2 border-blue-500/0 group-[.is-centered]:border-blue-500/80 rounded transition-colors duration-500 delay-500" />
                      <div className="absolute bottom-4 right-6 w-20 h-6 border-2 border-emerald-500/0 group-[.is-centered]:border-emerald-500/80 rounded transition-colors duration-500 delay-[800ms]" />
                    </div>
                    
                    {/* Animated Progress Bars */}
                    <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500/60 w-0 group-[.is-centered]:w-full transition-all duration-1000 delay-500 ease-out" />
                    </div>
                    <div className="w-1/2 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-300 dark:bg-slate-500 w-0 group-[.is-centered]:w-full transition-all duration-1000 delay-[800ms] ease-out" />
                    </div>
                 </div>
               </div>
            </CenterTrigger>
          </ScrollReveal>

          {/* Bento Box 2: GitHub (Tall/Square) */}
          <ScrollReveal animation="fade-up" delay={200} className="md:col-span-1 md:row-span-1">
            <CenterTrigger className="h-full rounded-3xl bg-card border shadow-sm overflow-hidden relative group transition-all duration-500 [.is-centered]:shadow-xl [.is-centered]:border-purple-500/30">
               <div className="p-8 h-full flex flex-col relative z-10">
                  <div className="bg-purple-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-auto transition-transform group-[.is-centered]:rotate-12 duration-500">
                     <GitBranch className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold mt-8 mb-3">GitHub Mastery</h3>
                  <p className="text-foreground/80 text-[1.05rem] leading-relaxed font-medium">
                    Analyzes commit frequency, repository quality, and README formatting.
                  </p>
               </div>
               <div className="absolute bottom-0 right-0 p-6 opacity-0 group-[.is-centered]:opacity-100 transition-all duration-700 pointer-events-none translate-y-8 translate-x-8 group-[.is-centered]:translate-y-4 group-[.is-centered]:translate-x-4">
                  <GitBranch className="w-32 h-32 text-purple-500/15 dark:text-purple-500/20" />
               </div>
            </CenterTrigger>
          </ScrollReveal>

          {/* Bento Box 3: Resume Scoring */}
          <ScrollReveal animation="fade-up" delay={300} className="md:col-span-1 md:row-span-1">
            <CenterTrigger className="h-full rounded-3xl bg-card border shadow-sm overflow-hidden relative group transition-all duration-500 [.is-centered]:shadow-xl [.is-centered]:border-emerald-500/30">
               <div className="p-8 h-full flex flex-col relative z-10">
                  <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-auto transition-transform group-[.is-centered]:scale-110 duration-500">
                     <BarChart3 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold mt-8 mb-3">ATS Resume Scoring</h3>
                  <p className="text-foreground/80 text-[1.05rem] leading-relaxed font-medium">
                    We verify keyword alignment and formatting to bypass ATS robots effortlessly.
                  </p>
               </div>
               <div className="absolute bottom-0 right-0 p-6 opacity-0 group-[.is-centered]:opacity-100 transition-all duration-700 pointer-events-none translate-y-8 translate-x-8 group-[.is-centered]:translate-y-4 group-[.is-centered]:translate-x-4">
                  <BarChart3 className="w-32 h-32 text-emerald-500/15 dark:text-emerald-500/20" />
               </div>
            </CenterTrigger>
          </ScrollReveal>

          {/* Bento Box 4: Actionable Insights (Wide) */}
          <ScrollReveal animation="fade-up" delay={400} className="md:col-span-2 md:row-span-1">
            <CenterTrigger className="h-full rounded-3xl bg-card border shadow-sm overflow-hidden relative group flex items-center transition-all duration-500 [.is-centered]:shadow-xl [.is-centered]:border-amber-500/30">
               <div className="p-8 md:p-12 z-10 w-full md:w-1/2">
                  <div className="bg-amber-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                     <Shield className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 tracking-tight">Zero Fluff, Only Action</h3>
                  <p className="text-foreground/80 text-lg leading-relaxed font-medium">
                    Stop wondering what to fix. We give you a prioritized checklist of EXACTLY what needs to change to get the interview.
                  </p>
               </div>
               <div className="hidden md:flex w-1/2 h-full items-center justify-center p-8 relative">
                 <div className="absolute inset-0 bg-gradient-to-r from-card via-card/50 to-transparent z-0 pointer-events-none" />
                 <div className="w-full flex flex-col gap-5 pl-12 opacity-0 group-[.is-centered]:opacity-100 transition-all duration-700 translate-x-8 group-[.is-centered]:translate-x-0 relative z-20">
                   <div className="h-16 w-full bg-white dark:bg-slate-900 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] rounded-2xl flex items-center px-6 gap-4 border border-slate-200 dark:border-slate-800">
                     <CheckCircle2 className="w-7 h-7 text-amber-500 shrink-0" />
                     <div className="flex flex-col gap-2 w-full">
                       <div className="h-2.5 w-full bg-slate-300 dark:bg-slate-600 rounded-full" />
                       <div className="h-2 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-full" />
                     </div>
                   </div>
                   <div className="h-16 w-[90%] bg-white dark:bg-slate-900 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] rounded-2xl flex items-center px-6 gap-4 border border-slate-200 dark:border-slate-800 translate-x-6">
                     <CheckCircle2 className="w-7 h-7 text-amber-500 shrink-0" />
                     <div className="flex flex-col gap-2 w-full">
                       <div className="h-2.5 w-4/5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                       <div className="h-2 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full" />
                     </div>
                   </div>
                 </div>
               </div>
            </CenterTrigger>
          </ScrollReveal>

          {/* Bento Box 5: Score Trends */}
          <ScrollReveal animation="fade-up" delay={500} className="md:col-span-1 md:row-span-1">
            <CenterTrigger className="h-full rounded-3xl bg-card border shadow-sm overflow-hidden relative group transition-all duration-500 [.is-centered]:shadow-xl [.is-centered]:border-rose-500/30">
               <div className="p-8 h-full flex flex-col relative z-10">
                  <div className="bg-rose-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-auto">
                     <TrendingUp className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-bold mt-8 mb-3">Track Growth</h3>
                  <p className="text-foreground/80 text-[1.05rem] leading-relaxed font-medium">
                    Watch your overall candidate score improve over time.
                  </p>
               </div>
               <div className="absolute bottom-0 right-0 p-6 opacity-0 group-[.is-centered]:opacity-100 transition-all duration-700 pointer-events-none translate-y-8 translate-x-8 group-[.is-centered]:translate-y-4 group-[.is-centered]:translate-x-4">
                  <TrendingUp className="w-32 h-32 text-rose-500/15 dark:text-rose-500/20" />
               </div>
            </CenterTrigger>
          </ScrollReveal>

        </div>
      </div>
    </section>
  )
}
