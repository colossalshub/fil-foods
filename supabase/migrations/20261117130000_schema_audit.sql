-- Schema audit fixes (2026-11-17). Local only until the owner approves a remote push.
-- 1. meal_recipients had policies but RLS was never enabled, so any signed-in user could read every
--    meal recipient's name, contact number, email and address through the REST API.
-- 2. Plan prices (USR-20 A) lived only in the app: place_order ignored the chosen plan, so the
--    total the user confirmed (₱4,999 / ₱27,899 / ₱327,999) differed from the total saved and paid.
-- 3. "One meal per meal time, at most three meals per day" was only checked in the app.
-- 4. Order notifications did not follow the USR-25 wording or name the meal recipient for
--    Family Member accounts ("Order TRK-2026-0004 for Lia Dizon is now Out for Delivery.").
-- 5. Staff Help & Support messages were kept on the device only; help_feedback had no topic.

-- 1 ---------------------------------------------------------------------------------------
alter table public.meal_recipients enable row level security;

-- 2 ---------------------------------------------------------------------------------------
create table if not exists public.meal_plans (
  id text primary key check (id in ('weekly', 'monthly', 'yearly')),
  label text not null,
  price numeric(10,2) not null check (price > 0),
  period_days integer not null check (period_days > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.meal_plans (id, label, price, period_days, sort_order) values
  ('weekly', 'Weekly', 4999, 7, 1),
  ('monthly', 'Monthly', 27899, 30, 2),
  ('yearly', 'Yearly', 327999, 365, 3)
on conflict (id) do nothing;

alter table public.meal_plans enable row level security;
drop policy if exists meal_plans_read on public.meal_plans;
create policy meal_plans_read on public.meal_plans for select using (auth.uid() is not null);
drop policy if exists meal_plans_admin_write on public.meal_plans;
create policy meal_plans_admin_write on public.meal_plans for all
  using (public.is_owner_admin()) with check (public.is_owner_admin());

alter table public.orders add column if not exists plan_id text references public.meal_plans(id);
-- The meal time the user picked the meal for (Today's Meals can place a meal in another slot).
alter table public.order_items add column if not exists meal_time text;

-- 4 ---------------------------------------------------------------------------------------
-- "Order <ref>" or "Order <ref> for <recipient>" when the account orders for a family member.
create or replace function public.order_notice_subject(p_order public.orders)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'Order ' || p_order.tracking_number || coalesce(
    (select ' for ' || trim(r.first_name || ' ' || r.last_name)
     from public.meal_recipients r
     join public.profiles p on p.id = p_order.client_id and p.account_for = 'family'
     where r.id = p_order.meal_recipient_id),
    '');
$$;
revoke all on function public.order_notice_subject(public.orders) from public, anon, authenticated;

create or replace function public.record_order_status_change(
  p_order_id uuid,
  p_new_status public.order_status,
  p_title text default 'Order status changed',
  p_body text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_body text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if not public.validate_order_status_transition(v_order.fulfillment_type, v_order.status, p_new_status) then
    raise exception 'invalid_status_transition';
  end if;
  update public.orders
  set status = p_new_status, updated_at = now()
  where id = p_order_id
  returning * into v_order;
  insert into public.order_status_history (order_id, status, changed_by)
  values (p_order_id, p_new_status, auth.uid());
  v_body := coalesce(
    p_body,
    public.order_notice_subject(v_order) || ' is now ' || public.order_status_label(p_new_status) || '.'
  );
  insert into public.notifications (client_id, title, body, notification_type, order_id)
  values (v_order.client_id, p_title, v_body, 'status_changed', p_order_id);
  perform public.append_audit_event(
    'order_status_changed',
    jsonb_build_object('order_id', p_order_id, 'order_no', v_order.order_no, 'status', p_new_status)
  );
  return v_order;
end;
$$;
revoke all on function public.record_order_status_change(uuid, public.order_status, text, text) from public, anon, authenticated;

-- 2 + 3: place_order prices plans on the server and enforces the meal limits -----------------
drop function if exists public.place_order(uuid, public.fulfillment_type, timestamptz, text, text, jsonb);

create or replace function public.place_order(
  p_client_request_id uuid,
  p_fulfillment_type public.fulfillment_type,
  p_schedule timestamptz,
  p_address text,
  p_special_instructions text,
  p_items jsonb,
  p_plan_id text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_meal public.meals;
  v_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_lead_hours integer;
  v_conflict text;
  v_recipient_id uuid;
  v_plan public.meal_plans;
  v_slot text;
  v_slots text[] := '{}';
  v_day date := (p_schedule at time zone 'Asia/Manila')::date;
  v_booked text[];
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into v_order
  from public.orders
  where client_request_id = p_client_request_id and client_id = auth.uid();
  if found then return v_order; end if;

  if exists (
    select 1 from public.profiles
    where id = auth.uid() and (not is_active or not is_verified)
  ) then raise exception 'account_not_ready'; end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items_required';
  end if;

  if nullif(p_plan_id, 'standard') is not null then
    select * into v_plan from public.meal_plans where id = p_plan_id and is_active;
    if not found then raise exception 'plan_unavailable'; end if;
  end if;

  select coalesce((value #>> '{}')::integer, 24) into v_lead_hours
  from public.settings where key = 'lead_time_hours';

  if p_schedule < now() + make_interval(hours => v_lead_hours) then
    raise exception 'lead_time';
  end if;
  if not public.is_within_kitchen_hours(p_schedule) then
    raise exception 'kitchen_closed';
  end if;
  if p_fulfillment_type = 'delivery' then
    if nullif(trim(p_address), '') is null then raise exception 'address_required'; end if;
    select coalesce((value #>> '{}')::numeric, 0) into v_delivery_fee from public.settings where key = 'delivery_fee';
  end if;

  select meal_recipient_id into v_recipient_id from public.profiles where id = auth.uid();

  -- Meal times already booked by this account for the same day (Asia/Manila).
  select coalesce(array_agg(coalesce(oi.meal_time, m.category)), '{}') into v_booked
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.meals m on m.id = oi.meal_id
  where o.client_id = auth.uid()
    and o.status <> 'cancelled'
    and (o.schedule at time zone 'Asia/Manila')::date = v_day;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce((v_item->>'quantity')::integer, 0) <= 0 then
      raise exception 'bad_quantity';
    end if;
    if (v_item->>'quantity')::integer <> 1 then raise exception 'one_meal_per_time'; end if;
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid and is_available;
    if not found then raise exception 'meal_unavailable'; end if;
    v_slot := coalesce(nullif(v_item->>'meal_time', ''), v_meal.category);
    if v_slot in ('Breakfast', 'Lunch', 'Dinner') and (v_slot = any(v_slots) or v_slot = any(v_booked)) then
      raise exception 'one_meal_per_time';
    end if;
    v_slots := v_slots || v_slot;
    select c.allergen into v_conflict
    from public.meal_conflicts_with_client(auth.uid(), v_meal.id) c
    limit 1;
    if v_conflict is not null then
      raise exception 'allergen_conflict:%', v_conflict;
    end if;
    v_subtotal := v_subtotal + v_meal.price * (v_item->>'quantity')::integer;
  end loop;
  if cardinality(v_slots) + cardinality(v_booked) > 3 then raise exception 'max_meals_per_day'; end if;

  insert into public.orders (
    tracking_number, client_request_id, client_id, meal_recipient_id,
    fulfillment_type, schedule, address, special_instructions, delivery_fee, total, status, plan_id
  )
  values (
    'TRK-' || extract(year from now())::text || '-' ||
      lpad(nextval('public.orders_tracking_seq')::text, 4, '0'),
    p_client_request_id, auth.uid(), v_recipient_id,
    p_fulfillment_type, p_schedule,
    nullif(trim(p_address), ''), nullif(trim(p_special_instructions), ''),
    v_delivery_fee,
    coalesce(v_plan.price, v_subtotal) + v_delivery_fee,
    'for_dietitian_review',
    v_plan.id
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid;
    insert into public.order_items (order_id, meal_id, quantity, unit_price, meal_time)
    values (v_order.id, v_meal.id, (v_item->>'quantity')::integer, v_meal.price,
            coalesce(nullif(v_item->>'meal_time', ''), v_meal.category));
  end loop;

  insert into public.order_status_history (order_id, status, changed_by)
  values (v_order.id, 'for_dietitian_review', auth.uid());
  insert into public.notifications (client_id, title, body, notification_type, order_id)
  values (
    auth.uid(),
    'Order submitted',
    public.order_notice_subject(v_order) || ' was sent to the Dietitian for review.',
    'order_submitted',
    v_order.id
  );
  perform public.append_audit_event('order_created', jsonb_build_object('order_id', v_order.id, 'plan_id', v_plan.id));
  return v_order;
exception
  when unique_violation then
    select * into v_order from public.orders
    where client_request_id = p_client_request_id and client_id = auth.uid();
    if found then return v_order; end if;
    raise;
end;
$$;
revoke all on function public.place_order(uuid, public.fulfillment_type, timestamptz, text, text, jsonb, text) from public, anon;
grant execute on function public.place_order(uuid, public.fulfillment_type, timestamptz, text, text, jsonb, text) to authenticated;

-- 5 ---------------------------------------------------------------------------------------
alter table public.help_feedback add column if not exists topic text;

-- 6 ---------------------------------------------------------------------------------------
-- The user app never stored the Family Member's meal recipient, so staff saw the account holder
-- as the person receiving the meals. save_meal_recipient keeps one recipient per account, and a
-- profile can only point at its own recipient (before, a client could set any recipient id).
alter table public.meal_recipients add column if not exists relationship text;

create or replace function public.guard_profile_meal_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.meal_recipient_id is not null
     and new.meal_recipient_id is distinct from (case when tg_op = 'UPDATE' then old.meal_recipient_id end)
     and not exists (
       select 1 from public.meal_recipients
       where id = new.meal_recipient_id and account_holder_id = new.id
     ) then
    raise exception 'recipient_not_owned';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_meal_recipient on public.profiles;
create trigger profiles_guard_meal_recipient
  before insert or update of meal_recipient_id on public.profiles
  for each row execute procedure public.guard_profile_meal_recipient();

create or replace function public.save_meal_recipient(p_recipient jsonb)
returns public.meal_recipients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.meal_recipients;
  v_first text := nullif(trim(p_recipient->>'first_name'), '');
  v_last text := nullif(trim(p_recipient->>'last_name'), '');
  v_contact text := nullif(regexp_replace(coalesce(p_recipient->>'contact_number', ''), '\D', '', 'g'), '');
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if v_first is null or v_last is null then raise exception 'recipient_name_required'; end if;
  if v_contact is not null and v_contact !~ '^[0-9]{11}$' then raise exception 'invalid_contact'; end if;
  insert into public.meal_recipients (
    account_holder_id, first_name, middle_name, last_name, suffix, contact_number, email, address, relationship
  ) values (
    auth.uid(), v_first, nullif(trim(p_recipient->>'middle_name'), ''), v_last,
    nullif(trim(p_recipient->>'suffix'), ''), v_contact, nullif(trim(p_recipient->>'email'), ''),
    nullif(trim(p_recipient->>'address'), ''), nullif(trim(p_recipient->>'relationship'), '')
  )
  on conflict (account_holder_id) do update set
    first_name = excluded.first_name, middle_name = excluded.middle_name, last_name = excluded.last_name,
    suffix = excluded.suffix, contact_number = excluded.contact_number, email = excluded.email,
    address = excluded.address, relationship = excluded.relationship, updated_at = now()
  returning * into v_row;
  update public.profiles set account_for = 'family', meal_recipient_id = v_row.id
  where id = auth.uid() and (account_for is distinct from 'family' or meal_recipient_id is distinct from v_row.id);
  return v_row;
end;
$$;
revoke all on function public.save_meal_recipient(jsonb) from public, anon;
grant execute on function public.save_meal_recipient(jsonb) to authenticated;
