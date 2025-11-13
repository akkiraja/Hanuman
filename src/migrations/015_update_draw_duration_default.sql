-- Migration: Update draws table duration default from 12s to 60s
-- Purpose: Extend lucky draw spinner duration to 60 seconds for better UX
-- Date: 2025-01-10

-- Update default value for duration_seconds column
ALTER TABLE public.draws 
  ALTER COLUMN duration_seconds SET DEFAULT 60;

-- Update constraint to allow up to 120 seconds (2 minutes)
ALTER TABLE public.draws 
  DROP CONSTRAINT IF EXISTS valid_duration;

ALTER TABLE public.draws 
  ADD CONSTRAINT valid_duration CHECK (duration_seconds > 0 AND duration_seconds <= 120);

-- Update comment to reflect new default
COMMENT ON COLUMN public.draws.duration_seconds IS 'How long the spinner should run (default 60s, max 120s)';

-- Rollback SQL (if needed):
-- ALTER TABLE public.draws ALTER COLUMN duration_seconds SET DEFAULT 12;
-- ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS valid_duration;
-- ALTER TABLE public.draws ADD CONSTRAINT valid_duration CHECK (duration_seconds > 0 AND duration_seconds <= 60);
-- COMMENT ON COLUMN public.draws.duration_seconds IS 'How long the spinner should run (default 12s)';
