import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number | null | undefined
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ScoreBadge({ score, label, size = 'md', className }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-4 py-2',
  }

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <span
        className={cn(
          'rounded-full font-semibold',
          sizeClasses[size],
          score === null || score === undefined
            ? 'bg-gray-100 text-gray-500'
            : score >= 80
            ? 'bg-green-100 text-green-800'
            : score >= 60
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        )}
      >
        {score === null || score === undefined ? 'N/A' : `${Math.round(score)}/100`}
      </span>
    </div>
  )
}

export function ScoreBar({ score, className }: { score: number | null | undefined; className?: string }) {
  const percentage = score !== null && score !== undefined ? Math.min(Math.max(score, 0), 100) : 0
  return (
    <div className={cn('h-2 w-full rounded-full bg-gray-200', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          score === null || score === undefined
            ? 'bg-gray-400'
            : score >= 80
            ? 'bg-green-500'
            : score >= 60
            ? 'bg-yellow-500'
            : 'bg-red-500'
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
