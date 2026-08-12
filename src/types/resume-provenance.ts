export type ResumeSource = 'resume' | 'github' | 'portfolio' | 'user' | 'ai'

export interface EvidenceRef {
  source: ResumeSource
  evidence?: string
  sourceUrl?: string
  confidence: number
}

export type ResumeEntryEvidenceField = 'title' | 'subtitle' | 'dates' | 'description' | 'link'
export type ResumeIdentityEvidenceField = 'name' | 'email' | 'phone' | 'location' | 'linkedin' | 'github' | 'website'

export interface ResumeSectionProvenance {
  section?: EvidenceRef[]
  text?: EvidenceRef[]
  items?: Record<string, EvidenceRef[]>
}
