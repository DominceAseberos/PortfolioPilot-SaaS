export const ANALYSIS_COSTS = {
  PORTFOLIO: 1,
  GITHUB: 1,
  RESUME: 1,
} as const;

export const INITIAL_FREE_TOKENS = 5;

// How many credits free (non-anonymous) users get refilled every week
export const WEEKLY_REFRESH_CREDITS = 3;

// Credits awarded when a user registers/logs in via the Claim button
export const CLAIM_BONUS_CREDITS = 6;

// Max credits a user can ever hold (prevents hoarding via weekly refresh)
export const MAX_FREE_CREDITS = 10;

// You can fetch this from a database or API in the future
export const getAnalysisCost = (mode: 'portfolio' | 'github' | 'resume') => {
  return ANALYSIS_COSTS[mode.toUpperCase() as keyof typeof ANALYSIS_COSTS] || 1;
};
