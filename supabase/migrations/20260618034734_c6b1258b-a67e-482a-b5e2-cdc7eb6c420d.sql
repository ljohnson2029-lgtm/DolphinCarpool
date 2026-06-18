
-- 1. Remove broad SELECT policies on public.users that exposed password_hash and PII
DROP POLICY IF EXISTS "Students can view linked parents user data" ON public.users;
DROP POLICY IF EXISTS "Users can view pending private ride participant data" ON public.users;

-- 2. Replace JWT-claim-based service_role policies with proper role check
DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;
CREATE POLICY "Service role can manage roles"
  ON public.user_roles
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage links" ON public.student_parent_links;
CREATE POLICY "Service role can manage links"
  ON public.student_parent_links
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  AS PERMISSIVE
  FOR INSERT
  TO service_role
  WITH CHECK (true);
