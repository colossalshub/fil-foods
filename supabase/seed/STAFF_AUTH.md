# Staff Supabase accounts (User ↔ staff order sync)

Staff panels call `signInStaffToSupabase` after the local demo login. Live orders and menus load only when the same person exists in **Supabase Auth** with a matching `profiles.role`.

## 1. Run migrations

```bash
npx supabase db push --remote
```

Required order:

1. `20261115115000_user5_enum_values.sql`
2. `20261115120000_user5_module_integration.sql`
3. `20261115143000_sync_user5_menu_catalog.sql`
4. `20261115150000_help_feedback.sql`

## 2. Create Auth users (Dashboard → Authentication → Users)

Create one user per staff email you use in the app, for example:

| Email | `profiles.role` after step 3 |
|---|---|
| `admin@filfoods.ph` | `owner_admin` |
| `maria.santos@filfoods.ph` | `dietitian_staff` |
| `juan.delacruz@filfoods.ph` | `kitchen_staff` |
| `mark.peralta@filfoods.ph` | `delivery_staff` |

Use the same passwords you use in the staff login screen (demo default is documented in admin copy).

## 3. Set `profiles.role` (SQL editor)

Replace UUIDs with each Auth user's id:

```sql
update public.profiles set role = 'owner_admin' where email = 'admin@filfoods.ph';
update public.profiles set role = 'dietitian_staff' where email = 'maria.santos@filfoods.ph';
update public.profiles set role = 'kitchen_staff' where email = 'juan.delacruz@filfoods.ph';
update public.profiles set role = 'delivery_staff' where email = 'mark.peralta@filfoods.ph';
```

New Google or email sign-ups default to `client` until you run an update.

## 4. End-to-end check

1. Client: place order (lands in `for_dietitian_review`).
2. Dietitian: staff login → orders sync → **Awaiting Payment** or **Cancelled**.
3. Client: Pay when **Awaiting Payment**.
4. Kitchen: **Preparing** → ready states; Delivery: completion chain on delivery orders.

Dietitian customer allergies/conditions on order detail come from synced `profiles` + `client_health_items` when backend sync runs.