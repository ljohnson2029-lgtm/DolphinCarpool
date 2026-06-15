
-- Drop obsolete tables from the old signup system
DROP TABLE IF EXISTS public.verification_codes CASCADE;
DROP TABLE IF EXISTS public.verified_emails CASCADE;
DROP TABLE IF EXISTS public.parent_email_whitelist CASCADE;
DROP TABLE IF EXISTS public.approved_emails CASCADE;
DROP TABLE IF EXISTS public.banned_emails CASCADE;
DROP TABLE IF EXISTS public.access_requests CASCADE;

-- Drop now-unused helper functions
DROP FUNCTION IF EXISTS public.is_whitelisted_parent(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_student_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_valid_student_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_valid_parent_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_codes() CASCADE;

-- Convert any existing non-parent profiles to parent
UPDATE public.profiles SET account_type = 'parent' WHERE account_type <> 'parent';

-- Enable citext for case-insensitive code matching
CREATE EXTENSION IF NOT EXISTS citext;

-- New signup verification code table
CREATE TABLE public.signup_verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code citext NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Locked down: only the service role (used by the verify-signup-code edge function) may read
GRANT ALL ON public.signup_verification_codes TO service_role;
ALTER TABLE public.signup_verification_codes ENABLE ROW LEVEL SECURITY;
-- (no policies = no anon/authenticated access; service_role bypasses RLS)

CREATE TRIGGER update_signup_verification_codes_updated_at
  BEFORE UPDATE ON public.signup_verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial code
INSERT INTO public.signup_verification_codes (code, active) VALUES ('DOLPHIN2026', true);
