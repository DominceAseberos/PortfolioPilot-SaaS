export const ANALYSIS_COSTS = {
  PORTFOLIO: 1,
  GITHUB: 1,
  RESUME: 1,
} as const;

export const INITIAL_FREE_TOKENS = 5;

// You can fetch this from a database or API in the future
export const getAnalysisCost = (mode: 'portfolio' | 'github' | 'resume') => {
  return ANALYSIS_COSTS[mode.toUpperCase() as keyof typeof ANALYSIS_COSTS] || 1;
};
