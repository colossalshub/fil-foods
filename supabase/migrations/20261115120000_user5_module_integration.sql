-- User 5 module: meal recipient, dietitian review order flow, staff roles, shared transitions.

alter type public.app_role add value if not exists 'dietitian_staff';

alter type public.order_status add value if not exists 'for_dietitian_review';
alter type public.order_status add value if not exists 'awaiting_payment';
alter type public.order_status add value if not exists 'paid';

alter table public.profiles
  add column if not exists account_for text not null default 'self'
    check (account_for in ('self', 'family'));

create table if not exists public.meal_recipients (
  id uuid primary key default gen_random_uuid(),
  account_holder_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null default '',
  middle_name text,
  last_name text not null default '',
  suffix text,
  contact_number text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_recipients_one_per_account unique (account_holder_id),
  constraint meal_recipients_contact_format check (
    contact_number is null or contact_number ~ '^[0-9]{11}$'
  )
);

alter table public.profiles
  add column if not exists meal_recipient_id uuid references public.meal_recipients(id) on delete set null;

alter table public.client_health_items
  add column if not exists meal_recipient_id uuid references public.meal_recipients(id) on delete cascade;

alter table public.orders
  add column if not exists meal_recipient_id uuid references public.meal_recipients(id) on delete set null;

alter table public.orders
  alter column status set default 'for_dietitian_review';

create index if not exists meal_recipients_holder_idx on public.meal_recipients (account_holder_id);
create index if not exists orders_status_idx on public.orders (status, updated_at desc);

create or replace function public.is_dietitian_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('dietitian_staff', 'owner_admin')
  );
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
      and role in ('owner_admin', 'dietitian_staff', 'kitchen_staff', 'delivery_staff')
  );
$$;

create or replace function public.staff_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
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
    return p_old not in ('completed', 'cancelled');
  end if;
  if p_fulfillment = 'delivery' then
    v_flow := array[
      'for_dietitian_review',
      'awaiting_payment',
      'paid',
      'preparing',
      'ready_for_delivery',
      'out_for_delivery',
      'completed'
    ]::public.order_status[];
  else
    v_flow := array[
      'for_dietitian_review',
      'awaiting_payment',
      'paid',
      'preparing',
      'ready_for_pick_up',
      'completed'
    ]::public.order_status[];
  end if;
  if p_old = 'confirmed' and p_new = 'preparing' then
    return true;
  end if;
  if p_old = 'confirmed' and p_new = 'paid' then
    return true;
  end if;
  return array_position(v_flow, p_new) = array_position(v_flow, p_old) + 1;
end;
$$;

create or replace function public.order_status_allowed_for_staff(
  p_role public.app_role,
  p_old public.order_status,
  p_new public.order_status
)
returns boolean
language plpgsql
immutable
as $$
begin
  if p_role = 'owner_admin' then
    return true;
  end if;
  if p_role = 'dietitian_staff' then
    return p_old = 'for_dietitian_review' and p_new in ('awaiting_payment', 'cancelled', 'issue');
  end if;
  if p_role = 'kitchen_staff' then
    return (p_old, p_new) in (
      ('paid', 'preparing'),
      ('preparing', 'ready_for_delivery'),
      ('preparing', 'ready_for_pick_up'),
      ('confirmed', 'preparing')
    );
  end if;
  if p_role = 'delivery_staff' then
    return (p_old, p_new) in (
      ('ready_for_delivery', 'out_for_delivery'),
      ('out_for_delivery', 'completed')
    );
  end if;
  return false;
end;
$$;

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
  'Your order ' || v_order.tracking_number || ' is now ' ||
    replace(initcap(replace(p_new_status::text, '_', ' ')), ' ', ' ') || '.'
  );
  insert into public.notifications (client_id, title, body, notification_type, order_id)
  values (v_order.client_id, p_title, v_body, 'status_changed', p_order_id);
  perform public.append_audit_event(
    'order_status_changed',
    jsonb_build_object('order_id', p_order_id, 'status', p_new_status)
  );
  return v_order;
end;
$$;

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_new_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_role public.app_role;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  v_role := public.staff_app_role();
  if v_role is null or v_role = 'client' then raise exception 'not_authorized'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  if not public.order_status_allowed_for_staff(v_role, v_order.status, p_new_status) then
    raise exception 'role_cannot_transition';
  end if;
  if not public.validate_order_status_transition(v_order.fulfillment_type, v_order.status, p_new_status) then
    raise exception 'invalid_status_transition';
  end if;

  return public.record_order_status_change(p_order_id, p_new_status);
end;
$$;

create or replace function public.pay_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_order from public.orders where id = p_order_id and client_id = auth.uid() for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'awaiting_payment' then raise exception 'payment_not_due'; end if;
  return public.record_order_status_change(
    p_order_id,
    'paid',
    'Payment received',
    'Payment for order ' || v_order.tracking_number || ' was received. Your order is being prepared.'
  );
end;
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
  v_conflict text;
  v_recipient_id uuid;
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

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce((v_item->>'quantity')::integer, 0) <= 0 then
      raise exception 'bad_quantity';
    end if;
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid and is_available;
    if not found then raise exception 'meal_unavailable'; end if;
    select c.allergen into v_conflict
    from public.meal_conflicts_with_client(auth.uid(), v_meal.id) c
    limit 1;
    if v_conflict is not null then
      raise exception 'allergen_conflict:%', v_conflict;
    end if;
    v_subtotal := v_subtotal + v_meal.price * (v_item->>'quantity')::integer;
  end loop;

  insert into public.orders (
    tracking_number, client_request_id, client_id, meal_recipient_id,
    fulfillment_type, schedule, address, special_instructions, delivery_fee, total, status
  )
  values (
    'TRK-' || extract(year from now())::text || '-' ||
      lpad(nextval('public.orders_tracking_seq')::text, 4, '0'),
    p_client_request_id, auth.uid(), v_recipient_id,
    p_fulfillment_type, p_schedule,
    nullif(trim(p_address), ''), nullif(trim(p_special_instructions), ''),
    v_delivery_fee, v_subtotal + v_delivery_fee, 'for_dietitian_review'
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid;
    insert into public.order_items (order_id, meal_id, quantity, unit_price)
    values (v_order.id, v_meal.id, (v_item->>'quantity')::integer, v_meal.price);
  end loop;

  insert into public.order_status_history (order_id, status, changed_by)
  values (v_order.id, 'for_dietitian_review', auth.uid());
  insert into public.notifications (client_id, title, body, notification_type, order_id)
  values (
    auth.uid(),
    'Order submitted',
    'Your order ' || v_order.tracking_number || ' was sent to the Dietitian for review.',
    'order_submitted',
    v_order.id
  );
  perform public.append_audit_event('order_created', jsonb_build_object('order_id', v_order.id));
  return v_order;
exception
  when unique_violation then
    select * into v_order from public.orders
    where client_request_id = p_client_request_id and client_id = auth.uid();
    if found then return v_order; end if;
    raise;
end;
$$;

-- RLS: staff visibility and meal catalog management
drop policy if exists orders_staff_select on public.orders;
create policy orders_staff_select on public.orders for select using (public.is_staff());

drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders for update using (public.is_staff());

drop policy if exists profiles_staff_read_clients on public.profiles;
create policy profiles_staff_read_clients on public.profiles for select using (
  public.is_staff() or id = auth.uid()
);

drop policy if exists meal_recipients_self on public.meal_recipients;
create policy meal_recipients_self on public.meal_recipients for all
  using (account_holder_id = auth.uid())
  with check (account_holder_id = auth.uid());

drop policy if exists meal_recipients_staff_read on public.meal_recipients;
create policy meal_recipients_staff_read on public.meal_recipients for select using (public.is_staff());

drop policy if exists health_dietitian_read on public.client_health_items;
create policy health_dietitian_read on public.client_health_items for select using (
  client_id = auth.uid()
  or (
    public.is_dietitian_staff()
    and exists (
      select 1 from public.orders o
      where o.client_id = client_health_items.client_id
        and o.status in (
          'for_dietitian_review', 'awaiting_payment', 'paid', 'preparing',
          'ready_for_delivery', 'ready_for_pick_up', 'out_for_delivery'
        )
    )
  )
);

drop policy if exists meals_admin_write on public.meals;
create policy meals_admin_write on public.meals for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner_admin')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner_admin')
);

drop policy if exists meal_components_admin_write on public.meal_components;
create policy meal_components_admin_write on public.meal_components for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner_admin')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner_admin')
);

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner_admin')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'owner_admin')
);

grant execute on function public.transition_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.pay_order(uuid) to authenticated;
grant execute on function public.record_order_status_change(uuid, public.order_status, text, text) to authenticated;

create or replace function public.dev_set_order_status(
  p_order_id uuid,
  p_new_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if current_setting('app.environment', true) <> 'test' and not public.is_staff() then
    raise exception 'dev_simulator_disabled';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if not public.validate_order_status_transition(v_order.fulfillment_type, v_order.status, p_new_status) then
    raise exception 'invalid_status_transition';
  end if;
  return public.record_order_status_change(p_order_id, p_new_status);
end;
$$;