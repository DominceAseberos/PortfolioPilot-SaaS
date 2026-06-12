import Link from 'next/link'
import { ROUTES } from '@/constants'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-6">
            <Link href="/" className="font-bold text-lg hover:text-primary transition-colors">
              PortfolioPilot
            </Link>
          </div>
          <div className="flex-1 overflow-auto">
            <DashboardNav />
          </div>
          <div className="p-4 border-t border-border/50 bg-muted/10">
            <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col h-screen overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
