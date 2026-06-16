'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import { authService } from '@/features/auth/services/auth.service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { LogOut, Settings, CreditCard, LayoutDashboard, User as UserIcon, History, Coins } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { ROUTES } from '@/constants'
import { INITIAL_FREE_TOKENS } from '@/config/pricing'

export function DashboardHeader() {
  const { user, isAuthenticated } = useAuth()
  const credits = useCredits(user?.id)
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await authService.signOut()
      toast.success('Signed out successfully')
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('Failed to sign out')
      setIsSigningOut(false)
    }
  }

  const initials = user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 sm:px-8">
      <Link href="/" className="font-bold text-xl tracking-tight hover:text-primary transition-colors flex items-center gap-2">
        PortfolioPilot
      </Link>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 focus:outline-none hover:bg-muted/50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-border/50"
            >
              <div className="flex items-center gap-2 mr-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">{credits !== null ? credits : INITIAL_FREE_TOKENS}</span>
              </div>
              <Avatar size="sm" className="ring-2 ring-transparent ring-offset-2 hover:ring-primary/20 transition-all">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || ''} />
                <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border/50 bg-popover text-popover-foreground shadow-lg shadow-black/5 outline-none animate-in fade-in zoom-in-95 duration-200 z-50 overflow-hidden">
                <div className="flex flex-col p-2 space-y-1">
                  <Link href={ROUTES.account} onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    Dashboard
                  </Link>
                  <Link href={ROUTES.history} onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    <History className="h-4 w-4 text-muted-foreground" />
                    History
                  </Link>
                  <Link href={ROUTES.settings} onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                  <Link href="/account/accounts" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    Accounts
                  </Link>
                  <Link href={ROUTES.billing} onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Billing
                  </Link>
                  <div className="h-px bg-border/50 my-1 mx-1" />
                  <button 
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {isSigningOut ? 'Signing out...' : 'Log out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </header>
  )
}
