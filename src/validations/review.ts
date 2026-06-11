import { z } from 'zod'
import { FILE_UPLOAD } from '@/constants'

const urlSchema = z.string().transform((val) => {
  const trimmed = val.trim()
  if (!trimmed) throw new Error('URL is required')
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}).pipe(z.string().url('Please enter a valid URL'))

export const portfolioReviewSchema = z.object({
  portfolioUrl: urlSchema,
  targetRole: z.string().min(2, 'Please enter a target role').optional(),
})

const githubUsernameSchema = z.string()
  .min(1, 'GitHub username is required')
  .regex(/^\S+$/, 'GitHub username cannot contain spaces')
  .max(100, 'GitHub username is too long')
  .transform((val) => {
    const trimmed = val.trim()
    const match = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_-]+)(?:\/.*)?$/i
    )
    return match ? match[1] : trimmed
  })

export const githubReviewSchema = z.object({
  githubUsername: githubUsernameSchema,
})

export const resumeReviewSchema = z.object({
  resume: z
    .custom<File>((val) => val instanceof File, 'Please upload a file')
    .refine(
      (file) => file.size <= FILE_UPLOAD.maxFileSize,
      'File size must be less than 5MB'
    )
    .refine(
      (file) => (FILE_UPLOAD.allowedFileTypes as readonly string[]).includes(file.type),
      'File must be a PDF'
    ),
})

export const fullReviewSchema = z.object({
  portfolioUrl: z.string().url('Please enter a valid URL').optional(),
  githubUsername: z.string().optional(),
  targetRole: z.string().optional(),
})

export type PortfolioReviewInput = z.infer<typeof portfolioReviewSchema>
export type GitHubReviewInput = z.infer<typeof githubReviewSchema>
export type FullReviewInput = z.infer<typeof fullReviewSchema>
