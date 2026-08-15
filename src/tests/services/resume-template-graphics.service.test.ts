jest.mock('unpdf', () => ({
  getDocumentProxy: jest.fn(),
  getResolvedPDFJS: jest.fn(async () => ({
    OPS: {
      shadingFill: 1,
      setFillColorN: 2,
      paintImageXObject: 3,
      constructPath: 4,
      stroke: 5,
      fill: 6,
      eoFill: 7,
      closeStroke: 8,
      fillStroke: 9,
      eoFillStroke: 10,
      save: 11,
      restore: 12,
      transform: 13,
      setStrokeColorN: 14,
      paintInlineImageXObject: 15,
      paintImageMaskXObject: 16,
      paintImageMaskXObjectGroup: 17,
      paintInlineImageXObjectGroup: 18,
      paintImageXObjectRepeat: 19,
      paintImageMaskXObjectRepeat: 20,
      paintSolidColorImageMask: 21,
      setFillRGBColor: 22,
      setStrokeRGBColor: 23,
      setFillCMYKColor: 24,
      setStrokeCMYKColor: 25,
      setLineWidth: 26,
      setFont: 27,
      setLeading: 28,
      moveText: 29,
      setTextMatrix: 30,
      nextLine: 31,
      showText: 32,
    },
  })),
}))

import { extractResumeGraphicStyle } from '@/features/resume/services/resume-template-graphics.service'

describe('resume template graphic operator diagnostics', () => {
  it('reports unsupported raster, shading, special-color, and complex-vector operators', async () => {
    const page = {
      getOperatorList: async () => ({
        fnArray: [1, 2, 3, 4],
        argsArray: [[], [], [], [6, null, [0, 0, 100, 100]]],
      }),
    }
    const pdf = {
      getPage: async () => page,
    }

    const graphics = await extractResumeGraphicStyle(pdf as never, 595.28, 841.89)
    expect(graphics?.unsupportedFeatures).toEqual([
      'complex-vector-artwork',
      'gradient-or-shading',
      'pattern-or-special-color',
      'raster-image',
    ])
  })
})
