# Privacy and access review — F.I.L Foods (2026-11-17)

Scope: every table, RPC, trigger function, storage bucket and Edge Function in `supabase/`, the keys
the app ships with, and what each role can read. Checked against the local test database with all
migrations applied (`supabase/tests/run-local.sh`) and read-only anon probes of the live project.
Fixes are in `supabase/migrations/20261117150000_privacy_hardening.sql` (plus sign-up functions in
`20261117140000_live_signup.sql`) and are tested in `supabase/tests/auth_privacy.test.sql`.
**Neither migration is on the live project yet.**

Roles: **User** (client account holder), **Admin** (`owner_admin`), **Dietitian** (`dietitian_staff`),
**Kitchen** (`kitchen_staff`), **Delivery** (`delivery_staff`), **anon** (not signed in).

## Findings, most serious first

| # | Severity | Finding | Fix |
|---|---|---|---|
| P0 | **Critical (live now)** | Any signed-in user could make themselves Admin: `PATCH /rest/v1/profiles?id=eq.<own id> {"role":"owner_admin"}`. The guard trigger `protect_profile_privileged_columns` was `SECURITY DEFINER`, so inside it `current_user` was always the owner (`postgres`) and its "server role" shortcut let every caller through. Same for `is_active`, `is_verified`, `locked_at`. This has been possible since the first schema (2026-10-30); the 2026-11-17 guard did not close it. | Trigger is now `SECURITY INVOKER`; it also protects `email`, `auth_provider`, `failed_attempts`. Test: `P0` in `auth_privacy.test.sql`. |
| P1 | High | `meal_conflicts_with_client(client_id, meal_id)` was executable by anyone, including anon, and returned that client's allergy names — anyone's health data could be read by probing meals. | Revoked; `place_order` still uses it internally. New `my_meal_conflicts(meal_id)` for the signed-in user only. |
| P2 | High | `append_audit_event` was executable by anon and every user: the audit log could be flooded or filled with made-up events. | Revoked from anon/authenticated. Admin uses `admin_audit_event` (Admin only, `staff.*` events); `admin-staff` Edge Function updated. |
| P3 | Medium | `is_owner_admin()` / `is_dietitian_staff()` returned NULL (not false) for clients, so any `if not is_owner_admin()` check would let a client through. Policies treated NULL as false, so no live hole, but a trap for new code. | Both return a real boolean. |
| P4 | Medium | Kitchen and Delivery received each client's **health conditions** (e.g. Diabetes, HTN) with every order detail; the screens hid them but the data was sent. KIT/DEL specs only need allergies, restrictions and nutrition goals. | `client_dietary_info` returns `conditions: []` to Kitchen/Delivery. |
| P5 | Medium | Kitchen and Delivery could read every client's Help & Support message (`help_feedback`, free text that can contain health details). | Only the Admin (and the sender) can read them. |
| P6 | Medium | A user could rewrite their profile email directly, so it no longer matched the login email, or squat someone else's address so that person's sign-up said "already registered". | Email changes only via Supabase's confirmation (`auth.updateUser`), copied by `sync_profile_email`. App updated. |
| P7 | Low | `verify_audit_chain`, `order_was_paid`, `dev_set_order_status` were callable by anon. (`dev_set_order_status` refuses unless `app.environment = 'test'`.) | Revoked. |
| P8 | Low | Users could edit the text of their own notifications. | Users may only update `is_read`. |
| P9 | Low | `login_attempts` (username + device) had no retention. | `purge_old_login_attempts()` deletes rows older than 30 days (schedule it with pg_cron or run it from the dashboard). |
| P10 | Accepted (spec) | Account enumeration: USR-01/USR-04 require "already registered" / "No account found…" messages, so `check_signup_available` and `password_reset_status` (anon) reveal whether a username, email or number is registered. They return flags only, never account data, and staff accounts are excluded from reset. | Keep; consider a captcha (Supabase Auth supports hCaptcha/Turnstile) before launch. |
| P11 | Accepted (spec) | Lockout after 5 wrong passwords (USR-02) lets anyone lock another user's account by guessing. The per-device limit in `login-by-username` uses a device key sent by the app, so it is easy to bypass. | Keep for the capstone; for launch add captcha or IP-based limits. |
| P12 | Info | The sign-up and reset codes are sent by email only; there is no SMS provider. "Send code by SMS" shows "We could not send the code. Please try again or use the other method." | Configure an SMS provider to meet USR-33 fully. |

Already correct: RLS is on for every public table (checked by a test); every `SECURITY DEFINER`
function pins `search_path` (checked by a test); `meal_recipients` RLS turned on in
`20261117130000_schema_audit`; no storage buckets exist; anon reads zero rows of any personal table.

## Keys

- The app reads only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- No secret key is committed: `frontend/.env` is not tracked; the docs and `scripts/seed-staff-users.mjs`
  contain placeholders only. The service-role key is used only inside Edge Functions (as a secret) and
  in the seed script run from the owner's shell.

## Logging of personal data

- App: no `console.*` call prints user data (only a session-restore warning and modal-nesting errors).
- `audit_events` stores IDs and event types; staff events include staff name/email/role (Admin-only via `admin_audit_log`).
  Order and removal events can include a health condition name (DIT-17) — visible to the Admin only.
- `profile_change_history` keeps old/new values of the user's own profile edits (USR-07) and is readable only by that user.
- `login_attempts` keeps the username and device key (P9 retention).

## Edge Functions

| Function | Caller | Check | Personal data returned |
|---|---|---|---|
| `login-by-username` | anon | Username or email + password via Supabase Auth; lockout after 5 failures; "Please verify your account first." when the email is not confirmed | The caller's own profile and session after a correct password; the account email only after a correct password (to resend the code) |
| `admin-staff` | signed-in | Caller must be an active `owner_admin` (403 otherwise) | Staff records the Admin manages |

## Per-table access matrix (after the fixes)

R = read, W = write (insert/update/delete), — = none. "own" = rows of the signed-in user. "RPC" =
only through a role-checked function that returns a shaped subset. anon has no access to any table below.

| Table | User | Admin | Dietitian | Kitchen | Delivery |
|---|---|---|---|---|---|
| `profiles` | R/W own (not role, status, email, provider) | R all; W via `admin-staff` | RPC: names, email on orders | RPC: first name on orders | RPC: name, phone, address for assigned delivery orders |
| `meal_recipients` | R/W own | R all | RPC: name, email | RPC: first name | RPC: name, phone, address for assigned orders |
| `client_health_items` (allergies, conditions, restrictions) | R/W own (condition removal needs Dietitian) | R all | RPC for clients with open orders / removal requests | RPC: allergies + restrictions (no conditions) | RPC: allergies + restrictions (no conditions) |
| `nutritional_preferences`, `meal_preferences` | R/W own | RPC | RPC | RPC (goals only) | RPC (goals only) |
| `guardians` | R/W own | — | — | — | — |
| `orders` | R own; W via `place_order` / `pay_order` | R all; W via RPC | RPC all; review via RPC | RPC paid → completed; status via RPC | RPC assigned delivery orders; status via RPC |
| `order_items`, `order_status_history` | R own | R all | RPC | RPC (no prices) | RPC (no prices) |
| `notifications` | R own; W `is_read` only | — | — | — | — |
| `staff_notifications` | — | R own | R own | R own | R own |
| `health_condition_removal_requests` | R own; W via RPC | RPC | RPC (decide) | — | — |
| `help_feedback` | R/W own (insert) | R all | W own | W own | W own |
| `meals`, `meal_components` | R | R/W | R | R/W (KIT spec) | R/W (DEL spec) |
| `meal_plans` | R | R/W | R | R | R |
| `settings` | R | R/W | R | R | R |
| `profile_change_history` | R own | — | — | — | — |
| `audit_events` | — | R via `admin_audit_log` | — | — | — |
| `login_attempts`, `verification_codes` | — | — (service role only) | — | — | — |

## RPCs callable without signing in (anon)

`check_signup_available`, `password_reset_status` (flags/status words only). Every other RPC
either raises `not_authenticated` / `not_authorized` for anon or is not executable by anon.

## What still needs the owner

1. Approve applying `20261117140000_live_signup` and `20261117150000_privacy_hardening` to the live
   project and redeploying `login-by-username` and `admin-staff` (P0 is exploitable on live today).
2. After applying, check that no unexpected account has a staff role:
   `select id, email, role from profiles where role <> 'client' order by role;` (SQL editor).
3. Supabase dashboard → Authentication → Email Templates: put `{{ .Token }}` in "Confirm signup" and
   "Reset password" so users get the 6-digit code; set the email OTP expiry to 600 seconds (USR-33).
   Use custom SMTP for real users (the built-in sender is rate-limited and meant for testing).
