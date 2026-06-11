'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/features/auth/services/auth.service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/common/Sheet'
import { DashboardNav } from './DashboardNav'

export function DashboardHeader() {
  const { user } = useAuth()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await authService.signOut()
      router.push('/login')
      router.refresh()
    } catch {
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
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-14 items-center border-b px-6 font-bold text-lg">
            PortfolioPilot
          </div>
          <DashboardNav />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{user?.email}</p>
        </div>
        <Avatar size="sm">
          <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || ''} />
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
      </div>
    </header>
  )
}
