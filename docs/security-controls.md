# Draft checklist of recommended security controls

**F.I.L. FOODS Meal Management System**  
Relish, Group 4, III-BCSAD · IAS draft, 7 November 2026

Use this in the presentation. “Implemented” means the control is in the committed app or SQL migration. “Partial” means the control exists in the local app or in SQL, but it is not yet proven against a live Supabase project.

Repository: https://github.com/colossalshub/fil-foods

## Required by the course

| Control | What it does | Status | Where |
|---|---|---|---|
| Bcrypt password hashing | Stores a salted bcrypt hash (cost 12). The readable password is not kept. | Implemented in the app. Production sign-in is meant to move to Supabase Auth. | `frontend/src/services/securityService.js` (`hashPassword`, `comparePassword`); registration in `frontend/src/domain/registration.js` |
| Role-based access control | Client, staff, and admin are separate. A client cannot open a staff-only kitchen view. | Implemented. The app uses a bitmask (`client = 1`, `staff = 2`, `admin = 4`). The database uses a role enum plus row-level policies. | `frontend/src/services/securityService.js` (`ROLES`, `hasRole`, `requireRole`); `supabase/migrations/20261030131000_initial_schema.sql` (`app_role`, `is_staff`, RLS policies) |
| SHA-256 append-only audit log | Each event stores the previous event’s hash. Changing an old row breaks the chain. | Implemented in the app and in SQL. Not every story event writes a row yet. | `frontend/src/services/securityService.js` (`hashAuditEntry`, `appendAuditEvent`, `verifyAuditChain`); SQL functions `append_audit_event` and `verify_audit_chain` in the same migration. Direct table access is revoked from clients. |

## Also recommended for this app

| Control | What it does | Status | Where |
|---|---|---|---|
| Login lockout | Five wrong passwords lock the account. | Implemented on the local sign-in path. | `frontend/src/services/authService.js` |
| Attempt limit | At most 10 sign-in attempts per minute on this device. | Implemented on the local sign-in path. | `frontend/src/services/authService.js` |
| Session end | Without “keep me logged in,” the session ends when the app closes or after 15 minutes idle. A password reset bumps the session version so an old session is not restored. | Implemented locally. | `frontend/src/services/sessionPolicy.js` |
| Row-level security | A client can read their own profile, health rows, and orders. Meals are readable by a signed-in user. Audit, verification codes, and login attempts are not readable by the client. | Written in the migration. Still needs a two-account test on the hosted database. | `supabase/migrations/20261030131000_initial_schema.sql` |
| Allergy exclusion before a suggestion | A meal that matches a recorded allergen, dislike, or diet conflict is removed before the day solver runs. | Implemented. | `frontend/src/components/NutritionDayPanel.js` and `frontend/src/services/orderService.js` |
| Server-side allergen check on an order | Placing an order rechecks the meal against the client’s allergies inside the database. | Written in SQL. | `supabase/migrations/20261030140000_harden_order_and_auth_boundaries.sql` (`meal_conflicts_with_client`) |
| Terms acceptance | Registration is refused until the terms are accepted, and the time is stored. | Implemented. | `frontend/src/data/legal.js`, `frontend/src/services/authService.js` |
| Secrets stay off the phone | The app only receives the Supabase URL and the anon key. The service-role key is an Edge Function secret. | Documented. `.env` is not committed. A sample file is `frontend/.env.example`. | `supabase/README.md` |
| Verification codes | Codes should be hashed, single-use, and sent by SMS or email. | Partial. The local flow still accepts a fixed test code. | `frontend/src/services/verificationService.js` |
| Google sign-in | A real Google token should be checked before an account is linked. | Partial. The current Google button is a demo path. | `frontend/src/services/googleAuthService.js` |

## What to say if someone asks “is this production?”

The three course controls are in the repository and can be demonstrated: hash a password, reject a client from a staff action, and show that editing an audit entry fails `verifyAuditChain`. The database policies are in the migration and still need a live two-client test before they count as deployed.
