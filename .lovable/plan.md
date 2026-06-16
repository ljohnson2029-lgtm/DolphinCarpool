# Student Signup + Read-Only Student Experience

A big change across signup, profile, and rides. Splitting into 4 phases to match your prompt.

## Phase 1 — Database

1. Add `email citext` column to `public.children` (nullable, indexed). RLS already restricts who can read children; we'll add a narrow `SECURITY DEFINER` function `find_parent_by_child_email(email)` so the student-signup edge function can look up the parent without exposing the children table.
2. Add column to `profiles`: nothing new — `account_type='student'` already exists.
3. On successful student signup, write an `account_links` row (`student_id`, `parent_id`, status='approved') so existing "linked parent" queries (My Rides, family schedule, Profile) work unchanged.

## Phase 2 — Signup UI + Edge Function

- `src/pages/Register.tsx`: turn the landing step into two big buttons — **Sign Up as a Parent** (existing flow) and **Sign Up as a Student** (new flow). Add the note about contacting the parent.
- New `StudentRegister` step (inline in Register.tsx): email + password only, no code, no waivers.
- New edge function `auth-create-student-account`:
  1. Call `find_parent_by_child_email(email)`. If none → 404 with the prompt's exact error message.
  2. Create auth user (auto-confirm), create `profiles` row with `account_type='student'`, `profile_complete=true`, copy `first_name`/`last_name`/`grade_level` from the matching child record.
  3. Insert `account_links` row linking student → parent (status approved).
- Parent flow and verification code stay completely untouched.

## Phase 3 — Parent profile: child email field

- `src/components/profile/ParentProfileForm.tsx` (and wherever children are edited): add `email` input per child with label **"Child's Email (required for student account access)"** and the helper note. Required only if parent wants student access — i.e., optional in the form but validated as email format when filled.
- Persist to new `children.email` column.

## Phase 4 — Student app experience (read-only)

- **Navigation**: students already get the 5 tabs; verify Dashboard / Family Carpools / My Rides / Profile / menu all show. No changes expected beyond hiding action buttons.
- **Family Carpools (`FindRides.tsx` + `RidesList`/map components)**: use `isStudent(accountType)` from `src/lib/permissions.ts` to:
  - Hide all action buttons (Request to Join, Offer to Help, Send Direct Request/Offer, parent search bar).
  - Wrap the now-empty action area with a tooltip **"Ask your parent to manage rides"** (subtle, only on hover where a button would be).
  - Keep map, list, filters, radius, click-into-detail fully functional.
- **My Rides (`MyRides.tsx`)**: for students, use existing `useLinkedParentRides` hook (or `get_family_schedule` RPC) instead of own rides. Pending / Active sub-tabs, same card design. Hide every action button. Header note: *"These rides were scheduled by your parent…"*. Empty state copy updated.
- **Dashboard (`StudentDashboard.tsx`)**: refresh to show upcoming schedule list + two quick-action cards as specified.
- **Profile (`Profile.tsx` / `StudentProfileForm.tsx`)**: show Name (editable), Email, Grade Level. New "Linked Parent" card pulling from `account_links` + parent's `profiles` row (name, email, phone). Remove address, vehicle, children sections for students.
- **Hamburger menu**: ensure About / Safety / How It Works / Settings show for students (most likely already there; will trim any parent-only entries).

## Technical details

- New migration: `ALTER TABLE public.children ADD COLUMN email citext;` + unique partial index `WHERE email IS NOT NULL` + `find_parent_by_child_email` security-definer function returning `(parent_id uuid, child_id uuid, first_name text, last_name text, grade_level text)`.
- New edge function `supabase/functions/auth-create-student-account/index.ts` (CORS, zod validation, service-role admin createUser).
- Reuse `account_links` table — no new linking table.
- All student gating uses the existing `isStudent()` helper so we don't sprinkle string checks.
- No changes to parent verification code (`DOLPHIN2026` stays active).

## Out of scope

- I'm not changing the existing student profile-setup flow beyond making it skip for students created via this new route (they're marked `profile_complete=true` immediately).
- No bulk migration of existing students — this is for new signups.

Want me to proceed with all four phases in one go?
