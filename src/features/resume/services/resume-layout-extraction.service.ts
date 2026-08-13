import { extractTextItems, getDocumentProxy } from 'unpdf'
import { formatLayoutLine, groupTextItemsIntoLines, type ResumeLayoutLine } from './resume-layout-geometry.service'
import { assignReadingOrder } from './resume-reading-order.service'
import type { ResumeTemplateContract } from '@/types/resume-template-contract'
import { inferResumeTemplateContract } from './resume-template-contract.service'
import { extractResumeGraphicStyle } from './resume-template-graphics.service'

export interface ResumeLayoutPage { pageNumber: number; columnCount: number; width?: number; height?: number; lines: ResumeLayoutLine[] }
export interface ResumePageDimensions { width: number; height: number }
export interface ResumeLayoutDocument {
  totalPages: number
  pages: ResumeLayoutPage[]
  plainText: string
  structuredText: string
  usedLayoutExtraction: boolean
  templateContract: ResumeTemplateContract
}

const DEFAULT_PAGE: ResumePageDimensions = { width: 595.28, height: 841.89 }

export function buildLayoutDocument(
  pageItems: Parameters<typeof groupTextItemsIntoLines>[0][],
  pageDimensions: ResumePageDimensions[] = []
): ResumeLayoutDocument {
  const pages = pageItems.map((items, index): ResumeLayoutPage => {
    const ordered = assignReadingOrder(groupTextItemsIntoLines(items))
    const dimensions = pageDimensions[index] ?? DEFAULT_PAGE
    return { pageNumber: index + 1, columnCount: ordered.columnCount, width: dimensions.width, height: dimensions.height, lines: ordered.lines }
  })
  const plainText = pages.map((page) => page.lines.map((line) => line.text).join('\n')).join('\n\n').trim()
  const structuredText = pages.map((page) => {
    const marker = `=== PAGE ${page.pageNumber}${page.columnCount > 1 ? ' · MULTI-COLUMN' : ''} ===`
    return `${marker}\n${page.lines.map(formatLayoutLine).filter(Boolean).join('\n')}`
  }).join('\n\n').trim()
  const templateContract = inferResumeTemplateContract({ totalPages: pages.length, pages })
  return { totalPages: pages.length, pages, plainText, structuredText, usedLayoutExtraction: true, templateContract }
}

export async function extractResumeLayout(buffer: Buffer): Promise<ResumeLayoutDocument> {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const pdf = await getDocumentProxy(uint8)
  try {
    const result = await extractTextItems(pdf)
    const pageDimensions = await Promise.all(result.items.map(async (_items, index) => {
      const page = await pdf.getPage(index + 1)
      const viewport = page.getViewport({ scale: 1 })
      return { width: viewport.width, height: viewport.height }
    }))
    const layout = buildLayoutDocument(result.items, pageDimensions)
    const firstPage = pageDimensions[0] ?? DEFAULT_PAGE
    try {
      layout.templateContract.graphics = await extractResumeGraphicStyle(pdf, firstPage.width, firstPage.height)
    } catch {
      // Graphic styling is optional metadata. Unsupported operators must never
      // downgrade otherwise-valid text/geometry extraction.
      layout.templateContract.graphics = undefined
    }
    return layout
  } finally {
    await pdf.destroy()
  }
}
