import type { ResumeSemanticSectionType } from './resume'

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
