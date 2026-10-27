'use client'

import { ReactLenis } from 'lenis/react'
import { usePathname } from 'next/navigation'

export function SmoothScrolling({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboardOrAccount = pathname?.startsWith('/dashboard') || pathname?.startsWith('/account')

  // Disable Lenis on dashboard and account views to allow native, silky mouse-wheel rolling
  if (isDashboardOrAccount) {
    return <>{children}</>
  }

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      {children}
    </ReactLenis>
  )
}
