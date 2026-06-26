'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import { authService } from '@/features/auth/services/auth.service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/common/Avatar'
import { LogOut, Settings, CreditCard, LayoutDashboard, User as UserIcon, Coins } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { INITIAL_FREE_TOKENS, CLAIM_BONUS_CREDITS } from '@/config/pricing'
import { cn } from '@/lib/utils'

export function LandingHeader() {
  const { user, isAuthenticated } = useAuth()
  const { credits, hasClaimed } = useCredits(user?.id)
  const router = useRouter()
  const [isClaiming, setIsClaiming] = useState(false)
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
    <header className="sticky top-0 z-50 flex h-16 items-center border-b border-border/40 bg-background/60 backdrop-blur-md px-6 w-full">
      <div className="container mx-auto flex items-center justify-between max-w-6xl">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-black text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            PortfolioPilot
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Reusable Credit Pill */}
          <button
            onClick={showClaim ? handleClaimCredits : undefined}
            disabled={isClaiming}
            className={cn(
              "group relative overflow-hidden px-3 py-1.5 rounded-full border transition-all duration-300 hidden sm:flex items-center justify-center min-w-[100px]",
              showClaim 
                ? "bg-primary/10 border-primary/20 hover:bg-primary hover:border-primary cursor-pointer hover:shadow-md hover:scale-105" 
                : "bg-primary/10 border-primary/20 cursor-default"
            )}
          >
            {/* Default State */}
            <div className={cn(
              "flex items-center gap-2 transition-all duration-300 absolute inset-0 justify-center", 
              showClaim ? "group-hover:-translate-y-full group-hover:opacity-0" : ""
            )}>
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-primary">
                {currentCredits} Credit{currentCredits === 1 ? '' : 's'}
              </span>
            </div>
            
            {/* Hover State (Claim) */}
            {showClaim && (
              <div className="flex items-center gap-1 transition-all duration-300 absolute inset-0 justify-center translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                <span className="text-sm font-bold text-primary-foreground whitespace-nowrap">
                  {isClaiming ? 'Claiming...' : `Claim ${CLAIM_BONUS_CREDITS} Credits`}
                </span>
              </div>
            )}
            
            {/* Invisible spacer to maintain button width */}
            <div className="opacity-0 flex items-center gap-2 pointer-events-none">
               {showClaim ? <span className="text-sm font-bold whitespace-nowrap">Claim {CLAIM_BONUS_CREDITS} Credits</span> : <span className="text-sm font-bold whitespace-nowrap">{currentCredits} Credits</span>}
            </div>
          </button>

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border/50 bg-popover text-popover-foreground shadow-lg shadow-black/5 outline-none animate-in fade-in zoom-in-95 duration-200 z-50 overflow-hidden">
                  <div className="flex flex-col p-2 space-y-1">
                    <Link href={ROUTES.reviews} onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                      <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                      New Review
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
            <div className="flex items-center gap-2">
              <Link href={ROUTES.login} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2 ml-2">
                  Sign In
                </Link>
              <Link href="/dashboard/reviews">
                <Button size="sm" className="rounded-full px-5 font-bold shadow-sm hover:shadow-md transition-all">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
