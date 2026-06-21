
-- 1. users_table_password_hash_exposure: remove client-accessible SELECT policies on users
DROP POLICY IF EXISTS "Users can view own data only" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
COMMENT ON TABLE public.users IS 'Service role only. Client reads must go through public.users_safe view (excludes password_hash and login-tracking columns).';

-- 2. profiles_pending_request_sensitive_fields: drop pre-acceptance full-profile SELECT policies
DROP POLICY IF EXISTS "Users can view profiles of pending private ride request counter" ON public.profiles;
DROP POLICY IF EXISTS "Ride owners can view profiles of pending requesters" ON public.profiles;
COMMENT ON TABLE public.profiles IS 'Pre-acceptance counterparty display must use public.profiles_public view. Full profiles only readable after acceptance via accepted-status policies.';

-- 3. realtime_messages_no_rls: deny-all on realtime.messages (app uses postgres_changes only, not broadcast/presence)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all realtime broadcast and presence by default" ON realtime.messages;
CREATE POLICY "Deny all realtime broadcast and presence by default"
ON realtime.messages
FOR SELECT
TO authenticated
USING (false);
DROP POLICY IF EXISTS "Deny all realtime sends by default" ON realtime.messages;
CREATE POLICY "Deny all realtime sends by default"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 4. account_links_student_update_escalation: restrict status values
DROP POLICY IF EXISTS "Students can update link status" ON public.account_links;
CREATE POLICY "Students can update link status"
ON public.account_links
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (
  auth.uid() = student_id
  AND status = ANY (ARRAY['cancelled'::text, 'pending'::text])
);

-- 5. schools_any_authenticated_insert: restrict INSERT to admins
DROP POLICY IF EXISTS "Authenticated users can insert schools" ON public.schools;
CREATE POLICY "Only admins can insert schools"
ON public.schools
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. signup_verification_codes_no_policy: explicit deny-all + documentation
DROP POLICY IF EXISTS "Deny all client access" ON public.signup_verification_codes;
CREATE POLICY "Deny all client access"
ON public.signup_verification_codes
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
COMMENT ON TABLE public.signup_verification_codes IS 'Service-role only. Accessed exclusively by signup/verify edge functions. All client access denied via RLS.';
