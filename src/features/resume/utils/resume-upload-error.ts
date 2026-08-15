export type ResumeUploadErrorCode =
  | 'SCANNED_PDF'
  | 'PARTIALLY_SCANNED_PDF'
  | 'PASSWORD_PROTECTED_PDF'
  | 'MALFORMED_PDF'
  | 'PDF_TOO_MANY_PAGES'
  | 'UNREADABLE_PDF'
  | 'NOT_A_RESUME'

export interface ResumeUploadErrorPayload {
  code?: unknown
  message?: unknown
}

export interface ResumeUploadErrorPresentation {
  code?: ResumeUploadErrorCode
  title: string
  explanation: string
  action?: string
  creditNotice?: string
}

interface ResumeUploadErrorDefinition {
  title: string
  explanation: string
  action: string
}

const definitions: Record<ResumeUploadErrorCode, ResumeUploadErrorDefinition> = {
  SCANNED_PDF: {
    title: 'This PDF needs OCR',
    explanation: 'The document appears to be image-only, so PortfolioPilot cannot verify the resume text safely.',
    action: 'Run OCR on every page or export a searchable PDF, then upload the new file.',
  },
  PARTIALLY_SCANNED_PDF: {
    title: 'Some pages are not searchable',
    explanation: 'The PDF mixes readable text pages with scanned/image-only pages. Continuing could silently omit resume content.',
    action: 'OCR every page or export the entire resume as one fully searchable PDF.',
  },
  PASSWORD_PROTECTED_PDF: {
    title: 'This PDF is locked',
    explanation: 'PortfolioPilot cannot safely parse a password-protected or encrypted resume.',
    action: 'Export or save an unlocked copy of the PDF, then upload that copy.',
  },
  MALFORMED_PDF: {
    title: 'This PDF needs to be re-exported',
    explanation: 'The file structure is malformed, incomplete, or truncated, so its contents cannot be trusted.',
    action: 'Open the original document and export a fresh PDF before trying again.',
  },
  PDF_TOO_MANY_PAGES: {
    title: 'This PDF is too long for resume processing',
    explanation: 'PortfolioPilot limits resume/CV parsing to 50 pages so extraction stays bounded and verifiable.',
    action: 'Upload the resume/CV portion only, with 50 pages or fewer.',
  },
  UNREADABLE_PDF: {
    title: 'No reliable text layer was found',
    explanation: 'The PDF does not expose enough readable text for safe resume extraction.',
    action: 'Export a fresh searchable PDF and verify that its text can be selected before uploading it again.',
  },
  NOT_A_RESUME: {
    title: 'This document does not look like a resume',
    explanation: 'The uploaded PDF does not contain enough resume/CV structure for PortfolioPilot to analyze it safely.',
    action: 'Upload a resume or CV PDF that includes your identity plus experience, education, skills, projects, or similar career information.',
  },
}

function normalizeCode(value: unknown): ResumeUploadErrorCode | undefined {
  if (typeof value !== 'string') return undefined
  return Object.prototype.hasOwnProperty.call(definitions, value)
    ? value as ResumeUploadErrorCode
    : undefined
}

function normalizeMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function getResumeUploadErrorPresentation(
  payload: ResumeUploadErrorPayload,
  options: { paidAnalysis?: boolean } = {}
): ResumeUploadErrorPresentation {
  const code = normalizeCode(payload.code)
  const serverMessage = normalizeMessage(payload.message)
  const creditNotice = options.paidAnalysis && serverMessage && /credit (?:was )?refunded/i.test(serverMessage)
    ? 'Your analysis credit was refunded.'
    : undefined

  if (code) {
    const definition = definitions[code]
    return {
      code,
      title: definition.title,
      explanation: definition.explanation,
      action: definition.action,
      creditNotice,
    }
  }

  return {
    title: 'Resume upload could not be completed',
    explanation: serverMessage ?? 'PortfolioPilot could not verify this resume PDF safely.',
    action: 'Check the PDF and try again. If the file opens normally, export a fresh searchable copy first.',
    creditNotice,
  }
}

export function formatResumeUploadError(presentation: ResumeUploadErrorPresentation): string {
  return [
    presentation.title,
    presentation.explanation,
    presentation.action,
    presentation.creditNotice,
  ].filter(Boolean).join(' ')
}
