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
import { INITIAL_FREE_TOKENS, CLAIM_BONUS_CREDITS } from '@/config/pricing'
import { cn } from '@/lib/utils'

export function DashboardHeader() {
  const { user, isAuthenticated } = useAuth()
  const { credits, hasClaimed } = useCredits(user?.id)
  const router = useRouter()
  const [isClaiming, setIsClaiming] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

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

  const currentCredits = credits !== null ? credits : INITIAL_FREE_TOKENS
  const showClaim = isAuthenticated ? !hasClaimed : true

  const handleClaimCredits = async () => {
    if (!isAuthenticated) {
      router.push(`${ROUTES.login}?claim=true`)
    } else if (!hasClaimed) {
      setIsClaiming(true)
      try {
        const res = await fetch('/api/user/claim-credits', { method: 'POST' })
        if (res.ok) {
           toast.success(`Successfully claimed ${CLAIM_BONUS_CREDITS} credits!`)
           router.refresh()
        } else {
           toast.error('Failed to claim credits')
        }
      } catch {
        toast.error('Failed to claim credits')
      } finally {
        setIsClaiming(false)
      }
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 sm:px-8">
      <Link href="/" className="font-bold text-xl tracking-tight hover:text-primary transition-colors flex items-center gap-2">
        PortfolioPilot
      </Link>

      <div className="flex items-center gap-3">
        {/* Credit Dropdown */}
        <div className="relative group">
          <button
            className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-all focus:outline-none cursor-default"
          >
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-primary">
              {currentCredits} Credit{currentCredits === 1 ? '' : 's'}
            </span>
          </button>
          
          <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="w-48 rounded-xl border border-border/50 bg-popover text-popover-foreground shadow-lg shadow-black/5 outline-none overflow-hidden">
              <div className="flex flex-col p-2 space-y-1">
                {showClaim && (
                  <button 
                    onClick={handleClaimCredits}
                    disabled={isClaiming}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left"
                  >
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    {isClaiming ? 'Claiming...' : `Claim ${CLAIM_BONUS_CREDITS} Credits`}
                  </button>
                )}
                <Link href={ROUTES.billing} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Top Up
                </Link>
              </div>
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="relative group">
            <button 
              className="flex items-center gap-2 focus:outline-none hover:bg-muted/50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-border/50"
            >
              <Avatar size="sm" className="ring-2 ring-transparent ring-offset-2 hover:ring-primary/20 transition-all">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || ''} />
                <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
              </div>
            </button>

            <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="w-56 rounded-xl border border-border/50 bg-popover text-popover-foreground shadow-lg shadow-black/5 outline-none overflow-hidden">
                <div className="flex flex-col p-2 space-y-1">
                  <Link href={ROUTES.reviews} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    New Review
                  </Link>
                  <Link href={ROUTES.settings} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                  <Link href="/account/accounts" className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    Accounts
                  </Link>
                  <Link href={ROUTES.billing} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
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
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href={ROUTES.login} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2 ml-2">
              Sign In
            </Link>
            <Link href={ROUTES.register}>
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
