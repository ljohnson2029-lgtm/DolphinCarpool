---
name: Signup verification code flow
description: All new accounts are created via a shared community verification code stored in signup_verification_codes; emails verified through Supabase built-in confirmation link.
type: feature
---

Signup is gated by a single shared community code stored in `public.signup_verification_codes` (citext, `active` boolean). Multiple parents can reuse the same code; deactivate by setting `active = false`. Seed code: `DOLPHIN2026`.

Three-step register flow in `src/pages/Register.tsx`:
1. Enter community verification code (validated by `verify-signup-code` edge function, case-insensitive).
2. Account form — first/last/username/email/password/confirm/phone + 3 liability checkboxes. All required. Always parent account. Calls `auth-create-account` (revalidates code server-side and creates the auth user with `email_confirm: false`).
3. "Check your email" screen with Resend button — uses Supabase built-in `auth.resend({ type: 'signup', ... })`.

Login is plain `supabase.auth.signInWithPassword`; if Supabase reports the email isn't confirmed, the page surfaces a Resend confirmation link.

Forgot password uses `supabase.auth.resetPasswordForEmail` with redirect to `/reset-password`, which calls `supabase.auth.updateUser({ password })`.

Old systems removed: `parent_email_whitelist`, `approved_emails`, `banned_emails`, `verified_emails`, `access_requests`, `verification_codes` (6-digit 2FA codes), and the `auth-send-2fa`, `auth-verify-2fa`, `auth-check-email`, `submit-access-request`, `manage-access-requests`, `auth-reset-password` edge functions.
