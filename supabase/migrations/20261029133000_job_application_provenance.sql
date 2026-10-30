ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS application_url TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS job_source TEXT CHECK (job_source IS NULL OR job_source IN ('jobvetta', 'greenhouse', 'remotive', 'jsearch', 'himalayas', 'demo')),
  ADD COLUMN IF NOT EXISTS closing_date DATE,
  ADD COLUMN IF NOT EXISTS deadline_provenance TEXT NOT NULL DEFAULT 'unknown'
    CHECK (deadline_provenance IN ('verified_source', 'user_entered', 'unknown'));

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_job_source_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_job_source_check
  CHECK (job_source IS NULL OR job_source IN ('jobvetta', 'greenhouse', 'remotive', 'jsearch', 'himalayas', 'demo'));
