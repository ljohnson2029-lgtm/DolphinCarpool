
-- 1) children.email column (case-insensitive)
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS email citext;

CREATE UNIQUE INDEX IF NOT EXISTS children_email_unique_idx
  ON public.children (email)
  WHERE email IS NOT NULL;

-- 2) Lookup function used by auth-create-student-account edge function
CREATE OR REPLACE FUNCTION public.find_parent_by_child_email(_email citext)
RETURNS TABLE (
  parent_id uuid,
  child_id uuid,
  first_name text,
  last_name text,
  grade_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.user_id   AS parent_id,
    c.id        AS child_id,
    c.first_name,
    c.last_name,
    c.grade_level
  FROM public.children c
  WHERE c.email = _email
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_parent_by_child_email(citext) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_parent_by_child_email(citext) TO service_role;
