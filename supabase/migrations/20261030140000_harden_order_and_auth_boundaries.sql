create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    email,
    auth_provider,
    is_verified,
    profile_complete
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'auth_provider', 'password'),
    coalesce(new.email_confirmed_at is not null, false),
    false
  )
  on conflict (id) do nothing;
  return new;
end
$$;

alter table public.profiles
  add column if not exists failed_attempts integer not null default 0
    check (failed_attempts >= 0);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.normalized_token(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(coalesce(value, ''))), '[^a-z0-9]+', ' ', 'g')
$$;

create or replace function public.meal_conflicts_with_client(
  p_client_id uuid,
  p_meal_id uuid
)
returns table(allergen text)
language sql
stable
security definer
set search_path = public
as $$
  with profile_allergies as (
    select value
    from public.client_health_items
    where client_id = p_client_id and item_type = 'allergy'
  ),
  meal_words as (
    select unnest(
      coalesce(m.ingredients, '{}') ||
      coalesce(m.allergens, '{}') ||
      coalesce(array(select unnest(mc.ingredients) from public.meal_components mc where mc.meal_id = m.id), '{}')
    ) as ingredient
    from public.meals m
    where m.id = p_meal_id
  )
  select distinct a.value
  from profile_allergies a
  where exists (
    select 1
    from meal_words w
    where public.normalized_token(w.ingredient) like '%' || public.normalized_token(a.value) || '%'
       or public.normalized_token(a.value) like '%' || public.normalized_token(w.ingredient) || '%'
       or (
         public.normalized_token(a.value) = 'peanuts'
         and public.normalized_token(w.ingredient) like '%peanut%'
       )
       or (
         public.normalized_token(a.value) = 'shellfish'
         and public.normalized_token(w.ingredient) ~ '(shrimp|prawn|crab|hipon|shellfish)'
       )
  )
$$;

create or replace function public.is_within_kitchen_hours(p_schedule timestamptz)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hours jsonb;
  v_local timestamp;
  v_day integer;
  v_open integer;
  v_close integer;
begin
  select value into v_hours from public.settings where key = 'kitchen_hours';
  v_local := p_schedule at time zone 'Asia/Manila';
  v_day := extract(isodow from v_local)::integer;
  v_open := coalesce((v_hours->>'open_hour')::integer, 7);
  v_close := coalesce((v_hours->>'close_hour')::integer, 18);
  return v_day = any(array(select jsonb_array_elements_text(v_hours->'days')::integer))
    and extract(hour from v_local) >= v_open
    and extract(hour from v_local) < v_close;
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
  v_conflict text;
  v_tracking text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into v_order
  from public.orders
  where client_request_id = p_client_request_id
    and client_id = auth.uid();
  if found then return v_order; end if;

  if exists (
    select 1 from public.profiles
    where id = auth.uid() and (not is_active or not is_verified)
  ) then raise exception 'account_not_ready'; end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items_required';
  end if;

  select coalesce((value #>> '{}')::integer, 24)
  into v_lead_hours
  from public.settings
  where key = 'lead_time_hours';

  if p_schedule < now() + make_interval(hours => v_lead_hours) then
    raise exception 'lead_time';
  end if;
  if not public.is_within_kitchen_hours(p_schedule) then
    raise exception 'kitchen_closed';
  end if;
  if p_fulfillment_type = 'delivery' then
    if nullif(trim(p_address), '') is null then raise exception 'address_required'; end if;
    select coalesce((value #>> '{}')::numeric, 0)
    into v_delivery_fee from public.settings where key = 'delivery_fee';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce((v_item->>'quantity')::integer, 0) <= 0 then
      raise exception 'bad_quantity';
    end if;
    select * into v_meal
    from public.meals
    where id = (v_item->>'meal_id')::uuid and is_available;
    if not found then raise exception 'meal_unavailable'; end if;
    select c.allergen into v_conflict
    from public.meal_conflicts_with_client(auth.uid(), v_meal.id) c
    limit 1;
    if v_conflict is not null then
      raise exception 'allergen_conflict:%', v_conflict;
    end if;
    v_subtotal := v_subtotal + v_meal.price * (v_item->>'quantity')::integer;
  end loop;

  v_tracking := 'TRK-' || extract(year from now())::text || '-' ||
    lpad(nextval('public.orders_tracking_seq')::text, 4, '0');

  insert into public.orders (
    tracking_number, client_request_id, client_id, fulfillment_type, schedule,
    address, special_instructions, delivery_fee, total
  )
  values (
    v_tracking, p_client_request_id, auth.uid(), p_fulfillment_type, p_schedule,
    nullif(trim(p_address), ''), nullif(trim(p_special_instructions), ''),
    v_delivery_fee, v_subtotal + v_delivery_fee
  )
  returning * into v_order;

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
  return v_order;
exception
  when unique_violation then
    select * into v_order
    from public.orders
    where client_request_id = p_client_request_id
      and client_id = auth.uid();
    if found then return v_order; end if;
    raise;
end
$$;

revoke all on function public.meal_conflicts_with_client(uuid, uuid) from public;
revoke all on function public.is_within_kitchen_hours(timestamptz) from public;
grant execute on function public.meal_conflicts_with_client(uuid, uuid) to authenticated;
