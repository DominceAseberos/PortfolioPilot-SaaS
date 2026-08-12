import React from 'react'
import { RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import type { DynamicSection } from '@/types/resume'
import type { ResumeChangeOperation } from '@/types/resume-change'
import {
  findOriginalResumeSection,
  groupResumeChangeOperations,
  type ResumeChangeGroup,
} from '@/features/resume/services/resume-change-review.service'

function operationLabel(operation: ResumeChangeOperation) {
  if (operation.action === 'add') return `Added ${operation.after || operation.target}`
  if (operation.action === 'remove') return `Removed ${operation.before || operation.target}`
  return operation.target === 'text' ? 'Rewrote section text' : `Rewrote ${operation.target}`
}

export function InitialResumeChangesReview({
  operations,
  originalSections,
  onRestore,
}: {
  operations?: ResumeChangeOperation[]
  originalSections?: DynamicSection[]
  onRestore: (group: ResumeChangeGroup) => void
}) {
  if (!operations?.length) return null
  const originals = originalSections ?? []
  const groups = groupResumeChangeOperations(operations)

  return (
    <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 text-violet-700 dark:text-violet-300">
            <Sparkles className="h-4 w-4" /> Initial AI changes
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Review what changed from the uploaded/source resume. Restoring a section replaces later edits made inside that section.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] border-violet-500/20 bg-background/60">
          {operations.length} change{operations.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="space-y-2">
        {groups.map((group) => {
          const original = findOriginalResumeSection(originals, group.sectionTitle, group.semanticType)
          return (
            <div key={`${group.semanticType ?? 'title'}-${group.sectionTitle}`} className="rounded-lg border border-border/50 bg-background/70 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold">{group.sectionTitle}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {group.operations.length} recorded change{group.operations.length === 1 ? '' : 's'}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1.5" onClick={() => onRestore(group)}>
                  <RotateCcw className="h-3 w-3" />
                  {original ? 'Restore original section' : 'Remove AI-added section'}
                </Button>
              </div>

              <div className="space-y-1.5">
                {group.operations.slice(0, 5).map((operation, index) => (
                  <div key={`${operation.target}-${index}`} className="text-[10px] rounded-md bg-muted/50 px-2 py-1.5">
                    <span className="font-medium">{operationLabel(operation)}</span>
                    {operation.action === 'rewrite' && (operation.before || operation.after) && (
                      <div className="mt-1 grid gap-1 text-muted-foreground">
                        {operation.before && <span className="line-through">{operation.before}</span>}
                        {operation.after && <span className="text-foreground">{operation.after}</span>}
                      </div>
                    )}
                  </div>
                ))}
                {group.operations.length > 5 && (
                  <p className="text-[10px] text-muted-foreground">+{group.operations.length - 5} more changes</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
