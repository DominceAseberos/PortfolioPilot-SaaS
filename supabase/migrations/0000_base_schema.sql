-- Base Schema Reconstruction for PortfolioPilot

-- 1. users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and add basic policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  portfolio_url text,
  github_username text,
  resume_url text,
  overall_score integer,
  portfolio_score integer,
  github_score integer,
  resume_score integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: The extra columns like full_results, detected_name, and source_types 
-- will be added automatically by the subsequent migration `20240611_add_review_results.sql`.

-- Enable RLS and add basic policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reviews" ON public.reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- 3. reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  strengths text[] DEFAULT '{}',
  weaknesses text[] DEFAULT '{}',
  recommendations text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and add basic policies (Using join to reviews to check ownership)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = reports.review_id AND reviews.user_id = auth.uid())
);
CREATE POLICY "Users can insert own reports" ON public.reports FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = reports.review_id AND reviews.user_id = auth.uid())
);
CREATE POLICY "Users can update own reports" ON public.reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = reports.review_id AND reviews.user_id = auth.uid())
);
CREATE POLICY "Users can delete own reports" ON public.reports FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = reports.review_id AND reviews.user_id = auth.uid())
);
