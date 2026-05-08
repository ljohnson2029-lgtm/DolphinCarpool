-- Restrict column-level SELECT on sensitive auth columns in public.users
REVOKE SELECT (password_hash, failed_login_attempts, last_failed_login, last_login) ON public.users FROM authenticated, anon;

-- Restrict column-level SELECT on verification codes in student_parent_links
REVOKE SELECT (verification_code, code_expires_at) ON public.student_parent_links FROM authenticated, anon;