-- Add columns to reviews table for storing full analysis results
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS full_results JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS detected_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_types TEXT[] DEFAULT '{}';
