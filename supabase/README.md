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

Deploy the username login function separately:

```bash
npx supabase functions deploy login-by-username
```

Set `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` as Edge Function secrets. The service-role key is server-only and must never be committed or added to Expo environment variables.
