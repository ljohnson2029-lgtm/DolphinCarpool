## Goal

Replace the current whitelist + Chadwick-domain + custom 6-digit email 2FA registration with a 3-step flow:
1. Enter a community verification code
2. Fill account form (always a parent)
3. Click email confirmation link (Supabase built-in)

Then continue to existing profile completion.

Existing users are kept and all converted to `parent`. Student-only code remains (dormant) — no new students will be created.

## Database changes (one migration)

1. Drop unused tables from the old system:
   - `parent_email_whitelist`
   - `approved_emails`
   - `banned_emails`
   - `access_requests`
   - `verified_emails`
   - `verification_codes` (old 6-digit email 2FA codes)
2. Drop now-unused DB functions: `is_whitelisted_parent`, `is_student_email`, `is_valid_student_email`, `is_valid_parent_email`, `cleanup_expired_codes`.
3. `UPDATE public.profiles SET account_type = 'parent' WHERE account_type <> 'parent';`
4. Create new table `public.signup_verification_codes`:
   - `id uuid pk`, `code citext unique not null`, `active boolean not null default true`, `created_at`, `updated_at`
   - GRANTs to `service_role` only (codes validated server-side via edge function); RLS enabled with no policies (locked).
5. Seed: `INSERT ('DOLPHIN2026', true)`.

## Auth configuration

- Call `supabase--configure_auth` with `auto_confirm_email: false`, `disable_signup: false`, `external_anonymous_users_enabled: false`, `password_hibp_enabled: true` so the email confirmation link is required.

## Edge functions

- **New** `verify-signup-code` (verify_jwt = false): accepts `{ code }`, case-insensitive lookup in `signup_verification_codes` where `active = true`, returns `{ valid: boolean }`. Rate-limited per IP (same pattern as existing functions).
- **Modify** `auth-create-account`: remove whitelist/Chadwick checks; require valid `signup_code` in body and re-validate it server-side; always set `account_type = 'parent'`; rely on Supabase to send the confirmation email (use admin createUser with `email_confirm: false`, or standard `signUp` server-side — keep current approach but drop role inference).
- **Delete** `auth-send-2fa`, `auth-verify-2fa`, `auth-check-email`, `submit-access-request`, `manage-access-requests` (old whitelist/2FA flow). Also delete their `config.toml` entries.

## Frontend changes

- **`src/pages/Register.tsx`** — rewrite as 3-step wizard:
  1. `code` step: single input + helper text + Continue button → calls `verify-signup-code`.
  2. `form` step: First/Last/Username/Email/Password/Confirm/Phone + 3 liability checkboxes (all required, red `*`, red error highlights). On submit, calls `auth-create-account` with `signup_code` included; on success goes to step 3.
  3. `check-email` step: "Check your email!" message with the entered email, plus a **Resend verification email** button that calls `supabase.auth.resend({ type: 'signup', email })`. No account-type selector anywhere.
- **`src/pages/Login.tsx`** — remove approval/whitelist pre-checks; rely on Supabase's "Email not confirmed" error and surface it with a "Resend confirmation" affordance.
- **`src/pages/EmailVerification.tsx`** + **`src/pages/AdminVerifiedEmails.tsx`** + **`src/pages/AdminApprovals.tsx`** + **`src/pages/RequestAccess.tsx`** — remove from routes in `src/App.tsx`; delete the files.
- Any nav links pointing to the deleted admin/request pages get removed.

## Memory updates

- Update `mem://index.md` Core: change "Registration gated by whitelist/@chadwickschool.org" → "Registration gated by a community verification code; all new accounts are parents."
- Drop now-obsolete memory references (whitelist, approval workflow, pre-verification, account-type assignment).

## Initial verification code

Using **`DOLPHIN2026`** as the default seed (user can change via direct DB update or by deactivating and adding a new row).

## Out of scope (left intact)

- Student dashboard, account links, family schedule, series student RPCs — no new students will be created, but existing data still works.
- Profile completion flow after email verification — unchanged.
- Password reset flow — unchanged.
