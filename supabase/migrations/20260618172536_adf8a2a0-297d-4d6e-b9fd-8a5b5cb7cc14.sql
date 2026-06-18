
CREATE TABLE public.password_reset_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email CITEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes(email);
CREATE INDEX idx_password_reset_codes_expires ON public.password_reset_codes(expires_at);
GRANT ALL ON public.password_reset_codes TO service_role;
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.password_reset_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
