'use client'

import Link from 'next/link'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/constants'
import { ArrowRight, Settings } from 'lucide-react'
import { HeroAnimation } from './HeroAnimation'
import { ScrollReveal } from '@/components/common/ScrollReveal'
import { useAuth } from '@/hooks/useAuth'

export function LandingHero() {
  const { isAuthenticated } = useAuth()

  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      
      {/* Fluid Mesh Background Engine */}
      <div className="absolute inset-0 -z-10 bg-background overflow-hidden pointer-events-none">
        {/* Subtle dot grid for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
        
        {/* Ambient Morphing Blobs */}
        <div className="absolute inset-0 w-full h-full mix-blend-multiply dark:mix-blend-screen z-0 opacity-80">
          {/* Blue Blob starts Top Left */}
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] min-w-[500px] min-h-[500px] bg-gradient-to-tr from-blue-500/50 via-cyan-400/40 to-purple-500/50 animate-[float-around_40s_ease-in-out_infinite] rounded-full blur-[100px]" />
          
          {/* Emerald Blob starts Bottom Right */}
          <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] bg-gradient-to-bl from-emerald-400/40 to-blue-600/50 animate-[float-around-reverse_50s_ease-in-out_infinite] rounded-full blur-[100px]" />
        </div>
      </div>

      {/* Floor gradient fade to prevent sharp cutoff at section bottom */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent -z-10 pointer-events-none" />
      <div className="container mx-auto px-4">

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="max-w-2xl text-left flex flex-col items-start">
            <ScrollReveal animation="fade-up" delay={100} initialVisible>
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-border/50 bg-muted/20 px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-foreground/80 tracking-tight">The Ultimate Tech Recruiter AI</span>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={200} initialVisible>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-left">
                Get Recruiter-Style Feedback
                <span className="text-blue-600 block">Instantly</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={300} initialVisible>
              <p className="text-muted-foreground mt-6 text-lg leading-relaxed text-left max-w-xl">
                Upload your portfolio, GitHub profile, or resume to get an actionable, top-tier technical assessment before you even apply.
              </p>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={400} className="w-full" initialVisible>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-start">
                <Link href="/dashboard/reviews">
                  <Button size="lg" className="group relative w-full sm:w-auto overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.6)]">
                    <span className="relative z-10 flex items-center">
                      {isAuthenticated ? 'Go to Dashboard' : 'Analyze Now'}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </span>
                    {/* Subtle shine sweep */}
                    <div className="absolute inset-0 z-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
                  </Button>
                </Link>
                {!isAuthenticated ? (
                  <Link href={ROUTES.login}>
                    <Button variant="outline" size="lg" className="group w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:bg-muted/50 hover:shadow-lg font-bold">
                      Sign In
                    </Button>
                  </Link>
                ) : (
                  <Link href="/account/settings">
                    <Button variant="outline" size="lg" className="group w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:bg-muted/50 hover:shadow-lg font-bold flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Account Settings
                    </Button>
                  </Link>
                )}
              </div>
              <p className="text-muted-foreground mt-4 text-sm text-left font-medium">
                {isAuthenticated ? 'Logged in and ready to analyze your developer profiles.' : 'No credit card required. Start with a free guest pass.'}
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-in" delay={500} duration={1200} className="w-full" initialVisible>
            <HeroAnimation />
          </ScrollReveal>
        </div>

      </div>
    </section>
  )
}
