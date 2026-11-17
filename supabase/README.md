# Supabase backend

The migration in [`migrations/20261030131000_initial_schema.sql`](./migrations/20261030131000_initial_schema.sql) creates the client-facing schema, role model, RLS policies, audit chain, order status validation, and atomic `place_order` RPC used by the User Module (USR-01–USR-50). Staff modules (ADM, DIT, KIT, DEL) in [`docs/specs/meal-service-modules.md`](../docs/specs/meal-service-modules.md) require additional schema work (Dietitian role, shared order workflow, staff auth). Recipient tables, Dietitian/payment workflow, feedback, and account deletion from the current spec are not fully covered by this migration. Story indexes: User [`docs/specs/user-module.md`](../docs/specs/user-module.md); staff [`docs/implementation-traceability-staff.md`](../docs/implementation-traceability-staff.md).

Apply migrations with the Supabase CLI (use `--remote` for the linked cloud project):

```bash
npx supabase db push --remote
```

**Enum safety:** `20261115115000_user5_enum_values.sql` must apply in its own migration before `20261115120000_user5_module_integration.sql` (Postgres cannot use new enum labels in the same transaction they were added).

If a migration reports `function digest(text, unknown) does not exist`, make sure the
migration uses `extensions.digest(...)`; Supabase installs `pgcrypto` functions in
the `extensions` schema.

The development status simulator is in [`seed/dev_status_simulator.sql`](./seed/dev_status_simulator.sql). It requires:

```sql
set app.environment = 'test';
```

before calling `dev_set_order_status`. Do not load that helper in production.

The mobile app uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The service-role key must never be placed in the app.

## Google sign-in

The app uses Supabase Auth's Google OAuth flow. To enable it:

1. In Google Cloud, configure the OAuth consent screen and create a **Web application** OAuth client.
   Add the callback URL shown on the Supabase Dashboard under **Authentication → Providers → Google**
   to the Google client's authorized redirect URIs.
2. Enable Google under **Authentication → Providers** in Supabase and enter that client ID and secret.
   Do not add the client secret to the app or its environment variables.
3. In Supabase **Authentication → URL Configuration**, allow `filfoods://auth/callback` as a redirect URL.
4. Configure the app's Supabase URL and anon key in `frontend/.env`, then apply the migrations:

   ```bash
   npx supabase db push
   ```

5. Build and install the app again after setting the `filfoods` scheme; native redirect schemes are
   compiled into the app. Expo Go uses a temporary `exp://` redirect instead, which must be allowed
   separately in Supabase and changes with the development host.

The Google button opens the real account chooser and stores the returned Supabase session. Existing
complete Supabase profiles can sign in. New Google accounts are created with an incomplete profile,
but the current onboarding screen still saves through the local sample store; finish Supabase-backed
onboarding before relying on new-account sign-up in production.

The client meal catalog is seeded by
[`migrations/20261030150000_seed_client_meal_catalog.sql`](./migrations/20261030150000_seed_client_meal_catalog.sql)
and synced to the current app menu (pastries, lunch/dinner plates, search fixtures) in
[`migrations/20261115143000_sync_user5_menu_catalog.sql`](./migrations/20261115143000_sync_user5_menu_catalog.sql).
Each row stores a `client_meal_key` that matches the frontend meal id used at checkout.
Apply all migrations with `supabase db push` before testing order placement or staff menu views.

Staff panels need Auth users with `profiles.role` (`dietitian_staff`, etc.). Migrations do not create them. After push, from the repo root:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "paste-from-dashboard-api-settings"
node scripts/seed-staff-users.mjs
```

Details: [`seed/STAFF_AUTH.md`](./seed/STAFF_AUTH.md). Staff demo password: `Admin@2026`.

## Staff modules (ADM / DIT / KIT / DEL)

[`migrations/20261117100000_staff_modules.sql`](./migrations/20261117100000_staff_modules.sql) adds the
shared staff workflow:

- `orders.order_no` (shown as `#00001`), delivery assignment, and the Dietitian review decision/reason.
- Role-shaped reads: `staff_orders()`, `staff_order_detail()`, `staff_customers()`, `staff_customer_detail()`.
  Kitchen/Delivery get first names and food only (no prices); only Admin and the assigned Delivery Staff
  get the delivery address. Staff no longer read `orders`/`profiles` tables directly (Admin still can).
- `dietitian_review_order()` (DIT-15), `assign_delivery_staff()` (ADM-12), role checks in
  `transition_order_status()` (KIT-13, DEL-17: Delivery Staff only on orders assigned to them).
- `health_condition_removal_requests` + `request_health_condition_removal()` /
  `decide_health_condition_removal()` (DIT-17, Dietitian only).
- `staff_notifications` (staff bells) driven by order/menu triggers and the ADM-21 settings
  (`save_staff_notification_settings()`), plus `admin_audit_log()` (ADM-20).
- Menu writes for Admin, Kitchen and Delivery (ADM-18, KIT-15, DEL-14); Dietitian is read-only (DIT-14).
- Security fixes: clients can no longer change their own `profiles.role`/account status, and
  `record_order_status_change()` is no longer callable directly (it let any signed-in user mark an order paid).

Staff management (ADM-13–ADM-16) needs the service-role key, so it is an Edge Function:

```bash
npx supabase functions deploy admin-staff
```

It uses the same `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` secrets as `login-by-username`.
New staff receive a Supabase invite email to set their password.

Local checks for all of this live in [`tests/`](./tests/README.md).

Deploy the username login function separately:

```bash
npx supabase functions deploy login-by-username
```

Set `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` as Edge Function secrets. The service-role key is server-only and must never be committed or added to Expo environment variables.
