import {
  RESUME_WORKFLOW_BUDGETS,
  startResumeWorkflowMeasure,
} from '@/features/resume/utils/resume-performance'

describe('resume workflow performance metrics', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('reports an operation within budget', () => {
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(250)

    const finish = startResumeWorkflowMeasure('optimization', 500)
    const metric = finish()

    expect(metric.durationMs).toBe(150)
    expect(metric.exceededBudget).toBe(false)
    expect(metric.budgetMs).toBe(500)
  })

  it('is idempotent and reports budget overruns', () => {
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(901)

    const finish = startResumeWorkflowMeasure('verification', 500)
    const first = finish()
    const second = finish()

    expect(first).toBe(second)
    expect(first.exceededBudget).toBe(true)
  })

  it('defines explicit budgets for every expensive resume operation', () => {
    expect(RESUME_WORKFLOW_BUDGETS.generation).toBeGreaterThan(0)
    expect(RESUME_WORKFLOW_BUDGETS.optimization).toBeGreaterThan(0)
    expect(RESUME_WORKFLOW_BUDGETS.verification).toBeGreaterThan(0)
  })
})
