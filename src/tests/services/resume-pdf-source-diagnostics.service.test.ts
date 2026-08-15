jest.mock('unpdf', () => ({
  getResolvedPDFJS: jest.fn(async () => ({ OPS: { clip: 1, eoClip: 2 } })),
}))

import { inspectResumePdfSourceDiagnostics } from '@/features/resume/services/resume-pdf-source-diagnostics.service'

function fakePage(options: {
  width?: number
  height?: number
  rotate?: number
  text?: Array<{ str: string; dir?: string; transform?: number[] }>
}) {
  return {
    rotate: options.rotate ?? 0,
    getViewport: () => ({ width: options.width ?? 595.28, height: options.height ?? 841.89 }),
    getTextContent: async () => ({
      items: options.text ?? [
        { str: 'Readable resume text with enough characters for diagnostics.', dir: 'ltr', transform: [10, 0, 0, 10, 40, 700] },
      ],
    }),
    getOperatorList: async () => ({ fnArray: [] as number[] }),
    cleanup: () => undefined,
  }
}

describe('resume PDF source diagnostics', () => {
  it('detects mixed page rotations as a blocking fidelity limitation', async () => {
    const pages = [fakePage({ rotate: 0 }), fakePage({ rotate: 90 })]
    const result = await inspectResumePdfSourceDiagnostics({
      numPages: pages.length,
      getPage: async (pageNumber: number) => pages[pageNumber - 1],
    })

    const diagnostic = result.diagnostics.find((item) => item.code === 'mixed-page-rotations')
    expect(diagnostic?.severity).toBe('blocking')
    expect(diagnostic?.pages).toEqual([1, 2])
  })

  it('detects vertical text and repeated replacement characters without treating them as exact', async () => {
    const page = fakePage({
      text: [
        { str: 'Readable normal resume content for the main body.', dir: 'ltr', transform: [10, 0, 0, 10, 40, 700] },
        { str: '���', dir: 'ttb', transform: [0, 10, -10, 0, 20, 500] },
      ],
    })
    const result = await inspectResumePdfSourceDiagnostics({
      numPages: 1,
      getPage: async () => page,
    })

    expect(result.diagnostics.some((item) => item.code === 'vertical-text' && item.severity === 'limited')).toBe(true)
    expect(result.diagnostics.some((item) => item.code === 'text-decoding-anomaly' && item.severity === 'limited')).toBe(true)
    expect(result.verticalTextItems).toBe(1)
    expect(result.replacementCharacterCount).toBe(3)
  })

  it('blocks extreme and excessive source geometry deterministically', async () => {
    const page = fakePage({ width: 180, height: 1400 })
    const result = await inspectResumePdfSourceDiagnostics({
      numPages: 51,
      getPage: async () => page,
    })

    expect(result.diagnostics.some((item) => item.code === 'extreme-page-geometry' && item.severity === 'blocking')).toBe(true)
    expect(result.diagnostics.some((item) => item.code === 'excessive-page-count' && item.severity === 'blocking')).toBe(true)
  })
})
