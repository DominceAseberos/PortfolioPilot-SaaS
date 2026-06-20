'use client'

import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'

interface UpdateProfileFormProps {
  initialName: string
  email: string
}

export function UpdateProfileForm({ initialName, email }: UpdateProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    if (name === initialName) {
      toast.info('No changes to save')
      return
    }

    setIsUpdating(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() }
      })
      if (error) throw error

      toast.success('Profile updated successfully!')
      router.refresh()
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Full Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-muted/30 rounded-xl border border-border/50 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="Enter your full name"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Email Address</label>
          <div className="p-3 bg-muted/30 rounded-xl border border-border/50 font-medium flex items-center justify-between opacity-80 cursor-not-allowed" title="Email address cannot be changed here">
            {email}
            <Shield className="h-4 w-4 text-green-500" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button 
          variant="default" 
          className="rounded-xl px-6 font-semibold shadow-sm"
          onClick={handleUpdate}
          isLoading={isUpdating}
          disabled={name === initialName}
        >
          Update Profile
        </Button>
      </div>
    </div>
  )
}
