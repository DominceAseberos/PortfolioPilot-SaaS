-- ============================================================
-- Auto-provision 3 credits for every new user (anon or real)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 3)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if already exists to avoid duplicate triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS: Allow anonymous (is_anonymous = true) users to insert
-- their own reviews. The existing SELECT policy already works
-- because auth.uid() = user_id holds for anonymous users too.
-- ============================================================

-- Allow any authenticated user (including anonymous) to insert their own reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reviews'
      AND policyname = 'Users can insert own reviews'
  ) THEN
    CREATE POLICY "Users can insert own reviews"
      ON public.reviews FOR INSERT
      WITH CHECK ( auth.uid() = user_id );
  END IF;
END $$;

-- Allow any authenticated user (including anonymous) to select their own reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reviews'
      AND policyname = 'Users can view own reviews'
  ) THEN
    CREATE POLICY "Users can view own reviews"
      ON public.reviews FOR SELECT
      USING ( auth.uid() = user_id );
  END IF;
END $$;

-- Allow any authenticated user to update own user_credits (for deduction via RPC)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_credits'
      AND policyname = 'Users can update own credits'
  ) THEN
    CREATE POLICY "Users can update own credits"
      ON public.user_credits FOR UPDATE
      USING ( auth.uid() = user_id );
  END IF;
END $$;

-- Allow any authenticated user to insert their own credits row
-- (needed for the trigger which runs as SECURITY DEFINER, but good to have)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_credits'
      AND policyname = 'Users can insert own credits'
  ) THEN
    CREATE POLICY "Users can insert own credits"
      ON public.user_credits FOR INSERT
      WITH CHECK ( auth.uid() = user_id );
  END IF;
END $$;
