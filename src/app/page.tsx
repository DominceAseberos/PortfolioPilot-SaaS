import { LandingHero } from '@/components/landing/LandingHero'
import { LandingFeatures } from '@/components/landing/LandingFeatures'
import { LandingPricing } from '@/components/landing/LandingPricing'
import { LandingFooter } from '@/components/landing/LandingFooter'

export default function Home() {
  return (
    <>
      <header className="flex h-14 items-center border-b bg-card px-6">
        <div className="container mx-auto flex items-center justify-between">
          <span className="font-bold text-lg">PortfolioPilot</span>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a>
          </nav>
        </div>
      </header>
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingFooter />
    </>
  )
}
