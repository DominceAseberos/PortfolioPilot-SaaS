-- ============================================================
-- Guest email capture table
-- Tracks emails used to unlock guest analysis results.
-- Prevents unlimited free scans by checking email reuse.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.guest_emails (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  ip_address  text,
  scan_count  integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- Index on email for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS guest_emails_email_idx ON public.guest_emails (lower(email));

-- Index on IP for rate limiting
CREATE INDEX IF NOT EXISTS guest_emails_ip_idx ON public.guest_emails (ip_address);

-- No RLS needed - this table is only accessed via service role from the API
