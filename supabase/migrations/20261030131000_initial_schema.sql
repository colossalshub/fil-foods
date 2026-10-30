create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.app_role as enum ('client', 'owner_admin', 'kitchen_staff', 'delivery_staff');
create type public.fulfillment_type as enum ('delivery', 'pick_up');
create type public.order_status as enum (
  'confirmed',
  'preparing',
  'ready_for_delivery',
  'out_for_delivery',
  'ready_for_pick_up',
  'completed',
  'cancelled',
  'issue'
);
create type public.verification_purpose as enum ('registration', 'password_reset', 'contact_change');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'client',
  username text unique,
  first_name text not null,
  middle_name text,
  last_name text not null,
  suffix text,
  contact_number text unique,
  email text unique not null,
  address text,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  locked_at timestamptz,
  terms_accepted_at timestamptz,
  terms_version text,
  health_consent_at timestamptz,
  auth_provider text not null default 'password',
  profile_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_contact_number_format check (
    contact_number is null or contact_number ~ '^[0-9]{11}$'
  )
);

create table public.client_health_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('condition', 'restriction', 'allergy')),
  value text not null,
  reaction_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, item_type, value)
);

create table public.meal_preferences (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_categories text[] not null default '{}',
  disliked_ingredients text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.nutritional_preferences (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  lower_calories boolean not null default false,
  higher_protein boolean not null default false,
  lower_sodium boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relationship text not null,
  contact_number text not null check (contact_number ~ '^[0-9]{11}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null,
  ingredients text[] not null default '{}',
  allergens text[] not null default '{}',
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  sodium numeric,
  portion_size text,
  price numeric(10,2) not null check (price > 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_components (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  name text not null,
  ingredients text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tracking_number text unique not null,
  client_request_id uuid unique not null,
  client_id uuid not null references public.profiles(id),
  fulfillment_type public.fulfillment_type not null,
  schedule timestamptz not null,
  address text,
  special_instructions text,
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  status public.order_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_requires_address check (
    fulfillment_type = 'pick_up' or nullif(trim(address), '') is not null
  ),
  constraint fulfillment_status_check check (
    fulfillment_type = 'delivery'
    or status not in ('ready_for_delivery', 'out_for_delivery')
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  meal_id uuid not null references public.meals(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price > 0),
  line_total numeric(10,2) generated always as (quantity * unit_price) stored
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  status public.order_status not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null,
  order_id uuid references public.orders(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  purpose public.verification_purpose not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  requested_at timestamptz not null default now()
);

create table public.login_attempts (
  id bigint generated always as identity primary key,
  username text,
  device_key text not null,
  succeeded boolean not null,
  created_at timestamptz not null default now()
);

create table public.profile_change_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id),
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('lead_time_hours', '24'::jsonb),
  ('delivery_fee', '0'::jsonb),
  ('kitchen_hours', '{"days":[1,2,3,4,5,6],"open_hour":7,"close_hour":18}'::jsonb),
  ('contact', '{"phone":"","email":"","hours":""}'::jsonb)
on conflict (key) do nothing;

create index meals_name_trgm_idx on public.meals using gin (name gin_trgm_ops);
create index orders_client_created_idx on public.orders (client_id, created_at desc);
create index notifications_client_created_idx on public.notifications (client_id, created_at desc);
create index audit_events_occurred_idx on public.audit_events (occurred_at, id);

create or replace function public.current_client_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('owner_admin', 'kitchen_staff', 'delivery_staff')
  )
$$;

create or replace function public.audit_event_hash(
  p_occurred_at timestamptz,
  p_actor_id uuid,
  p_event_type text,
  p_details jsonb,
  p_previous_hash text
)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(
    coalesce(p_occurred_at::text, '') || '|' ||
    coalesce(p_actor_id::text, '') || '|' ||
    p_event_type || '|' ||
    p_details::text || '|' ||
    coalesce(p_previous_hash, ''),
    'sha256'
  ), 'hex')
$$;

create or replace function public.append_audit_event(
  p_event_type text,
  p_details jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_hash text;
  v_occurred_at timestamptz := clock_timestamp();
  v_hash text;
  v_id bigint;
begin
  select event_hash into v_previous_hash
  from public.audit_events
  order by id desc
  limit 1
  for update;
  v_hash := public.audit_event_hash(v_occurred_at, auth.uid(), p_event_type, p_details, v_previous_hash);
  insert into public.audit_events (occurred_at, actor_id, event_type, details, previous_hash, event_hash)
  values (v_occurred_at, auth.uid(), p_event_type, p_details, v_previous_hash, v_hash)
  returning id into v_id;
  return v_id;
end
$$;

create or replace function public.verify_audit_chain()
returns table(event_id bigint, valid boolean, reason text)
language sql
security definer
set search_path = public
as $$
  with recursive chain as (
    select a.id, a.occurred_at, a.actor_id, a.event_type, a.details,
           a.previous_hash, a.event_hash, null::text as expected_previous
    from public.audit_events a
    where a.id = (select min(id) from public.audit_events)
    union all
    select a.id, a.occurred_at, a.actor_id, a.event_type, a.details,
           a.previous_hash, a.event_hash, c.event_hash
    from public.audit_events a
    join chain c on a.id = c.id + 1
  )
  select id,
    previous_hash is not distinct from expected_previous
      and event_hash = public.audit_event_hash(occurred_at, actor_id, event_type, details, previous_hash),
    case
      when previous_hash is distinct from expected_previous then 'previous hash mismatch'
      when event_hash <> public.audit_event_hash(occurred_at, actor_id, event_type, details, previous_hash)
        then 'event hash mismatch'
      else 'ok'
    end
  from chain
  order by id
$$;

create or replace function public.validate_order_status_transition(
  p_fulfillment public.fulfillment_type,
  p_old public.order_status,
  p_new public.order_status
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_flow public.order_status[];
begin
  if p_new in ('cancelled', 'issue') then
    return true;
  end if;
  if p_fulfillment = 'delivery' then
    v_flow := array['confirmed','preparing','ready_for_delivery','out_for_delivery','completed']::public.order_status[];
  else
    v_flow := array['confirmed','preparing','ready_for_pick_up','completed']::public.order_status[];
  end if;
  return array_position(v_flow, p_new) = array_position(v_flow, p_old) + 1;
end
$$;

create or replace function public.place_order(
  p_client_request_id uuid,
  p_fulfillment_type public.fulfillment_type,
  p_schedule timestamptz,
  p_address text,
  p_special_instructions text,
  p_items jsonb
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
  v_request_count integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and (not is_active or not is_verified)) then
    raise exception 'account_not_ready';
  end if;
  select count(*) into v_request_count from jsonb_array_elements(p_items);
  if v_request_count = 0 then raise exception 'items_required'; end if;
  select (value #>> '{}')::integer into v_lead_hours from public.settings where key = 'lead_time_hours';
  if p_schedule < now() + make_interval(hours => coalesce(v_lead_hours, 24)) then
    raise exception 'lead_time';
  end if;
  if p_fulfillment_type = 'delivery' then
    if nullif(trim(p_address), '') is null then raise exception 'address_required'; end if;
    select coalesce((value #>> '{}')::numeric, 0) into v_delivery_fee from public.settings where key = 'delivery_fee';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid and is_available;
    if not found then raise exception 'meal_unavailable'; end if;
    if coalesce((v_item->>'quantity')::integer, 0) <= 0 then raise exception 'bad_quantity'; end if;
    v_subtotal := v_subtotal + (v_meal.price * (v_item->>'quantity')::integer);
  end loop;
  insert into public.orders (
    tracking_number, client_request_id, client_id, fulfillment_type, schedule,
    address, special_instructions, delivery_fee, total
  )
  values (
    'TRK-' || extract(year from now())::text || '-' ||
      lpad(nextval('public.orders_tracking_seq')::text, 4, '0'),
    p_client_request_id, auth.uid(), p_fulfillment_type, p_schedule,
    p_address, p_special_instructions, v_delivery_fee, v_subtotal + v_delivery_fee
  )
  on conflict (client_request_id) do update set updated_at = public.orders.updated_at
  returning * into v_order;
  if v_order.created_at <> v_order.updated_at or not exists (
    select 1 from public.order_items where order_id = v_order.id
  ) then
    for v_item in select * from jsonb_array_elements(p_items) loop
      select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid;
      insert into public.order_items (order_id, meal_id, quantity, unit_price)
      values (v_order.id, v_meal.id, (v_item->>'quantity')::integer, v_meal.price);
    end loop;
    insert into public.order_status_history (order_id, status, changed_by)
    values (v_order.id, 'confirmed', auth.uid());
    insert into public.notifications (client_id, title, body, notification_type, order_id)
    values (auth.uid(), 'Order confirmed', 'Order placed successfully.', 'order_confirmed', v_order.id);
    perform public.append_audit_event('order_created', jsonb_build_object('order_id', v_order.id));
  end if;
  return v_order;
end
$$;

create sequence if not exists public.orders_tracking_seq start 1;

alter table public.profiles enable row level security;
alter table public.client_health_items enable row level security;
alter table public.meal_preferences enable row level security;
alter table public.nutritional_preferences enable row level security;
alter table public.guardians enable row level security;
alter table public.meals enable row level security;
alter table public.meal_components enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.verification_codes enable row level security;
alter table public.login_attempts enable row level security;
alter table public.profile_change_history enable row level security;
alter table public.audit_events enable row level security;
alter table public.settings enable row level security;

create policy profiles_self on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy health_self on public.client_health_items for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy preferences_self on public.meal_preferences for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy nutrition_self on public.nutritional_preferences for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy guardians_self on public.guardians for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy meals_authenticated_read on public.meals for select using (auth.uid() is not null);
create policy meal_components_authenticated_read on public.meal_components for select using (auth.uid() is not null);
create policy orders_self on public.orders for select using (client_id = auth.uid());
create policy order_items_self on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.client_id = auth.uid())
);
create policy order_history_self on public.order_status_history for select using (
  exists (select 1 from public.orders where orders.id = order_status_history.order_id and orders.client_id = auth.uid())
);
create policy notifications_self on public.notifications for select using (client_id = auth.uid());
create policy notifications_self_update on public.notifications for update using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy history_self on public.profile_change_history for select using (client_id = auth.uid());
create policy settings_authenticated_read on public.settings for select using (auth.uid() is not null);

revoke all on public.audit_events from anon, authenticated;
revoke all on public.verification_codes from anon, authenticated;
revoke all on public.login_attempts from anon, authenticated;
revoke all on function public.append_audit_event(text, jsonb) from public;
grant execute on function public.append_audit_event(text, jsonb) to authenticated;
grant execute on function public.place_order(uuid, public.fulfillment_type, timestamptz, text, text, jsonb) to authenticated;
grant execute on function public.verify_audit_chain() to authenticated;
