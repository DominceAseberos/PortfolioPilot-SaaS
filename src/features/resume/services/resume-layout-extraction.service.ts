import { extractTextItems } from 'unpdf'
import { formatLayoutLine, groupTextItemsIntoLines, type ResumeLayoutLine } from './resume-layout-geometry.service'
import { assignReadingOrder } from './resume-reading-order.service'
import type { ResumeTemplateContract } from '@/types/resume-template-contract'
import { inferResumeTemplateContract } from './resume-template-contract.service'

export interface ResumeLayoutPage { pageNumber: number; columnCount: number; lines: ResumeLayoutLine[] }
export interface ResumeLayoutDocument {
  totalPages: number
  pages: ResumeLayoutPage[]
  plainText: string
  structuredText: string
  usedLayoutExtraction: boolean
  templateContract: ResumeTemplateContract
}

export function buildLayoutDocument(pageItems: Parameters<typeof groupTextItemsIntoLines>[0][]): ResumeLayoutDocument {
  const pages = pageItems.map((items, index): ResumeLayoutPage => {
    const ordered = assignReadingOrder(groupTextItemsIntoLines(items))
    return { pageNumber: index + 1, columnCount: ordered.columnCount, lines: ordered.lines }
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
  const result = await extractTextItems(uint8)
  return buildLayoutDocument(result.items)
}
