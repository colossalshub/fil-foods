-- Privacy review fixes (docs/privacy-review.md). Local only until the owner approves a remote push.

-- P1. meal_conflicts_with_client(any client, meal) was callable by anyone, including anon, and
--     returned that client's allergy names: a way to read anyone's health data by probing meals.
--     place_order still uses it internally; the app gets its own conflicts only.
revoke all on function public.meal_conflicts_with_client(uuid, uuid) from public, anon, authenticated;

create or replace function public.my_meal_conflicts(p_meal_id uuid)
returns table (allergen text)
language sql
stable
security definer
set search_path = public
as $$
  select c.allergen from public.meal_conflicts_with_client(auth.uid(), p_meal_id) c
  where auth.uid() is not null;
$$;
revoke all on function public.my_meal_conflicts(uuid) from public, anon;
grant execute on function public.my_meal_conflicts(uuid) to authenticated;

-- P2. append_audit_event was callable by anyone, so the audit log could be flooded or filled with
--     made-up events. Only server code (other functions, Edge Functions with the service key) and
--     the Admin through admin_audit_event may write it now.
revoke all on function public.append_audit_event(text, jsonb) from public, anon, authenticated;

create or replace function public.admin_audit_event(p_event_type text, p_details jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.is_owner_admin(), false) then raise exception 'not_authorized'; end if;
  if p_event_type !~ '^staff\.' then raise exception 'bad_event_type'; end if;
  return public.append_audit_event(p_event_type, coalesce(p_details, '{}'::jsonb));
end;
$$;
revoke all on function public.admin_audit_event(text, jsonb) from public, anon;
grant execute on function public.admin_audit_event(text, jsonb) to authenticated;

-- is_owner_admin() returned NULL (not false) for clients, so "if not is_owner_admin()" would let them
-- through. Policies treated NULL as false, but every caller is safer with a real boolean.
create or replace function public.is_owner_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() = 'owner_admin', false);
$$;

create or replace function public.is_dietitian_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() in ('dietitian_staff', 'owner_admin'), false);
$$;

-- P3. Internal helpers that anon or any user could call directly.
revoke all on function public.verify_audit_chain() from public, anon, authenticated;
revoke all on function public.order_was_paid(uuid) from public, anon, authenticated;
revoke all on function public.dev_set_order_status(uuid, public.order_status) from public, anon, authenticated;

-- P4. Kitchen and Delivery staff could read every client's Help & Support message. Only the Admin
--     answers support, so only the Admin (and each sender) reads them.
drop policy if exists help_feedback_staff_read on public.help_feedback;
create policy help_feedback_admin_read on public.help_feedback for select using (public.is_owner_admin());

-- P5. A client could rewrite their own profile email (it then no longer matched the login email,
--     and could squat another person's address so their sign-up said "already registered") or
--     the sign-in provider. Email changes go through Supabase's confirmation (sync_profile_email).
-- P0 (critical). This trigger was SECURITY DEFINER, so inside it current_user was always the
--     function owner (postgres) and the "server role" shortcut let every caller through: any
--     signed-in client could PATCH their own profile to role = 'owner_admin'. It now runs as the
--     caller (SECURITY INVOKER), so only real server roles and SECURITY DEFINER functions skip it.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
     or coalesce(auth.role(), '') = 'service_role'
     or coalesce(current_setting('app.privileged_profile_write', true), '') = 'on' then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.is_verified is distinct from old.is_verified
     or new.locked_at is distinct from old.locked_at
     or new.failed_attempts is distinct from old.failed_attempts
     or lower(new.email) is distinct from lower(old.email)
     or new.auth_provider is distinct from old.auth_provider then
    raise exception 'not_authorized' using hint = 'Role, account status, email and sign-in method can only be changed by the server.';
  end if;
  return new;
end;
$$;

-- P6. Clients could edit the wording of their own notifications; they may only mark them read.
revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- P7. Old login attempts (username + device) are kept no longer than 30 days.
create or replace function public.purge_old_login_attempts()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (delete from public.login_attempts where created_at < now() - interval '30 days' returning 1)
  select count(*)::integer from gone;
$$;
revoke all on function public.purge_old_login_attempts() from public, anon, authenticated;

-- P8. Kitchen and Delivery received each client's health conditions (diagnoses such as Diabetes or
--     HTN) with every order. KIT/DEL specs only need allergies, dietary restrictions and the
--     nutrition goals; conditions stay with the Admin and the Dietitian.
create or replace function public.client_dietary_info(p_client_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with items as (
    select item_type, value, reaction_note from public.client_health_items where client_id = p_client_id
  ),
  prefs as (
    select * from public.nutritional_preferences where client_id = p_client_id
  ),
  viewer as (
    select coalesce(public.current_staff_role() in ('kitchen_staff', 'delivery_staff'), false) as minimal
  )
  select jsonb_build_object(
    'allergies', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'note', reaction_note) order by value)
                           from items where item_type = 'allergy'), '[]'::jsonb),
    'conditions', case when (select minimal from viewer) then '[]'::jsonb
                       else coalesce((select jsonb_agg(value order by value) from items where item_type = 'condition'), '[]'::jsonb) end,
    'restrictions', coalesce((select jsonb_agg(value order by value) from items where item_type = 'restriction'), '[]'::jsonb),
    'nutrition', jsonb_build_object(
      'supplied', exists (select 1 from prefs),
      'lower_calories', coalesce((select lower_calories from prefs), false),
      'higher_protein', coalesce((select higher_protein from prefs), false),
      'lower_sodium', coalesce((select lower_sodium from prefs), false),
      'lower_sugar', exists (select 1 from items where item_type = 'restriction' and lower(value) like 'low%sugar%')
    ),
    'updated_at', greatest(
      (select max(updated_at) from public.client_health_items where client_id = p_client_id),
      (select updated_at from prefs)
    )
  );
$$;
revoke all on function public.client_dietary_info(uuid) from public, anon, authenticated;
