import type { DynamicSection, ImprovedResumeData } from '@/types/resume'
import type {
  EvidenceRef,
  ResumeEntryEvidenceField,
  ResumeIdentityEvidenceField,
  ResumeSource,
} from '@/types/resume-provenance'
import {
  matchingGitHubReposForProject,
  matchingGitHubReposForSkill,
  type GitHubResumeEvidence,
} from './resume-evidence-policy.service'

export interface ResumeProvenanceContext {
  githubRepos?: GitHubResumeEvidence[]
  githubUsername?: string
  portfolioMarkdown?: string
  portfolioUrl?: string
}

const FIELD_NAMES: ResumeEntryEvidenceField[] = ['title', 'subtitle', 'dates', 'description', 'link']

export const normalizeResumeEvidenceKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const evidenceKey = (item: EvidenceRef) =>
  `${item.source}|${item.sourceUrl ?? ''}|${item.evidence ?? ''}`

export function mergeResumeEvidence(...groups: (EvidenceRef[] | undefined)[]): EvidenceRef[] {
  const seen = new Set<string>()
  const merged: EvidenceRef[] = []
  for (const item of groups.flatMap((group) => group ?? [])) {
    const key = evidenceKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

export function makeResumeEvidence(
  source: ResumeSource,
  confidence: number,
  evidence?: string,
  sourceUrl?: string
): EvidenceRef {
  return { source, confidence, evidence, sourceUrl }
}

const resumeEvidence = () => makeResumeEvidence('resume', 1, 'Uploaded resume')
const aiEvidence = () => makeResumeEvidence('ai', 0.8, 'AI-assisted wording')
const userEvidence = () => makeResumeEvidence('user', 1, 'Edited by user')
const portfolioEvidence = (url?: string) => makeResumeEvidence('portfolio', 0.95, 'Portfolio content', url)

function repoUrl(repo: GitHubResumeEvidence, username?: string): string | undefined {
  return repo.html_url ?? repo.url ?? (username && repo.name ? `https://github.com/${username}/${repo.name}` : undefined)
}

function repoEvidence(repo: GitHubResumeEvidence, username?: string): EvidenceRef {
  return makeResumeEvidence(
    'github',
    1,
    repo.name ? `GitHub repository: ${repo.name}` : 'GitHub repository evidence',
    repoUrl(repo, username)
  )
}

function entryFieldEvidenceFromSource(
  entry: NonNullable<DynamicSection['entries']>[number],
  source: EvidenceRef,
  descriptionAiModified = false
) {
  const result: NonNullable<NonNullable<DynamicSection['entries']>[number]['fieldEvidence']> = {}
  for (const field of FIELD_NAMES) {
    if (!entry[field]) continue
    result[field] = descriptionAiModified && field === 'description'
      ? mergeResumeEvidence([source], [aiEvidence()])
      : [source]
  }
  return result
}

export function ensureOriginalResumeProvenance(sections: DynamicSection[]): DynamicSection[] {
  return sections.map((section) => {
    const existingSectionEvidence = section.provenance?.section
    const provenance = {
      ...section.provenance,
      section: existingSectionEvidence?.length ? existingSectionEvidence : [resumeEvidence()],
      text: section.type === 'text' && section.text
        ? (section.provenance?.text?.length ? section.provenance.text : [resumeEvidence()])
        : section.provenance?.text,
      items: section.type === 'list'
        ? (section.items ?? []).reduce<Record<string, EvidenceRef[]>>((acc, item) => {
            const key = normalizeResumeEvidenceKey(item)
            acc[key] = section.provenance?.items?.[key]?.length
              ? section.provenance.items[key]
              : [resumeEvidence()]
            return acc
          }, {})
        : section.provenance?.items,
    }

    if (section.type !== 'entries') return { ...section, provenance }

    const entries = (section.entries ?? []).map((entry) => ({
      ...entry,
      fieldEvidence: entry.fieldEvidence ?? entryFieldEvidenceFromSource(entry, resumeEvidence()),
      bulletEvidence: entry.bulletEvidence ?? (entry.bullets?.length ? [resumeEvidence()] : undefined),
    }))
    return { ...section, provenance, entries }
  })
}

function findOriginalSection(originals: DynamicSection[], section: DynamicSection): DynamicSection | undefined {
  const semantic = section.semanticType
  if (semantic && semantic !== 'unknown') {
    const match = originals.find((candidate) => candidate.type === section.type && candidate.semanticType === semantic)
    if (match) return match
  }
  const title = normalizeResumeEvidenceKey(section.title)
  return originals.find((candidate) => candidate.type === section.type && normalizeResumeEvidenceKey(candidate.title) === title)
}

function findOriginalEntry(
  original: DynamicSection | undefined,
  title: string
): NonNullable<DynamicSection['entries']>[number] | undefined {
  if (!original || original.type !== 'entries') return undefined
  const key = normalizeResumeEvidenceKey(title)
  return (original.entries ?? []).find((entry) => normalizeResumeEvidenceKey(entry.title) === key)
}

function contextEvidence(originalSections: DynamicSection[], context: ResumeProvenanceContext): EvidenceRef[] {
  const refs: EvidenceRef[] = [aiEvidence()]
  if (originalSections.length > 0) refs.push(resumeEvidence())
  if ((context.githubRepos ?? []).length > 0) {
    refs.push(makeResumeEvidence('github', 0.95, 'GitHub repository evidence'))
  }
  if (context.portfolioMarkdown) refs.push(portfolioEvidence(context.portfolioUrl))
  return mergeResumeEvidence(refs)
}

function decorateListSection(
  original: DynamicSection | undefined,
  section: DynamicSection,
  context: ResumeProvenanceContext
): DynamicSection {
  const originalItems = original?.type === 'list' ? original.items ?? [] : []
  const originalByKey = new Map(originalItems.map((item) => [normalizeResumeEvidenceKey(item), item]))
  const originalEvidence = original?.provenance?.items ?? {}
  const items: Record<string, EvidenceRef[]> = {}

  for (const item of section.items ?? []) {
    const key = normalizeResumeEvidenceKey(item)
    const originalItem = originalByKey.get(key)
    if (originalItem) {
      items[key] = originalEvidence[key]?.length ? originalEvidence[key] : [resumeEvidence()]
      continue
    }

    const repos = matchingGitHubReposForSkill(item, context.githubRepos ?? [])
    items[key] = repos.length > 0
      ? mergeResumeEvidence(repos.map((repo) => repoEvidence(repo, context.githubUsername)), [aiEvidence()])
      : [aiEvidence()]
  }

  return {
    ...section,
    provenance: {
      ...section.provenance,
      section: mergeResumeEvidence(original?.provenance?.section, original ? [resumeEvidence()] : undefined, [aiEvidence()]),
      items,
    },
  }
}

function decorateEntrySection(
  original: DynamicSection | undefined,
  section: DynamicSection,
  context: ResumeProvenanceContext
): DynamicSection {
  const entries = (section.entries ?? []).map((entry) => {
    const previous = findOriginalEntry(original, entry.title)
    const matchingRepos = matchingGitHubReposForProject(entry.title, entry.link, context.githubRepos ?? [])
    const githubRefs = matchingRepos.map((repo) => repoEvidence(repo, context.githubUsername))
    const isPortfolioEntry = !previous && section.semanticType === 'experience' && !!context.portfolioMarkdown
    const nextFieldEvidence: NonNullable<typeof entry.fieldEvidence> = {}

    for (const field of FIELD_NAMES) {
      const value = entry[field]
      if (!value) continue
      const previousValue = previous?.[field]
      const previousEvidence = previous?.fieldEvidence?.[field]

      if (previous && value === previousValue) {
        nextFieldEvidence[field] = previousEvidence?.length ? previousEvidence : [resumeEvidence()]
        continue
      }

      if (previous) {
        nextFieldEvidence[field] = mergeResumeEvidence(
          previousEvidence?.length ? previousEvidence : [resumeEvidence()],
          section.semanticType === 'projects' ? githubRefs : undefined,
          [aiEvidence()]
        )
        continue
      }

      if (isPortfolioEntry) {
        nextFieldEvidence[field] = field === 'description'
          ? mergeResumeEvidence([portfolioEvidence(context.portfolioUrl)], [aiEvidence()])
          : [portfolioEvidence(context.portfolioUrl)]
        continue
      }

      if (githubRefs.length > 0) {
        nextFieldEvidence[field] = field === 'title' || field === 'link'
          ? githubRefs
          : mergeResumeEvidence(githubRefs, [aiEvidence()])
        continue
      }

      nextFieldEvidence[field] = [aiEvidence()]
    }

    const currentBullets = (entry.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean)
    const previousBullets = (previous?.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean)
    let bulletEvidence: EvidenceRef[] | undefined
    if (currentBullets.length > 0) {
      if (previous && JSON.stringify(currentBullets) === JSON.stringify(previousBullets)) {
        bulletEvidence = previous.bulletEvidence?.length ? previous.bulletEvidence : [resumeEvidence()]
      } else if (previous) {
        bulletEvidence = mergeResumeEvidence(
          previous.bulletEvidence?.length ? previous.bulletEvidence : [resumeEvidence()],
          section.semanticType === 'projects' ? githubRefs : undefined,
          [aiEvidence()]
        )
      } else if (isPortfolioEntry) {
        bulletEvidence = mergeResumeEvidence([portfolioEvidence(context.portfolioUrl)], [aiEvidence()])
      } else if (githubRefs.length > 0) {
        bulletEvidence = mergeResumeEvidence(githubRefs, [aiEvidence()])
      } else {
        bulletEvidence = [aiEvidence()]
      }
    }

    return { ...entry, fieldEvidence: nextFieldEvidence, bulletEvidence }
  })

  const sectionEvidence = original
    ? mergeResumeEvidence(original.provenance?.section, [resumeEvidence()], [aiEvidence()])
    : section.semanticType === 'experience' && context.portfolioMarkdown
      ? mergeResumeEvidence([portfolioEvidence(context.portfolioUrl)], [aiEvidence()])
      : mergeResumeEvidence([aiEvidence()], (context.githubRepos ?? []).length > 0 ? [makeResumeEvidence('github', 0.95, 'GitHub repository evidence')] : undefined)

  return { ...section, provenance: { ...section.provenance, section: sectionEvidence }, entries }
}

export function decorateEnhancedResumeProvenance(
  originalSections: DynamicSection[],
  enhancedSections: DynamicSection[],
  context: ResumeProvenanceContext = {}
): DynamicSection[] {
  const originals = ensureOriginalResumeProvenance(originalSections)

  return enhancedSections.map((section) => {
    const original = findOriginalSection(originals, section)

    if (section.type === 'list') return decorateListSection(original, section, context)
    if (section.type === 'entries') return decorateEntrySection(original, section, context)

    const unchanged = original?.type === 'text' && original.text === section.text
    const textEvidence = unchanged
      ? (original?.provenance?.text?.length ? original.provenance.text : [resumeEvidence()])
      : original
        ? mergeResumeEvidence(original.provenance?.text, [resumeEvidence()], [aiEvidence()])
        : contextEvidence(originalSections, context)

    return {
      ...section,
      provenance: {
        ...section.provenance,
        section: original
          ? mergeResumeEvidence(original.provenance?.section, [resumeEvidence()], unchanged ? undefined : [aiEvidence()])
          : textEvidence,
        text: textEvidence,
      },
    }
  })
}

export function markResumeIdentityFieldAsUserEdited(
  data: ImprovedResumeData,
  field: ResumeIdentityEvidenceField
): ImprovedResumeData['identityEvidence'] {
  return {
    ...(data.identityEvidence ?? {}),
    [field]: mergeResumeEvidence(data.identityEvidence?.[field], [userEvidence()]),
  }
}

export function markSectionTextAsUserEdited(section: DynamicSection): DynamicSection {
  return {
    ...section,
    provenance: {
      ...section.provenance,
      text: mergeResumeEvidence(section.provenance?.text, [userEvidence()]),
    },
  }
}

export function markListItemAsUserAdded(section: DynamicSection, item: string): DynamicSection {
  const key = normalizeResumeEvidenceKey(item)
  return {
    ...section,
    provenance: {
      ...section.provenance,
      items: { ...(section.provenance?.items ?? {}), [key]: [userEvidence()] },
    },
  }
}

export function markEntryFieldAsUserEdited(
  section: DynamicSection,
  entryIndex: number,
  field: ResumeEntryEvidenceField
): DynamicSection {
  if (section.type !== 'entries') return section
  const entries = [...(section.entries ?? [])]
  const entry = entries[entryIndex]
  if (!entry) return section
  entries[entryIndex] = {
    ...entry,
    fieldEvidence: {
      ...(entry.fieldEvidence ?? {}),
      [field]: mergeResumeEvidence(entry.fieldEvidence?.[field], [userEvidence()]),
    },
  }
  return { ...section, entries }
}

export function markEntryBulletsAsUserEdited(section: DynamicSection, entryIndex: number): DynamicSection {
  if (section.type !== 'entries') return section
  const entries = [...(section.entries ?? [])]
  const entry = entries[entryIndex]
  if (!entry) return section
  entries[entryIndex] = {
    ...entry,
    bulletEvidence: mergeResumeEvidence(entry.bulletEvidence, [userEvidence()]),
  }
  return { ...section, entries }
}

export function appendAiEvidenceToSectionText(section: DynamicSection): DynamicSection {
  return {
    ...section,
    provenance: {
      ...section.provenance,
      text: mergeResumeEvidence(section.provenance?.text, [aiEvidence()]),
    },
  }
}

export function appendAiEvidenceToEntryDescription(section: DynamicSection, entryIndex: number): DynamicSection {
  if (section.type !== 'entries') return section
  const entries = [...(section.entries ?? [])]
  const entry = entries[entryIndex]
  if (!entry) return section
  entries[entryIndex] = {
    ...entry,
    fieldEvidence: {
      ...(entry.fieldEvidence ?? {}),
      description: mergeResumeEvidence(entry.fieldEvidence?.description, [aiEvidence()]),
    },
  }
  return { ...section, entries }
}

export function appendAiEvidenceToEntryBullets(section: DynamicSection, entryIndex: number): DynamicSection {
  if (section.type !== 'entries') return section
  const entries = [...(section.entries ?? [])]
  const entry = entries[entryIndex]
  if (!entry) return section
  entries[entryIndex] = {
    ...entry,
    bulletEvidence: mergeResumeEvidence(entry.bulletEvidence, [aiEvidence()]),
  }
  return { ...section, entries }
}

export function collectEntryEvidence(entry: NonNullable<DynamicSection['entries']>[number]): EvidenceRef[] {
  return mergeResumeEvidence(...Object.values(entry.fieldEvidence ?? {}), entry.bulletEvidence)
}
