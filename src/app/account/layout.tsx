import Link from 'next/link'
import { LayoutDashboard, Settings, User as UserIcon, CreditCard, LogOut } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r bg-card hidden md:block">
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-auto py-4">
              <nav className="grid items-start px-4 text-sm font-medium gap-1">
                <Link href="/account" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link href="/account/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <Link href="/account/accounts" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <UserIcon className="h-4 w-4" />
                  Accounts
                </Link>
                <Link href="/account/billing" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </Link>
              </nav>
            </div>
            <div className="p-4 border-t border-border/50 bg-muted/10">
              <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <LogOut className="h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
