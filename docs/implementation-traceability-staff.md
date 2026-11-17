# Staff modules — implementation traceability

Source of truth:
- Admin: [`docs/specs/admin-module.md`](./specs/admin-module.md) ([`FIL_Foods_Admin_Module.pdf`](./specs/FIL_Foods_Admin_Module.pdf), [handoff](../.github/Meal_Service_Admin_Module_AI_Agent_Handoff.md))
- Dietitian: [`docs/specs/dietitian-module.md`](./specs/dietitian-module.md) ([`FIL_Foods_Dietitian_Module.pdf`](./specs/FIL_Foods_Dietitian_Module.pdf), [handoff](../.github/Meal_Service_Dietitian_Module_AI_Agent_Handoff.md))
- Kitchen: [`docs/specs/kitchen-module.md`](./specs/kitchen-module.md) ([`FIL_Foods_Kitchen_Module.pdf`](./specs/FIL_Foods_Kitchen_Module.pdf), [handoff](../.github/Meal_Service_Kitchen_Module_AI_Agent_Handoff.md))
- Delivery: [`docs/specs/delivery-module.md`](./specs/delivery-module.md) ([`FIL_Foods_Delivery_Module.pdf`](./specs/FIL_Foods_Delivery_Module.pdf), [handoff](../.github/Meal_Service_Delivery_Module_AI_Agent_Handoff.md))

Cross-module map: [`docs/specs/meal-service-modules.md`](./specs/meal-service-modules.md). User client traceability: [`implementation-traceability.md`](./implementation-traceability.md).

Status values: **Done** — workflow implemented in the staff app and enforced by Supabase (RLS/RPC), covered by unit tests (`npm test`) and/or `supabase/tests/staff_workflow.test.sql`; **Missing** — no usable implementation for the core workflow; **Partial** — some UI or local prototype exists but at least one acceptance criterion is unmet or lacks verification; **Blocked** — cannot satisfy without backend, provider, or cross-app integration called out below.

## Shared staff implementation surface

| Surface | Location | Notes |
|---|---|---|
| Staff app shell | `frontend/src/admin/` | Role picker, per-role tabs, shared Orders / Order Details / Customer / Menu / Settings / Inbox screens (Poppins via `admin/ui/StaffText.tsx`) |
| Role rules | `frontend/src/admin/domain/roleAccess.ts` (+ `roleAccess.test.ts`) | Tabs, capabilities, order visibility & shaping, status buckets, one-step actions, nutrition tiles — mirrors the SQL helpers |
| Store / cache | `frontend/src/admin/data/store.ts` (+ `staffWorkflow.test.ts`) | Local demo data when Supabase is not configured; when signed in to Supabase it hydrates from the RPCs and every mutation goes to the server, then re-syncs |
| Supabase access | `frontend/src/lib/staffBackend.ts` (+ `staffBackend.test.ts`), `frontend/src/lib/staffAuth.ts` | Role-shaped RPCs (`staff_orders`, `staff_order_detail`, `staff_customers`, `staff_customer_detail`, `admin_audit_log`, `assign_delivery_staff`, `dietitian_review_order`, `decide_health_condition_removal`, `save_staff_notification_settings`, `transition_order_status`) and the `admin-staff` Edge Function |
| Database | `supabase/migrations/20261117100000_staff_modules.sql`, `supabase/functions/admin-staff/`, `supabase/tests/staff_workflow.test.sql` | Role helpers, RLS per role, order lifecycle, staff notifications, DIT-17 requests, audit triggers; 60 SQL checks |
| Staff auth | `frontend/src/lib/staffAuth.ts`, `scripts/seed-staff-users.mjs` | Backend-first sign-in when `EXPO_PUBLIC_SUPABASE_*` is set (role from `profiles.role`), remembered sessions restored and re-checked; local demo accounts otherwise |
| User ↔ staff order flow | `orders` + RPCs | One order record from the user app through Dietitian review, payment, Kitchen, Admin assignment and Delivery; status wording matches USR-21 |

## Story-level matrix (initial audit)

Criterion-level test mapping is still in progress. Do not mark a story complete until each numbered system requirement in the PDF has a passing test.

### Admin Module (ADM-01–ADM-21)

| Story | Status | Evidence / gaps |
|---|---|---|
| ADM-01 | Done | Role picker → Admin login; Supabase password sign-in decides the role (`staffAuth.ts`); wrong panel shows the panel message; Google sign-in remains local-only (Partial for Google). |
| ADM-02 | Done | Admin tabs Dashboard / Orders / Menu / Staff / Settings (`TABS.admin`); other roles never get Staff. |
| ADM-03 | Done | Forgot password → neutral "Check your email"; with Supabase the real reset email is sent (`sendStaffPasswordReset`). |
| ADM-04 | Partial | Remember me restores the Supabase session and re-checks the profile role/is_active; Google sign-in for staff is local demo only. |
| ADM-05 | Done | Bell inbox (`InboxScreen.tsx`) lists only this role's `staff_notifications` (RLS: own rows), marks read via `mark_staff_notification_read`, empty state copy per spec. |
| ADM-06 | Done | Settings matches Figma (profile card, Edit Profile, role locked). With Supabase the name is saved to `profiles`; a new email goes through Supabase's confirmation email and `sync_profile_email` copies it to `profiles` once confirmed. |
| ADM-07 | Done | Language / Appearance with Apply, saved per account on the device; no Notifications switch for Admin. |
| ADM-08 | Done | About and Help & Support screens; no ticket numbers. |
| ADM-09 | Done | Log out confirm → Supabase signOut + stored session cleared. |
| ADM-10 | Done | Four metrics computed from stored orders/menu (sales = paid stages only), recent orders, sales overview. |
| ADM-11 | Done | Filters All / Pending / Preparing / Delivered (buckets), fuzzy name + order-number search, list badges per spec; `staff_orders` RPC for live data. |
| ADM-12 | Done | Order Details: one-step status change or cancel (validated client + `transition_order_status`), assign / change Delivery Staff (`assign_delivery_staff`, delivery orders only), status history, audit. |
| ADM-13 | Done | Staff list per role; add staff calls the `admin-staff` Edge Function (invite email, profile role); duplicate email message. |
| ADM-14 | Done | Edit staff (name/email/role) with change preview; Edge Function updates auth email + profile. |
| ADM-15 | Done | Delete staff with confirm; cannot delete self; Edge Function bans the auth user, deactivates the profile and unassigns open orders. |
| ADM-16 | Done | Staff roles limited to Admin / Dietitian / Kitchen / Delivery; Admin role locked. |
| ADM-17 | Done | Menu add/edit writes `meals` (RLS `meals_staff_write`); user menu reads the same table; audit + menuUpdated notifications by trigger. |
| ADM-18 | Done | Availability switch and delete; meals already on past orders are made unavailable instead of hard-deleted. |
| ADM-19 | Done | Customers directory + Customer Details via `staff_customers` / `staff_customer_detail` (allergies with notes, levels, conditions, history; recipient vs account holder). |
| ADM-20 | Done | Audit log from `admin_audit_log` (append-only `audit_events`); covers staff, menu, order status/assignment/review, notification settings and DIT-17 decisions. |
| ADM-21 | Done | Staff notifications screen for Kitchen/Delivery types via `save_staff_notification_settings` (admin-only, audited); all OFF ⇒ role disabled; delivery and kitchen inboxes honour it. |

### Dietitian Module (DIT-01–DIT-17)

| Story | Status | Evidence / gaps |
|---|---|---|
| DIT-01 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-02 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-03 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-04 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-05 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Home & Navigation; shared store not wired to user Supabase. |
| DIT-06 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DIT-07 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DIT-08 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DIT-09 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-10 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Dashboard; shared store not wired to user Supabase. |
| DIT-11 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Allergies & Preferences; shared store not wired to user Supabase. |
| DIT-12 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Allergies & Preferences; shared store not wired to user Supabase. |
| DIT-13 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Customers; shared store not wired to user Supabase. |
| DIT-14 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Menu; shared store not wired to user Supabase. |
| DIT-15 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| DIT-16 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Access Control; shared store not wired to user Supabase. |
| DIT-17 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Health Information Approval; shared store not wired to user Supabase. |

### Kitchen Module (KIT-01–KIT-15)

| Story | Status | Evidence / gaps |
|---|---|---|
| KIT-01 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-02 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-03 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-04 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-05 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Home & Navigation; shared store not wired to user Supabase. |
| KIT-06 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| KIT-07 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for story; shared store not wired to user Supabase. |
| KIT-08 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| KIT-09 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-10 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Dashboard; shared store not wired to user Supabase. |
| KIT-11 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| KIT-12 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| KIT-13 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| KIT-14 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Customers; shared store not wired to user Supabase. |
| KIT-15 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Menu; shared store not wired to user Supabase. |

### Delivery Module (DEL-01–DEL-17)

| Story | Status | Evidence / gaps |
|---|---|---|
| DEL-01 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-02 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-03 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-04 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-05 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Home & Navigation; shared store not wired to user Supabase. |
| DEL-06 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DEL-07 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for story; shared store not wired to user Supabase. |
| DEL-08 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DEL-09 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-10 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Dashboard; shared store not wired to user Supabase. |
| DEL-11 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| DEL-12 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| DEL-13 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Customers; shared store not wired to user Supabase. |
| DEL-14 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Menu; shared store not wired to user Supabase. |
| DEL-15 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Delivery; shared store not wired to user Supabase. |
| DEL-16 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Delivery; shared store not wired to user Supabase. |
| DEL-17 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Delivery; shared store not wired to user Supabase. |

## Integration blockers (staff)

- Unify order status model across User PDF (review → payment → kitchen → delivery/pickup) and `frontend/src/admin` local statuses.
- Add Dietitian role to Supabase schema and RLS scopes (DIT-16, USR-41).
- Wire ADM-17/ADM-18 menu changes to User catalog reads (USR-16, USR-17).
- Implement ADM-12 ↔ DEL assignment and DEL-15–DEL-17 status updates on shared order records.
- ADM-20 audit log must include staff, menu, and order events per PDF; connect to existing audit chain in `supabase/`.
