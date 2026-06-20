-- Drop the foreign key constraint linking reviews to public.users
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;

-- Add a new foreign key constraint linking reviews directly to auth.users
-- This allows anonymous users (who don't have a public.users row) to save reviews
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
