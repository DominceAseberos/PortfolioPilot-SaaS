'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Badge } from '@/components/common/Badge'
import { ScoreBadge } from '@/components/common/ScoreBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate } from '@/lib/utils'
import { Loader2, Upload } from 'lucide-react'

interface Review {
  id: string
  portfolio_url: string | null
  github_username: string | null
  resume_url: string | null
  overall_score: number | null
  portfolio_score: number | null
  github_score: number | null
  resume_score: number | null
  created_at: string
}

interface ReviewsPageClientProps {
  reviews: Review[]
}

export function ReviewsPageClient({ reviews }: ReviewsPageClientProps) {
  const router = useRouter()
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      if (portfolioUrl) formData.append('portfolioUrl', portfolioUrl)
      if (githubUsername) formData.append('githubUsername', githubUsername)
      if (resumeFile) formData.append('resume', resumeFile)

      const res = await fetch('/api/reviews', { method: 'POST', body: formData })
      const json = await res.json()

      if (!json.success) {
        setError(json.message || 'Failed to create review')
      } else {
        setPortfolioUrl('')
        setGithubUsername('')
        setResumeFile(null)
        router.refresh()
      }
    } catch {
      setError('Failed to create review. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground text-sm">Create and manage your portfolio reviews</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Review</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Portfolio URL"
              placeholder="https://your-portfolio.com"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
            />
            <Input
              label="GitHub Username"
              placeholder="your-github-username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium">Resume (PDF)</label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {resumeFile ? resumeFile.name : 'Upload Resume'}
                </Button>
                {resumeFile && (
                  <button
                    type="button"
                    onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" isLoading={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Review
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review History</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description="Run your first review above to get started."
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Review from {formatDate(review.created_at)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {review.portfolio_url && (
                        <Badge variant="outline" className="text-xs">
                          Portfolio: {Math.round(review.portfolio_score || 0)}
                        </Badge>
                      )}
                      {review.github_username && (
                        <Badge variant="outline" className="text-xs">
                          GitHub: {Math.round(review.github_score || 0)}
                        </Badge>
                      )}
                      {review.resume_url && (
                        <Badge variant="outline" className="text-xs">
                          Resume: {Math.round(review.resume_score || 0)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ScoreBadge score={review.overall_score} size="sm" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
