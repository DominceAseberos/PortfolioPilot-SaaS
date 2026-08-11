import { z } from 'zod'
import type { DynamicSection, ResumeSemanticSectionType } from '@/types/resume'

const SEMANTIC_SECTION_TYPES = [
  'summary', 'skills', 'experience', 'education', 'projects', 'certifications',
  'licenses', 'awards', 'languages', 'volunteer', 'publications', 'training', 'custom', 'unknown',
] as const satisfies readonly ResumeSemanticSectionType[]

const nullableString = z.preprocess((value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}, z.string().nullable())

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}, z.string().optional())

const stringArray = z.preprocess((value) => {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
}, z.array(z.string()))

export const aiResumeEntrySchema = z.object({
  title: z.preprocess((value) => (typeof value === 'string' ? value.trim() : ''), z.string()),
  subtitle: optionalString,
  dates: optionalString,
  description: optionalString,
  link: optionalString,
  isEnhanced: z.boolean().optional(),
})

export const aiDynamicSectionSchema = z.object({
  title: z.preprocess((value) => (typeof value === 'string' && value.trim() ? value.trim() : 'Other'), z.string()),
  type: z.enum(['text', 'list', 'entries']).catch('text'),
  semanticType: z.enum(SEMANTIC_SECTION_TYPES).catch('unknown'),
  classificationConfidence: z.coerce.number().min(0).max(1).catch(0.5),
  text: optionalString,
  items: stringArray.catch([]),
  entries: z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(aiResumeEntrySchema)).catch([]),
  acceptsAIImprovements: z.boolean().catch(false),
}).transform((section): DynamicSection => {
  if (section.type === 'text') return { title: section.title, type: 'text', semanticType: section.semanticType, classificationConfidence: section.classificationConfidence, text: section.text, acceptsAIImprovements: section.acceptsAIImprovements }
  if (section.type === 'list') return { title: section.title, type: 'list', semanticType: section.semanticType, classificationConfidence: section.classificationConfidence, items: section.items, acceptsAIImprovements: section.acceptsAIImprovements }
  return { title: section.title, type: 'entries', semanticType: section.semanticType, classificationConfidence: section.classificationConfidence, entries: section.entries, acceptsAIImprovements: section.acceptsAIImprovements }
})

export const aiResumeExtractionSchema = z.object({
  name: nullableString,
  email: nullableString,
  linkedin: nullableString,
  github: nullableString,
  sections: z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(aiDynamicSectionSchema)).catch([]),
  predictedSeniority: optionalString,
  tone: optionalString,
})

export const aiResumeScoreSchema = z.object({
  score: z.coerce.number().min(0).max(100).catch(50),
  strengths: stringArray.catch([]),
  weaknesses: stringArray.catch([]),
  recommendations: stringArray.catch([]),
})

export const aiResumeOptimizationSchema = z.object({
  rewrites: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(z.object({
      id: z.string().min(1),
      text: z.string().min(1),
    }))
  ).catch([]),
})

export type AIResumeExtraction = z.infer<typeof aiResumeExtractionSchema>
export type AIResumeScore = z.infer<typeof aiResumeScoreSchema>
export type AIResumeOptimization = z.infer<typeof aiResumeOptimizationSchema>
