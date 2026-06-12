'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/features/auth/services/auth.service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/common/Sheet'
import { DashboardNav } from './DashboardNav'
import { toast } from 'sonner'

export function DashboardHeader() {
  const { user } = useAuth()
  const router = useRouter()
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

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col h-full">
          <div className="flex h-14 items-center border-b px-6 font-bold text-lg">
            <Link href="/" className="hover:text-primary transition-colors">PortfolioPilot</Link>
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
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <Avatar size="sm">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              isLoading={isSigningOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>
              Log in
            </Button>
            <Button size="sm" onClick={() => router.push('/register')}>
              Sign up
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
