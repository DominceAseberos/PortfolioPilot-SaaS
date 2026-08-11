import type { DynamicSection } from '@/types/resume'
import { RESUME_LAYOUT_PROFILES, parseDescriptionBlocks, type ResumeTemplateId } from './resume-layout.service'

export interface ResumeOptimizationTarget {
  id: string
  sectionIndex: number
  entryIndex?: number
  kind: 'text' | 'description'
  original: string
  maxWords: number
}

export interface ResumeOptimizationRewrite {
  id: string
  text: string
}

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length
const numbers = (value: string) => new Set(value.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? [])
const urls = (value: string) => new Set(value.match(/https?:\/\/\S+/gi) ?? [])

export function buildResumeOptimizationTargets(
  sections: DynamicSection[],
  templateId: ResumeTemplateId
): ResumeOptimizationTarget[] {
  const profile = RESUME_LAYOUT_PROFILES[templateId]
  const targets: ResumeOptimizationTarget[] = []

  sections.forEach((section, sectionIndex) => {
    if (section.type === 'text' && section.text?.trim()) {
      const count = words(section.text)
      if (count > profile.preferredSummaryWords) {
        targets.push({
          id: `section:${sectionIndex}:text`,
          sectionIndex,
          kind: 'text',
          original: section.text,
          maxWords: profile.preferredSummaryWords,
        })
      }
      return
    }

    if (section.type !== 'entries') return
    ;(section.entries ?? []).forEach((entry, entryIndex) => {
      if (!entry.description?.trim()) return
      const blocks = parseDescriptionBlocks(entry.description)
      const count = words(entry.description)
      const blockBudget = Math.max(
        profile.preferredBulletWords,
        profile.preferredBulletWords * Math.max(1, Math.min(profile.preferredBulletsPerEntry, blocks.length || 1))
      )
      const maxWords = Math.min(count - 1, blockBudget)
      if (count > blockBudget && maxWords >= 12) {
        targets.push({
          id: `section:${sectionIndex}:entry:${entryIndex}:description`,
          sectionIndex,
          entryIndex,
          kind: 'description',
          original: entry.description,
          maxWords,
        })
      }
    })
  })

  return targets
}

function rewriteIsSafe(target: ResumeOptimizationTarget, next: string): boolean {
  const trimmed = next.trim()
  if (!trimmed || words(trimmed) > target.maxWords || words(trimmed) >= words(target.original)) return false

  const originalNumbers = numbers(target.original)
  for (const value of numbers(trimmed)) if (!originalNumbers.has(value)) return false

  const originalUrls = urls(target.original)
  for (const value of urls(trimmed)) if (!originalUrls.has(value)) return false

  return true
}

export function applyResumeOptimizationRewrites(
  sections: DynamicSection[],
  targets: ResumeOptimizationTarget[],
  rewrites: ResumeOptimizationRewrite[]
): DynamicSection[] {
  const targetMap = new Map(targets.map((target) => [target.id, target]))
  const rewriteMap = new Map(rewrites.map((rewrite) => [rewrite.id, rewrite.text]))
  const next = sections.map((section) => ({
    ...section,
    entries: section.type === 'entries' ? (section.entries ?? []).map((entry) => ({ ...entry })) : section.entries,
    items: section.type === 'list' ? [...(section.items ?? [])] : section.items,
  }))

  for (const [id, proposed] of rewriteMap) {
    const target = targetMap.get(id)
    if (!target || !rewriteIsSafe(target, proposed)) continue
    const section = next[target.sectionIndex]
    if (!section) continue

    if (target.kind === 'text' && section.type === 'text') {
      section.text = proposed.trim()
    } else if (target.kind === 'description' && section.type === 'entries' && typeof target.entryIndex === 'number') {
      const entry = section.entries?.[target.entryIndex]
      if (entry) entry.description = proposed.trim()
    }
  }

  return next
}
