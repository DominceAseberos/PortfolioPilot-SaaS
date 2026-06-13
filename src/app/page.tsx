import Link from 'next/link'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/constants'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingFeatures } from '@/components/landing/LandingFeatures'
import { LandingPricing } from '@/components/landing/LandingPricing'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingHeader } from '@/components/landing/LandingHeader'

export default function Home() {
  return (
    <>
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingFooter />
    </>
  )
}
