ALTER TABLE public.resume_analyses
  ADD COLUMN IF NOT EXISTS parsed_resume JSONB,
  ADD COLUMN IF NOT EXISTS analysis_payload JSONB;
