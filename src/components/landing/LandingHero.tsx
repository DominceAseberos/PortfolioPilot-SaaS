import Link from 'next/link'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/constants'
import { ArrowRight, BarChart3, FileSearch, GitBranch, Sparkles } from 'lucide-react'
import { HeroAnimation } from './HeroAnimation'
import { ScrollReveal } from '@/components/common/ScrollReveal'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      
      {/* Fluid Mesh Background Engine (High-Performance Architecture) */}
      <div className="absolute inset-0 -z-10 bg-background overflow-hidden">
        {/* Subtle dot grid for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
        
        {/* High-Performance Radial Mesh (Zero Blur Filters) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] opacity-80 dark:opacity-60 pointer-events-none mix-blend-normal dark:mix-blend-screen z-0">
          
          {/* Orb 1: Deep Blue (Top Left) */}
          <div className="absolute -top-40 -left-20 w-[700px] h-[700px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.35)_0%,transparent_60%)] animate-[pulse_8s_ease-in-out_infinite]" />
          
          {/* Orb 2: Rich Purple (Bottom Right) */}
          <div className="absolute -bottom-40 -right-20 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.25)_0%,transparent_60%)] animate-[pulse_12s_ease-in-out_infinite_reverse]" />
          
          {/* Orb 3: Cyan (Center) */}
          <div className="absolute top-10 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.25)_0%,transparent_60%)] animate-[pulse_10s_ease-in-out_infinite]" style={{ animationDelay: '3s' }} />
          
        </div>
        
        {/* Floor gradient fade to prevent sharp cutoff at section bottom */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>
      <div className="container mx-auto px-4">
        
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="max-w-2xl text-left flex flex-col items-start">
            <ScrollReveal animation="fade-up" delay={100}>
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-border/50 bg-muted/20 px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-foreground/80 tracking-tight">Available instantly without account</span>
              </div>
            </ScrollReveal>
            
            <ScrollReveal animation="fade-up" delay={200}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-left">
                Get Recruiter-Style Feedback
                <span className="text-primary block">Before You Apply</span>
              </h1>
            </ScrollReveal>
            
            <ScrollReveal animation="fade-up" delay={300}>
              <p className="text-muted-foreground mt-6 text-lg leading-relaxed text-left">
                Upload your portfolio, GitHub profile, and resume. Receive structured evaluations 
                with actionable insights to improve your chances of landing your dream role.
              </p>
            </ScrollReveal>
            
            <ScrollReveal animation="fade-up" delay={400} className="w-full">
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-start">
                <Link href="/dashboard/reviews">
                  <Button size="lg" className="group relative w-full sm:w-auto overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.4)]">
                    <span className="relative z-10 flex items-center">
                      Try Now
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </span>
                    {/* Subtle shine sweep */}
                    <div className="absolute inset-0 z-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
                  </Button>
                </Link>
                <Link href={ROUTES.login}>
                  <Button variant="outline" size="lg" className="group w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:bg-muted/50 hover:shadow-lg">
                    Sign In
                  </Button>
                </Link>
              </div>
              <p className="text-muted-foreground mt-4 text-sm text-left">
                No credit card required. Free plan includes 1 review per month.
              </p>
            </ScrollReveal>
          </div>
          
          <ScrollReveal animation="fade-in" delay={500} duration={1200} className="w-full">
             <HeroAnimation />
          </ScrollReveal>
        </div>

      </div>
    </section>
  )
}
