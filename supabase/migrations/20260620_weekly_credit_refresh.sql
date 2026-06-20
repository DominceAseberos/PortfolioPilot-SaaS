-- ============================================================
-- Weekly credit refresh function
-- Called by the /api/cron/refresh-credits Vercel Cron endpoint.
-- Tops up credits for all verified (non-anonymous) users
-- without exceeding p_max_credits.
-- Returns the number of users whose credits were updated.
-- ============================================================

CREATE OR REPLACE FUNCTION public.weekly_credit_refresh(
  p_top_up     integer DEFAULT 3,
  p_max_credits integer DEFAULT 10
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.user_credits uc
  SET
    credits      = LEAST(uc.credits + p_top_up, p_max_credits),
    updated_at   = now()
  FROM auth.users u
  WHERE
    uc.user_id       = u.id
    -- Only refresh verified, non-anonymous users
    AND u.is_anonymous IS NOT TRUE
    AND u.email_confirmed_at IS NOT NULL
    -- Only refresh if they haven't hit the cap yet
    AND uc.credits < p_max_credits;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- Add updated_at column to user_credits if it doesn't exist
-- ============================================================
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ============================================================
-- Helper: reset credits for ALL anonymous users (run manually)
-- Use this in Supabase SQL Editor to wipe anonymous credit state
-- ============================================================

-- To reset ALL anonymous users to 0 credits, run:
-- UPDATE public.user_credits uc
-- SET credits = 0
-- FROM auth.users u
-- WHERE uc.user_id = u.id AND u.is_anonymous = TRUE;

-- To delete old anonymous users (older than 30 days), run:
-- DELETE FROM auth.users
-- WHERE is_anonymous = TRUE
--   AND created_at < now() - interval '30 days';
