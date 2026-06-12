import Link from 'next/link'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/constants'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingFeatures } from '@/components/landing/LandingFeatures'
import { LandingPricing } from '@/components/landing/LandingPricing'
import { LandingFooter } from '@/components/landing/LandingFooter'

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 items-center border-b border-border/40 bg-background/60 backdrop-blur-md px-6 w-full">
        <div className="container mx-auto flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-8">
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              PortfolioPilot
            </span>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href={ROUTES.login} className="hidden sm:block">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </span>
            </Link>
            <Link href="/dashboard/reviews">
              <Button size="sm" className="rounded-full px-5 font-bold shadow-sm hover:shadow-md transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingFooter />
    </>
  )
}
