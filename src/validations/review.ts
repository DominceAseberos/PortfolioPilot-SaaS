import { z } from 'zod'
import { FILE_UPLOAD } from '@/constants'

export const portfolioReviewSchema = z.object({
  portfolioUrl: z.string().url('Please enter a valid URL'),
  targetRole: z.string().min(2, 'Please enter a target role').optional(),
})

export const githubReviewSchema = z.object({
  githubUsername: z.string()
    .min(1, 'GitHub username is required')
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, 'Please enter a valid GitHub username'),
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
