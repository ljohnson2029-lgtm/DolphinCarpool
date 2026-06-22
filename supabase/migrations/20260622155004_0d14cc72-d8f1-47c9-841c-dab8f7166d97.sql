
-- 1. account_links: tighten UPDATE policies
DROP POLICY IF EXISTS "Students can update link status" ON public.account_links;
DROP POLICY IF EXISTS "Parents can update link status" ON public.account_links;

-- Requester can only cancel or keep pending their own request
CREATE POLICY "Requester can cancel own pending link"
ON public.account_links
FOR UPDATE
TO authenticated
USING (
  auth.uid() = requested_by
  AND auth.uid() IN (student_id, parent_id)
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = requested_by
  AND status IN ('cancelled', 'pending')
);

-- Recipient (the OTHER party, not the requester) can approve or deny
CREATE POLICY "Recipient can approve or deny link"
ON public.account_links
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (student_id, parent_id)
  AND auth.uid() IS DISTINCT FROM requested_by
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() IN (student_id, parent_id)
  AND auth.uid() IS DISTINCT FROM requested_by
  AND status IN ('approved', 'denied')
);

-- Trigger: prevent modifying any column other than status/updated_at
CREATE OR REPLACE FUNCTION public.account_links_restrict_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_id   IS DISTINCT FROM OLD.student_id
   OR NEW.parent_id   IS DISTINCT FROM OLD.parent_id
   OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
   OR NEW.created_at  IS DISTINCT FROM OLD.created_at
   OR NEW.id          IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only the status column may be updated on account_links';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS account_links_restrict_columns_trg ON public.account_links;
CREATE TRIGGER account_links_restrict_columns_trg
BEFORE UPDATE ON public.account_links
FOR EACH ROW
EXECUTE FUNCTION public.account_links_restrict_columns();

-- 2. users table: add safe self-read policy + revoke password_hash column access
-- Revoke any blanket SELECT, then grant only the safe columns.
REVOKE SELECT ON public.users FROM anon, authenticated;
GRANT SELECT (user_id, email, username, first_name, last_name, phone_number, is_verified, created_at, last_login)
  ON public.users TO authenticated;

-- Explicit self-read policy so PostgREST allows the row through RLS for the owner only
CREATE POLICY "Users can read their own record (no password_hash)"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
