
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup','login')),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS two_factor_codes_email_idx ON public.two_factor_codes (email, purpose, used_at);

GRANT ALL ON public.two_factor_codes TO service_role;
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.two_factor_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
