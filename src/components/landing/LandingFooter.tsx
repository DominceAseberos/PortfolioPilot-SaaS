import Link from 'next/link'
import { ROUTES } from '@/constants'

export function LandingFooter() {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} PortfolioPilot. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href={ROUTES.login} className="text-muted-foreground hover:text-foreground text-sm">
              Sign In
            </Link>
            <Link href={ROUTES.register} className="text-muted-foreground hover:text-foreground text-sm">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
