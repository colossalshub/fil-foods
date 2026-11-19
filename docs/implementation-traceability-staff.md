# Staff modules — implementation traceability

Source of truth:
- Admin: [`docs/specs/admin-module.md`](./specs/admin-module.md) ([`FIL_Foods_Admin_Module.pdf`](./specs/FIL_Foods_Admin_Module.pdf), [handoff](../.github/Meal_Service_Admin_Module_AI_Agent_Handoff.md))
- Dietitian: [`docs/specs/dietitian-module.md`](./specs/dietitian-module.md) ([`FIL_Foods_Dietitian_Module.pdf`](./specs/FIL_Foods_Dietitian_Module.pdf), [handoff](../.github/Meal_Service_Dietitian_Module_AI_Agent_Handoff.md))
- Kitchen: [`docs/specs/kitchen-module.md`](./specs/kitchen-module.md) ([`FIL_Foods_Kitchen_Module.pdf`](./specs/FIL_Foods_Kitchen_Module.pdf), [handoff](../.github/Meal_Service_Kitchen_Module_AI_Agent_Handoff.md))
- Delivery: [`docs/specs/delivery-module.md`](./specs/delivery-module.md) ([`FIL_Foods_Delivery_Module.pdf`](./specs/FIL_Foods_Delivery_Module.pdf), [handoff](../.github/Meal_Service_Delivery_Module_AI_Agent_Handoff.md))

Cross-module map: [`docs/specs/meal-service-modules.md`](./specs/meal-service-modules.md). User client traceability: [`implementation-traceability.md`](./implementation-traceability.md).

Status values: **Done** — workflow implemented in the staff app and enforced by Supabase (RLS/RPC), covered by unit tests (`npm test`) and/or `supabase/tests/staff_workflow.test.sql`; **Missing** — no usable implementation for the core workflow; **Partial** — some UI or local prototype exists but at least one acceptance criterion is unmet or lacks verification; **Blocked** — cannot satisfy without backend, provider, or cross-app integration called out below.

## Revised workbook (2026-11-19)

The module workbook was revised on 2026-11-19 (canonical exports refreshed from it). Changes that touch the staff app, and their state:

| Story | Change in the revised workbook | State |
|---|---|---|
| KIT-15, ADM-18, ADM-17 | Admin owns menu details (add/edit/delete); Kitchen only sets availability and Admin is notified; Admin views availability | Done — migration `20261119100000_menu_ownership.sql` (Admin-only write policies, `set_meal_availability` RPC for Kitchen, Admin bell on Kitchen changes). Owner decision: the database keeps Admin full write; the Admin screen shows availability read-only (ADM-18 D) and new items start Unavailable until Kitchen turns them on. |
| DEL-14, DEL-10 | DEL-14 removed: Delivery has no menu; Dashboard shows no menu card | Done — Delivery tabs are Dashboard, Orders, Settings; no write access in RLS or the RPC. |
| ADM-11, KIT-11, DEL-11, DEL-17 | Shared order reference `ORD-YYYY-NNNN`; `TRK-YYYY-NNNN` is the separate delivery tracking number | Done — `20261119110000_order_reference.sql`; staff lists, details, bells and audit labels show ORD- (via `order_display_no`); search finds "0350", "ORD-2026-0350" or "TRK-2026-0350". |
| KIT-11, KIT-12, postcondition | Kitchen sees only orders with confirmed payment (owner decision: COD orders are an exception) | Done — `20261119120000_staff_queues.sql`: `staff_can_see_order` requires `order_cleared_for_kitchen` (paid in the status history); `transition_order_status` refuses unpaid orders (`payment_not_confirmed`). COD exception pending: no COD orders exist until payments; it is a one-line addition to `order_cleared_for_kitchen`. |
| DEL-11, DEL-17 | Delivery sees only Ready for Pickup orders assigned to them | Done — same migration: assigned delivery orders appear only from Ready for Pickup (then Out for Delivery, Completed); moves on earlier orders raise `order_not_ready`. |
| DIT-15 | A returned order uses the status "Returned for Changes" and comes back for approval after the user resubmits | Pending |
| DIT-17 | Removed from the workbook. **Kept as an extra beyond spec** (owner decision 2026-11-19) | Beyond spec |
| ADM-20 | AC 1 (which named DIT-17) removed; the audit log still records condition-removal decisions as part of the extra | Beyond spec |
| ADM-19, DIT-12, KIT-12, KIT-14, DEL-12, DEL-13 | Sodium is calculated per meal from ingredient sodium and compared with the recipient's limit (owner decision: default limit 400 mg per meal) | Not started (large) |
| ADM-17, KIT-15 | Five food items per day, grouped by Breakfast, Lunch and Dinner | Not started (large) |

Inconsistencies inside the revised workbook (recorded, not reinterpreted): DEL-02 still lists a Menu tab and KIT-10 still shows "Menu Management … Manage your menu items" with Edit buttons (implemented: the Delivery tab bar has no Menu; Kitchen "Edit" opens the availability list); ADM-18 D says Admin cannot change availability, while the owner asked for Admin full write (implemented: database allows it, Admin screen is view-only); KIT-11/DEL-11 samples list Pending, Cancelled and Delivered orders although only paid / assigned Ready for Pickup orders may appear; search samples still find `ORD-2026-0002` by typing "350"; KIT-11 and DEL-11 each have two "AC 1." lines; ADM-20 now starts at AC 2.

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
| ADM-18 | Done | Edit details and delete; availability shown read-only with "Availability is set by Kitchen Staff." (new wording). Meals already on past orders are made unavailable instead of hard-deleted. |
| ADM-19 | Done | Customers directory + Customer Details via `staff_customers` / `staff_customer_detail` (allergies with notes, levels, conditions, history; recipient vs account holder). |
| ADM-20 | Done | Audit log from `admin_audit_log` (append-only `audit_events`); covers staff, menu, order status/assignment/review, notification settings and DIT-17 decisions. |
| ADM-21 | Done | Staff notifications screen for Kitchen/Delivery types via `save_staff_notification_settings` (admin-only, audited); all OFF ⇒ role disabled; delivery and kitchen inboxes honour it. |

### Dietitian Module (DIT-01–DIT-16, plus DIT-17 beyond spec)

| Story | Status | Evidence / gaps |
|---|---|---|
| DIT-01 | Done | Shared staff sign-in (`StaffLoginScreen`, `lib/staffAuth.ts`): Dietitian role card, Supabase password sign-in, role check against `profiles.role`. |
| DIT-02 | Done | Shared forgot / reset password flow (`AuthScreens.tsx`) with Supabase recovery email. |
| DIT-03 | Done | Wrong email / wrong password messages from `signInStaffToSupabase` reasons; disabled accounts refused. |
| DIT-04 | Partial | Remember me and session restore (`restoreStaffSession`); Google sign-in for staff stays local only. |
| DIT-05 | Done | `RoleApp` tabs Dashboard, Orders, Menu, Settings (no Staff tab); `homeRouteFor` routes the Dietitian there after sign-in. |
| DIT-06 | Done | Edit Profile (name, email change via Supabase confirmation + `sync_profile_email` trigger). |
| DIT-07 | Done | Dietitian-only Notifications switch in Settings (`prefs.notifications`); bell dot respects unread notices; removal requests stay listed when OFF. |
| DIT-08 | Done | Shared Help & Support and About screens (`SettingsScreen.tsx`). |
| DIT-09 | Done | Shared logout card; `signOut` ends the Supabase session and clears stored sign-in. |
| DIT-10 | Done | `DietitianDashboardScreen`: "Dietitian" / "Nutrition Specialist" header, greeting, Allergies / Customer Preferences tiles, Condition Removal Requests card with pending count, Orders for review card, Menu Overview grid with View All. No sales figures. |
| DIT-11 | Done | `AllergiesPreferencesScreen`: view-only chips Peanuts, Shellfish, Dairy, Eggs, Gluten, Other with customer counts (`domain/dietitian.ts`). |
| DIT-12 | Done | Preferred Nutritional Levels tiles (level + range, "n of m customers") with the spec footer; same tiles on Customer Details. Ranges derived from yes/no goals (see inconsistencies). |
| DIT-13 | Done | Directory "Customer Preferences" / "Choose a customer"; Customer Details with allergies, tiles and full Order History (each row opens the order). No address or payment shown. |
| DIT-14 | Done | Shared `MenuScreen` is view-only for the Dietitian (no add/edit/delete/availability); tapping an item shows the read-only review with "Use verified data before recommending." Server blocks writes (`meals_staff_write` RLS excludes the Dietitian). |
| DIT-15 | Done | `ReviewPanel` on Order Details: order review details (meals, customizations, allergies, conditions, doctor restrictions), Approve (→ Awaiting Payment) and Return for changes with a required reason (`dietitian_review_order` RPC, recorded in audit). |
| DIT-16 | Done | No Staff tab or sales cards; direct links to staff-only screens show "You do not have access to this page."; RLS/RPCs reject other roles. |
| DIT-17 | Done (beyond spec) | Condition Removal Requests list (pending oldest first / decided), request detail with recipient context, Approve / Reject with reason, "already decided" guard. User profile edits now file a request instead of deleting the condition; DB trigger `guard_health_condition_removal` blocks direct client deletes. |

### Kitchen Module (KIT-01–KIT-15)

| Story | Status | Evidence / gaps |
|---|---|---|
| KIT-01 | Done | Shared Select Your Role screen; "Kitchen Staff" card opens the role log in. |
| KIT-02 | Done | Shared Supabase password sign-in with role check; lands on `RoleApp` (`homeRouteFor`). |
| KIT-03 | Done | Shared password recovery through the account email. |
| KIT-04 | Partial | Google sign-in for staff stays local only (no Supabase Google provider for staff yet). |
| KIT-05 | Done | Bell opens the shared Notifications inbox filtered to the kitchen audience (orders paid, menu changes); "You’re all caught up." empty state; no on/off switch. |
| KIT-06 | Done | Shared Settings / Edit Profile (own name and email only). |
| KIT-07 | Done | Language and appearance in Preferences; notifications controlled by Admin (ADM-21) hint. |
| KIT-08 | Done | Shared Help & Support and About screens. |
| KIT-09 | Done | Shared logout card and session end. |
| KIT-10 | Done | `KitchenDashboardScreen`: "Kitchen Staff" / "Kitchen Panel", greeting, View Orders card (paid queue count), Menu Management with View All and five items with Edit. No sales or staff figures. |
| KIT-11 | Done | Shared Orders list shaped for kitchen: first name, Order ID, date and bucket badge only; fuzzy first-name / exact-partial Order ID search combined with filters (`searchRoleOrders`). Only Dietitian-approved and paid orders are listed (server `staff_orders`). |
| KIT-12 | Done | Order Details without prices, last name, email or payment; Customer Preferences (allergies, dietary, levels) shown above the action. |
| KIT-13 | Done | "Start Preparing" (Paid → Preparing) and "Mark Ready for Pickup" (→ Ready for Delivery, or Ready for Pickup for pick-up orders) with confirmations; server `transition_order_status` enforces role and order. |
| KIT-14 | Done | Customer Details for kitchen: initial, first name, email, allergies and levels; no history or address. |
| KIT-15 | Done | Revised: `MenuScreen` shows Kitchen only the availability switch (no add, edit or delete); saving calls `set_meal_availability` and shows "Menu item updated. Your permitted availability change was saved."; the Admin is notified. |

### Delivery Module (DEL-01–DEL-17)

| Story | Status | Evidence / gaps |
|---|---|---|
| DEL-01 | Done | Shared Select Your Role screen; "Delivery Staff" card opens the role log in. |
| DEL-02 | Done | Shared Supabase password sign-in with role check; lands on `RoleApp`. |
| DEL-03 | Done | Shared password recovery through the account email. |
| DEL-04 | Partial | Google sign-in for staff stays local only. |
| DEL-05 | Done | Bell opens Notifications for the delivery audience, only for orders assigned to this person (ready for pickup, assignment). |
| DEL-06 | Done | Shared Settings / Edit Profile. |
| DEL-07 | Done | Language and appearance; notifications set by Admin (ADM-21). |
| DEL-08 | Done | Shared Help & Support and About screens. |
| DEL-09 | Done | Shared logout card and session end. |
| DEL-10 | Done | `DeliveryDashboardScreen`: "Delivery Staff" / "Delivery Panel", greeting, View Orders (assigned count), Ready for Pickup list. Revised: no Menu Management card. Figma "Dispatch dashboard" frame is off-system, so the spec layout was used. |
| DEL-11 | Done | Orders list limited to delivery orders assigned to this person; first name, Order ID, date and "Ready for Pickup" / "Out for Delivery" badges; same fuzzy search rules as Kitchen. |
| DEL-12 | Done | Order Details without prices, last name, email or payment; allergies and preferences shown before the delivery actions; no Start Preparing. |
| DEL-13 | Done | Customer Details: initial, first name, email, allergies, levels; no history or address. |
| DEL-14 | Removed (revised workbook) | Delivery Menu tab, dashboard card and menu write access removed (`20261119100000_menu_ownership.sql`). |
| DEL-15 | Done | "Delivery Address" card (first name, contact number, full address, notes) for Admin and the assigned Delivery Staff only; server `staff_order_detail` strips it for other roles. |
| DEL-16 | Partial | No in-app map library yet: shows "Location not available" with the address text, an "Open in Maps" button (device maps navigation) and Call. |
| DEL-17 | Done | "Collect order & start delivery" (Ready for Delivery → Out for Delivery) and "Mark Completed" with confirmations, only on assigned orders; status history records date and time and is visible to Admin and the user tracking screen. |

## Integration status (staff)

- Done: one order status model across User and staff (review → payment → kitchen → delivery/pickup), enforced by `transition_order_status`.
- Done: Dietitian role in Supabase with RLS and RPC scopes (DIT-16, USR-41).
- Done: ADM-17/18 menu edits reach the user catalog (availability, price, ingredients, allergens via `client_meal_key`). Gap: a brand-new staff-created meal shows in staff menus only, because the user menu is a curated catalog keyed by `client_meal_key`.
- Done: ADM-12 assignment ↔ DEL-15–17 status updates on shared order records.
- Done: ADM-20 audit log covers staff, menu, order and DIT-17 events on the existing audit chain.
- Done (schema audit, migration 20261117130000): plan price is set by the server (`meal_plans`), meal limits are enforced by `place_order`, Family Member recipients are stored (`save_meal_recipient`), `meal_recipients` RLS is on, staff Help & Support messages reach `help_feedback` with a topic.
- Open: the sugar goal is derived from a "Low-sugar" restriction because the User module only offers calorie, protein and sodium preferences; `order_status` value `issue` is unused; there is no payment record (pay_order only changes the status).
- Open: DEL-16 in-app map (no map library yet); staff Google sign-in (ADM-04, DIT-04, KIT-04, DEL-04) is local only.
