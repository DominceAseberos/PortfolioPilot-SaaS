export type ResumeWorkflowOperation = 'generation' | 'optimization' | 'verification'

export interface ResumeWorkflowMetric {
  operation: ResumeWorkflowOperation
  durationMs: number
  budgetMs: number
  exceededBudget: boolean
  completedAt: string
}

export const RESUME_WORKFLOW_BUDGETS: Record<ResumeWorkflowOperation, number> = {
  generation: 30_000,
  optimization: 15_000,
  verification: 20_000,
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export function startResumeWorkflowMeasure(
  operation: ResumeWorkflowOperation,
  budgetMs = RESUME_WORKFLOW_BUDGETS[operation]
): () => ResumeWorkflowMetric {
  const startedAt = now()
  let completed: ResumeWorkflowMetric | null = null

  return () => {
    if (completed) return completed
    const durationMs = Math.max(0, now() - startedAt)
    completed = {
      operation,
      durationMs,
      budgetMs,
      exceededBudget: durationMs > budgetMs,
      completedAt: new Date().toISOString(),
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<ResumeWorkflowMetric>('portfoliopilot:resume-performance', {
        detail: completed,
      }))
    }

    if (completed.exceededBudget && process.env.NODE_ENV !== 'test') {
      console.warn(`[resume-performance] ${operation} exceeded ${budgetMs}ms budget`, completed)
    }

    return completed
  }
}
