'use client'

import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function SettingsActions() {
  const router = useRouter()
  
  // Modals state
  const [showClearModal, setShowClearModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Loading states
  const [isClearing, setIsClearing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Validation
  const [deleteInput, setDeleteInput] = useState('')

  const handleClearHistory = async () => {
    setIsClearing(true)
    try {
      const res = await fetch('/api/user/clear-history', { method: 'DELETE' })
      const data = await res.json()
      
      if (res.ok) {
        toast.success('History cleared successfully')
        setShowClearModal(false)
        router.refresh()
      } else {
        toast.error(data.error || 'Failed to clear history')
      }
    } catch (error) {
      toast.error('Network error')
    }
    setIsClearing(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return
    
    setIsDeleting(true)
    try {
      const res = await fetch('/api/user/delete-account', { method: 'DELETE' })
      const data = await res.json()
      
      if (res.ok) {
        toast.success('Account deleted successfully')
        // The API logs out the user, just redirect to home
        window.location.href = '/'
      } else {
        toast.error(data.error || 'Failed to delete account')
        setIsDeleting(false)
      }
    } catch (error) {
      toast.error('Network error')
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Data & Privacy Section */}
      <section className="space-y-4 pt-6 border-t border-border/50">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" /> Data & Privacy
        </h2>
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-foreground">Clear Analysis History</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete all of your past portfolio, GitHub, and resume reviews. This cannot be undone.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowClearModal(true)}
              className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 border-amber-500/20 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Clear History
            </Button>
          </div>
        </div>
      </section>

      {/* Danger Zone Section */}
      <section className="space-y-4 pt-6 border-t border-border/50">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-5 w-5" /> Danger Zone
        </h2>
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-red-600 dark:text-red-400">Delete Account</h3>
              <p className="text-sm text-red-600/70 dark:text-red-400/70 mt-1">
                Permanently delete your account and all associated data. This action is irreversible.
              </p>
            </div>
            <Button 
              variant="default" 
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-500 hover:bg-red-600 text-white whitespace-nowrap shadow-md shadow-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </Button>
          </div>
        </div>
      </section>

      {/* Modals */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold">Clear All History?</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete all of your past analysis history? Your credits will not be affected, but all past reviews and generated resumes will be permanently erased.
              </p>
            </div>
            <div className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowClearModal(false)} disabled={isClearing}>
                Cancel
              </Button>
              <Button 
                onClick={handleClearHistory} 
                disabled={isClearing}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isClearing ? 'Clearing...' : 'Yes, clear history'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold">Delete Account</h3>
              <p className="text-sm text-muted-foreground">
                This action is <strong>permanent</strong> and cannot be undone. All your data, history, and remaining credits will be wiped immediately.
              </p>
              
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium">
                  Type <span className="font-mono text-red-500 font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="DELETE"
                />
              </div>
            </div>
            <div className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowDeleteModal(false)
                setDeleteInput('')
              }} disabled={isDeleting}>
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteAccount} 
                disabled={isDeleting || deleteInput !== 'DELETE'}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
