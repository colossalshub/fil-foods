# Supabase backend

The migration in [`migrations/20261030131000_initial_schema.sql`](./migrations/20261030131000_initial_schema.sql) creates the client-facing schema, role model, RLS policies, audit chain, order status validation, and atomic `place_order` RPC required by USR-01–USR-42.

Apply it with the Supabase CLI:

```bash
npx supabase db push
```

If a migration reports `function digest(text, unknown) does not exist`, make sure the
migration uses `extensions.digest(...)`; Supabase installs `pgcrypto` functions in
the `extensions` schema.

The development status simulator is in [`seed/dev_status_simulator.sql`](./seed/dev_status_simulator.sql). It requires:

```sql
set app.environment = 'test';
```

before calling `dev_set_order_status`. Do not load that helper in production.

The mobile app uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The service-role key must never be placed in the app.

The client meal catalog is inserted by
[`migrations/20261030150000_seed_client_meal_catalog.sql`](./migrations/20261030150000_seed_client_meal_catalog.sql).
Run `supabase db push` after pulling this change before testing order placement.

Deploy the username login function separately:

```bash
npx supabase functions deploy login-by-username
```

Set `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` as Edge Function secrets. The service-role key is server-only and must never be committed or added to Expo environment variables.
