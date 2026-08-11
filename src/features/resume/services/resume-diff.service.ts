import type { DynamicSection, ResumeSemanticSectionType } from '@/types/resume'
import { isProtectedFactSection } from './resume-enhancement-policy.service'

export type ResumeChangeAction = 'add' | 'remove' | 'rewrite'

export interface ResumeChangeOperation {
  action: ResumeChangeAction
  sectionTitle: string
  semanticType?: ResumeSemanticSectionType
  target: string
  before?: string
  after?: string
  protectedFact: boolean
}

const normalized = (value?: string) => (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function sectionMatch(sections: DynamicSection[], target: DynamicSection): DynamicSection | undefined {
  if (target.semanticType && target.semanticType !== 'unknown' && target.semanticType !== 'custom') {
    const semantic = sections.find((section) => section.semanticType === target.semanticType)
    if (semantic) return semantic
  }
  return sections.find((section) => normalized(section.title) === normalized(target.title))
}

export function diffResumeSections(original: DynamicSection[], enhanced: DynamicSection[]): ResumeChangeOperation[] {
  const operations: ResumeChangeOperation[] = []

  for (const next of enhanced) {
    const previous = sectionMatch(original, next)
    const protectedFact = isProtectedFactSection(next)

    if (!previous) {
      operations.push({
        action: 'add',
        sectionTitle: next.title,
        semanticType: next.semanticType,
        target: 'section',
        after: next.title,
        protectedFact,
      })
      continue
    }

    if (next.type === 'text' && previous.type === 'text') {
      if ((previous.text ?? '').trim() !== (next.text ?? '').trim()) {
        operations.push({ action: 'rewrite', sectionTitle: next.title, semanticType: next.semanticType, target: 'text', before: previous.text, after: next.text, protectedFact: false })
      }
      continue
    }

    if (next.type === 'list' && previous.type === 'list') {
      const oldItems = new Map((previous.items ?? []).map((item) => [normalized(item), item]))
      const newItems = new Map((next.items ?? []).map((item) => [normalized(item), item]))
      for (const [key, item] of newItems) if (key && !oldItems.has(key)) operations.push({ action: 'add', sectionTitle: next.title, semanticType: next.semanticType, target: 'list-item', after: item, protectedFact: false })
      for (const [key, item] of oldItems) if (key && !newItems.has(key)) operations.push({ action: 'remove', sectionTitle: next.title, semanticType: next.semanticType, target: 'list-item', before: item, protectedFact: false })
      continue
    }

    if (next.type === 'entries' && previous.type === 'entries') {
      const oldEntries = previous.entries ?? []
      const matched = new Set<number>()

      for (const entry of next.entries ?? []) {
        const key = normalized(entry.title)
        let index = oldEntries.findIndex((old, i) => !matched.has(i) && key && normalized(old.title) === key)
        if (index < 0) index = oldEntries.findIndex((_, i) => !matched.has(i))

        if (index < 0) {
          operations.push({ action: 'add', sectionTitle: next.title, semanticType: next.semanticType, target: `entry:${entry.title}`, after: entry.description || entry.title, protectedFact })
          continue
        }

        matched.add(index)
        const old = oldEntries[index]
        if ((old.description ?? '').trim() !== (entry.description ?? '').trim()) {
          operations.push({ action: 'rewrite', sectionTitle: next.title, semanticType: next.semanticType, target: `entry:${old.title}:description`, before: old.description, after: entry.description, protectedFact: false })
        }
        for (const field of ['title', 'subtitle', 'dates', 'link'] as const) {
          if ((old[field] ?? '').trim() !== (entry[field] ?? '').trim()) {
            operations.push({ action: 'rewrite', sectionTitle: next.title, semanticType: next.semanticType, target: `entry:${old.title}:${field}`, before: old[field], after: entry[field], protectedFact })
          }
        }
      }

      oldEntries.forEach((entry, index) => {
        if (!matched.has(index)) operations.push({ action: 'remove', sectionTitle: next.title, semanticType: next.semanticType, target: `entry:${entry.title}`, before: entry.description || entry.title, protectedFact })
      })
    }
  }

  return operations
}
