import type { ResumeSemanticSectionType } from './resume'
import type { EvidenceRef, ResumeSource } from './resume-provenance'

export type { EvidenceRef, ResumeSource } from './resume-provenance'
export type EvidenceStatus = 'verified' | 'inferred' | 'conflict' | 'unknown'
export type ResumeAuthorityContext = 'identity' | 'github-fact' | 'generic'

export interface CanonicalCandidate<T> {
  value: T
  evidence: EvidenceRef[]
}

export interface CanonicalField<T> {
  value: T | null
  status: EvidenceStatus
  evidence: EvidenceRef[]
  aiModified?: boolean
  conflicts?: CanonicalCandidate<T>[]
}

export interface CanonicalResumeEntry {
  title: CanonicalField<string>
  subtitle: CanonicalField<string>
  dates: CanonicalField<string>
  description: CanonicalField<string>
  link: CanonicalField<string>
  isEnhanced?: boolean
}

export interface CanonicalResumeSection {
  id: string
  title: string
  type: 'text' | 'list' | 'entries'
  semanticType: ResumeSemanticSectionType
  classificationConfidence: number
  source: ResumeSource
  text?: CanonicalField<string>
  items?: CanonicalField<string>[]
  entries?: CanonicalResumeEntry[]
}

export interface CanonicalResumeIdentity {
  name: CanonicalField<string>
  email: CanonicalField<string>
  phone: CanonicalField<string>
  linkedin: CanonicalField<string>
  github: CanonicalField<string>
  website: CanonicalField<string>
}

export interface CanonicalResume {
  version: 1
  identity: CanonicalResumeIdentity
  sections: CanonicalResumeSection[]
}
