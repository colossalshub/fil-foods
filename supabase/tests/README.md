# Database checks

`staff_workflow.test.sql` walks one order through the whole staff lifecycle and checks role
boundaries (60 checks): client submit → Dietitian review (DIT-15) → payment (USR-20) → Kitchen
(KIT-11–KIT-13) → Admin assignment (ADM-12) → Delivery (DEL-15–DEL-17), plus ADM-21 notification
settings, DIT-17 condition-removal requests, audit log reads (ADM-20) and deactivated staff (ADM-16).

It runs against a **local, throwaway** Postgres 15+ database. `supabase_shim.sql` stands in for the
parts of Supabase the migrations use (`auth.users`, `auth.uid()`, roles, `extensions` schema,
`supabase_realtime` publication).

```bash
PGHOST=localhost PGPORT=5432 PGUSER=postgres supabase/tests/run-local.sh
```

With the Supabase CLI and Docker you can instead run `npx supabase start` and
`npx supabase db reset` (local only), then run `staff_workflow.test.sql` with `psql` as the
`postgres` user. Never run these files against the hosted project.
