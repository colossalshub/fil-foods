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
5. `20261117100000_staff_modules.sql` (staff workflow, role-shaped reads, notifications, DIT-17)
6. `20261117110000_profile_email_sync.sql` (confirmed staff email changes reach `profiles`)

Then deploy the staff-management function: `npx supabase functions deploy admin-staff`.

## 2. Bootstrap staff (recommended)

From the **repo root**, with the **default Secret** key (never in the Expo app):

1. **Settings → API Keys** → row **default**
2. Copy **Secret** (`sb_secret_...`) — not the publishable key
3. If you only see legacy keys, use **Legacy** tab → **service_role** (`eyJ...`)

```powershell
cd E:\Documents\Projects\fil-foods
$env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_...."
node scripts/seed-staff-users.mjs
```

This creates/updates Auth users for the demo staff emails, password `Admin@2026`, and sets `profiles.role`:

| Email | Role |
|---|---|
| `admin@filfoods.ph` | `owner_admin` |
| `maria.santos@filfoods.ph` | `dietitian_staff` |
| `juan.delacruz@filfoods.ph` | `kitchen_staff` |
| `ana.reyes@filfoods.ph` | `delivery_staff` |
| `mark.peralta@filfoods.ph` | `delivery_staff` |

## 3. Manual alternative

Create users in **Authentication → Users**, then run [`staff_roles_by_email.sql`](./staff_roles_by_email.sql) in the SQL editor.

## 4. End-to-end check

1. Client: place order (lands in `for_dietitian_review`).
2. Dietitian: staff login → orders sync → **Awaiting Payment** or **Cancelled**.
3. Client: Pay when **Awaiting Payment**.
4. Kitchen: **Preparing** → ready states; Delivery: completion chain on delivery orders.

Dietitian customer allergies/conditions on order detail come from synced `profiles` + `client_health_items` when backend sync runs.