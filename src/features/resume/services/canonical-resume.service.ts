import type { ImprovedResumeData, ResumeSemanticSectionType } from '@/types/resume'
import type { CanonicalField, CanonicalResume, ResumeAuthorityContext, ResumeSource } from '@/types/canonical-resume'

const confidence: Record<ResumeSource, number> = { user: 1, resume: 0.98, github: 0.99, portfolio: 0.9, ai: 0.65 }
const authority: Record<ResumeAuthorityContext, Record<ResumeSource, number>> = {
  identity: { user: 100, resume: 90, portfolio: 80, github: 70, ai: 10 },
  'github-fact': { user: 100, github: 95, portfolio: 80, resume: 70, ai: 10 },
  generic: { user: 100, resume: 90, github: 80, portfolio: 80, ai: 10 },
}

const comparable = (v: unknown) => typeof v === 'string' ? v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\s+/g, ' ') : JSON.stringify(v)

export function makeCanonicalField<T>(value: T | null | undefined, source: ResumeSource, evidence?: string): CanonicalField<T> {
  const normalized = value == null || (typeof value === 'string' && !value.trim()) ? null : value
  if (normalized == null) return { value: null, status: 'unknown', evidence: [] }
  return { value: normalized, status: source === 'ai' ? 'inferred' : 'verified', evidence: [{ source, evidence, confidence: confidence[source] }], aiModified: source === 'ai' || undefined }
}

export function resolveCanonicalField<T>(current: CanonicalField<T>, incoming: CanonicalField<T>, context: ResumeAuthorityContext = 'generic'): CanonicalField<T> {
  if (current.value == null) return incoming
  if (incoming.value == null) return current
  const allEvidence = [...current.evidence, ...incoming.evidence]
  if (comparable(current.value) === comparable(incoming.value)) return { value: current.value, status: allEvidence.some((e) => e.source !== 'ai') ? 'verified' : 'inferred', evidence: allEvidence }
  const score = (f: CanonicalField<T>) => Math.max(0, ...f.evidence.map((e) => authority[context][e.source]))
  const chosen = score(incoming) > score(current) ? incoming : current
  return { ...chosen, status: 'conflict', evidence: allEvidence, conflicts: [{ value: current.value, evidence: current.evidence }, { value: incoming.value, evidence: incoming.evidence }] }
}

export function inferSemanticTypeFromTitle(title: string): ResumeSemanticSectionType {
  const v = title.trim().toLowerCase()
  if (!v) return 'unknown'
  if (/summary|profile|objective|about me/.test(v)) return 'summary'
  if (/skill|competenc|expertise|proficien|tool|abilit|knowledge/.test(v)) return 'skills'
  if (/experience|employment|work history|professional background/.test(v)) return 'experience'
  if (/education|academic|university|college|degree/.test(v)) return 'education'
  if (/project|portfolio|case stud|work sample/.test(v)) return 'projects'
  if (/certif|credential/.test(v)) return 'certifications'
  if (/licen[cs]e|registration/.test(v)) return 'licenses'
  if (/award|honou?r|recognition/.test(v)) return 'awards'
  if (/language/.test(v)) return 'languages'
  if (/volunteer|community service/.test(v)) return 'volunteer'
  if (/publication|research|paper|journal/.test(v)) return 'publications'
  if (/training|course|workshop|seminar/.test(v)) return 'training'
  return /other|additional/.test(v) ? 'unknown' : 'custom'
}

export function toCanonicalResume(data: ImprovedResumeData, source: ResumeSource = 'resume'): CanonicalResume {
  const sections = (data.sections ?? []).map((section, index) => {
    const semanticType = section.semanticType ?? inferSemanticTypeFromTitle(section.title)
    const base = { id: `section-${index}`, title: section.title, type: section.type, semanticType, classificationConfidence: section.classificationConfidence ?? (semanticType === 'custom' || semanticType === 'unknown' ? 0.6 : 0.9), source }
    if (section.type === 'text') return { ...base, type: 'text' as const, text: makeCanonicalField(section.text, source, section.text) }
    if (section.type === 'list') return { ...base, type: 'list' as const, items: (section.items ?? []).map((item) => makeCanonicalField(item, source, item)) }
    return { ...base, type: 'entries' as const, entries: (section.entries ?? []).map((entry) => ({ title: makeCanonicalField(entry.title, source, entry.title), subtitle: makeCanonicalField(entry.subtitle, source, entry.subtitle), dates: makeCanonicalField(entry.dates, source, entry.dates), description: makeCanonicalField(entry.description, source, entry.description), bullets: (entry.bullets ?? []).map((bullet) => makeCanonicalField(bullet, source, bullet)), link: makeCanonicalField(entry.link, source, entry.link), isEnhanced: entry.isEnhanced })) }
  })
  return { version: 1, identity: { name: makeCanonicalField(data.name, source, data.name), email: makeCanonicalField(data.email, source, data.email), phone: makeCanonicalField(data.phone, source, data.phone), location: makeCanonicalField(data.location, source, data.location), linkedin: makeCanonicalField(data.linkedin, source, data.linkedin), github: makeCanonicalField(data.github, source, data.github), website: makeCanonicalField(data.website, source, data.website) }, sections }
}

export function validateCanonicalResume(resume: CanonicalResume): { valid: boolean; issues: string[] } {
  const issues = resume.sections.filter((s) => !s.title.trim() || s.classificationConfidence < 0 || s.classificationConfidence > 1).map((s) => `Invalid section: ${s.title || 'Untitled'}`)
  return { valid: issues.length === 0, issues }
}
