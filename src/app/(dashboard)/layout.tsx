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
            <Link href={ROUTES.dashboard} className="font-bold text-lg">
              PortfolioPilot
            </Link>
          </div>
          <DashboardNav />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
