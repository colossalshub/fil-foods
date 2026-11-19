-- USR-51. Special request fees live in settings. An order item keeps the fee from the moment it was submitted.
-- Delivery staff do not receive the request. Kitchen sees it as a preparation note.

insert into public.settings (key, value) values
  ('special_request_fee', '85'::jsonb),
  ('additional_meat_fee', '145'::jsonb)
on conflict (key) do nothing;

alter table public.order_items
  add column if not exists special_request jsonb,
  add column if not exists special_request_fee numeric(10,2) not null default 0;

create or replace function public.special_request_fee(p_request jsonb)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_options jsonb := coalesce(p_request -> 'options', '[]'::jsonb);
  v_note text := trim(coalesce(p_request ->> 'note', ''));
  v_standard numeric;
  v_meat numeric;
  v_allergy text;
begin
  if p_request is null or jsonb_typeof(p_request) = 'null' then return 0; end if;
  if jsonb_typeof(v_options) <> 'array' then raise exception 'special_request_too_long'; end if;
  if jsonb_array_length(v_options) = 0 and v_note = '' then return 0; end if;
  if char_length(v_note) > 150 then raise exception 'special_request_too_long'; end if;

  select value into v_allergy
  from public.client_health_items
  where client_id = auth.uid()
    and item_type = 'allergy'
    and char_length(trim(value)) >= 3
    and v_note ilike '%' || trim(value) || '%'
  limit 1;
  if v_allergy is not null then raise exception 'special_request_allergen'; end if;

  select coalesce((value #>> '{}')::numeric, 85) into v_standard
  from public.settings where key = 'special_request_fee';
  select coalesce((value #>> '{}')::numeric, 145) into v_meat
  from public.settings where key = 'additional_meat_fee';

  if exists (
    select 1 from jsonb_array_elements_text(v_options) option
    where option = 'Additional meat'
  ) then
    return coalesce(v_meat, 145);
  end if;
  return coalesce(v_standard, 85);
end;
$$;
revoke all on function public.special_request_fee(jsonb) from public, anon, authenticated;

create or replace function public.order_check_and_price(
  p_fulfillment_type public.fulfillment_type,
  p_schedule timestamptz,
  p_address text,
  p_items jsonb,
  p_plan_id text,
  p_exclude_order uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_meal public.meals;
  v_subtotal numeric(10,2) := 0;
  v_request_fees numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_lead_hours integer;
  v_conflict text;
  v_plan public.meal_plans;
  v_slot text;
  v_slots text[] := '{}';
  v_day date := (p_schedule at time zone 'Asia/Manila')::date;
  v_booked text[];
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
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

  select coalesce(array_agg(coalesce(oi.meal_time, m.category)), '{}') into v_booked
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.meals m on m.id = oi.meal_id
  where o.client_id = auth.uid()
    and o.status not in ('cancelled', 'returned_for_changes')
    and o.id is distinct from p_exclude_order
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
    v_request_fees := v_request_fees + public.special_request_fee(v_item -> 'special_request');
  end loop;
  if cardinality(v_slots) + cardinality(v_booked) > 3 then raise exception 'max_meals_per_day'; end if;

  return jsonb_build_object(
    'delivery_fee', v_delivery_fee,
    'plan_id', v_plan.id,
    'special_request_fees', v_request_fees,
    'total', coalesce(v_plan.price, v_subtotal) + v_delivery_fee + v_request_fees
  );
end;
$$;
revoke all on function public.order_check_and_price(public.fulfillment_type, timestamptz, text, jsonb, text, uuid) from public, anon, authenticated;

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
  v_recipient_id uuid;
  v_priced jsonb;
  v_request jsonb;
  v_fee numeric;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into v_order
  from public.orders
  where client_request_id = p_client_request_id and client_id = auth.uid();
  if found then return v_order; end if;

  v_priced := public.order_check_and_price(p_fulfillment_type, p_schedule, p_address, p_items, p_plan_id);
  select meal_recipient_id into v_recipient_id from public.profiles where id = auth.uid();

  insert into public.orders (
    tracking_number, client_request_id, client_id, meal_recipient_id,
    fulfillment_type, schedule, address, special_instructions, delivery_fee, total, status, plan_id
  )
  values (
    null,
    p_client_request_id, auth.uid(), v_recipient_id,
    p_fulfillment_type, p_schedule,
    nullif(trim(p_address), ''), nullif(trim(p_special_instructions), ''),
    (v_priced->>'delivery_fee')::numeric,
    (v_priced->>'total')::numeric,
    'for_dietitian_review',
    v_priced->>'plan_id'
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid;
    v_request := v_item -> 'special_request';
    v_fee := public.special_request_fee(v_request);
    if v_fee = 0 then v_request := null; end if;
    insert into public.order_items (
      order_id, meal_id, quantity, unit_price, meal_time, special_request, special_request_fee
    )
    values (
      v_order.id, v_meal.id, (v_item->>'quantity')::integer, v_meal.price,
      coalesce(nullif(v_item->>'meal_time', ''), v_meal.category),
      v_request, v_fee
    );
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
  perform public.append_audit_event('order_created', jsonb_build_object(
    'order_id', v_order.id,
    'plan_id', v_priced->>'plan_id',
    'special_request_fees', v_priced->>'special_request_fees',
    'added_by', auth.uid()
  ));
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

create or replace function public.resubmit_order(
  p_order_id uuid,
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
  v_priced jsonb;
  v_previous_reason text;
  v_request jsonb;
  v_fee numeric;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_order from public.orders where id = p_order_id and client_id = auth.uid() for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'returned_for_changes' then raise exception 'order_not_returned'; end if;
  v_previous_reason := v_order.review_reason;

  v_priced := public.order_check_and_price(p_fulfillment_type, p_schedule, p_address, p_items, p_plan_id, p_order_id);

  delete from public.order_items where order_id = p_order_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_meal from public.meals where id = (v_item->>'meal_id')::uuid;
    v_request := v_item -> 'special_request';
    v_fee := public.special_request_fee(v_request);
    if v_fee = 0 then v_request := null; end if;
    insert into public.order_items (
      order_id, meal_id, quantity, unit_price, meal_time, special_request, special_request_fee
    )
    values (
      p_order_id, v_meal.id, (v_item->>'quantity')::integer, v_meal.price,
      coalesce(nullif(v_item->>'meal_time', ''), v_meal.category),
      v_request, v_fee
    );
  end loop;

  update public.orders
  set fulfillment_type = p_fulfillment_type,
      schedule = p_schedule,
      address = nullif(trim(p_address), ''),
      special_instructions = nullif(trim(p_special_instructions), ''),
      delivery_fee = (v_priced->>'delivery_fee')::numeric,
      total = (v_priced->>'total')::numeric,
      plan_id = v_priced->>'plan_id',
      review_decision = null,
      review_reason = null,
      reviewed_by = null,
      reviewed_at = null
  where id = p_order_id;

  v_order := public.record_order_status_change(
    p_order_id, 'for_dietitian_review', 'Order resubmitted',
    'Order ' || v_order.order_ref || ' was resubmitted and sent to the Dietitian for review.'
  );
  perform public.append_audit_event('order_resubmitted', jsonb_build_object(
    'order_id', p_order_id, 'order_ref', v_order.order_ref, 'previous_reason', v_previous_reason,
    'special_request_fees', v_priced->>'special_request_fees', 'changed_by', auth.uid()));
  return v_order;
end;
$$;
revoke all on function public.resubmit_order(uuid, public.fulfillment_type, timestamptz, text, text, jsonb, text) from public, anon;
grant execute on function public.resubmit_order(uuid, public.fulfillment_type, timestamptz, text, text, jsonb, text) to authenticated;

-- Kitchen and Dietitian see the request. Delivery staff do not.
create or replace function public.staff_order_json(p_role public.app_role, p_order public.orders, p_detail boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_recipient jsonb := public.order_recipient(p_order);
  v_holder public.profiles;
  v_items jsonb;
  v_row jsonb;
  v_assignee text;
  v_show_price boolean := p_role in ('owner_admin', 'dietitian_staff');
  v_show_address boolean := p_role in ('owner_admin', 'delivery_staff');
  v_show_request boolean := p_role in ('owner_admin', 'dietitian_staff', 'kitchen_staff');
begin
  select * into v_holder from public.profiles where id = p_order.client_id;
  select coalesce(jsonb_agg(
      jsonb_build_object('name', m.name, 'quantity', oi.quantity, 'meal_key', m.client_meal_key)
      || case when v_show_price then jsonb_build_object('unit_price', oi.unit_price) else '{}'::jsonb end
      || case when v_show_request and oi.special_request is not null then jsonb_build_object(
           'preparation_note', oi.special_request,
           'special_request_fee', oi.special_request_fee
         ) else '{}'::jsonb end
      order by m.name), '[]'::jsonb)
    into v_items
  from public.order_items oi join public.meals m on m.id = oi.meal_id
  where oi.order_id = p_order.id;
  select trim(first_name || ' ' || last_name) into v_assignee from public.profiles where id = p_order.assigned_delivery_id;

  v_row := jsonb_build_object(
    'id', p_order.id,
    'order_no', p_order.order_no,
    'display_no', public.order_display_no(p_order.order_no),
    'status', p_order.status,
    'fulfillment_type', p_order.fulfillment_type,
    'created_at', p_order.created_at,
    'schedule', p_order.schedule,
    'client_id', p_order.client_id,
    'first_name', v_recipient ->> 'first_name',
    'items', v_items,
    'assigned_delivery_id', p_order.assigned_delivery_id,
    'assignee_name', v_assignee
  );
  if p_role in ('owner_admin', 'dietitian_staff') then
    v_row := v_row || jsonb_build_object(
      'customer_name', trim(coalesce(v_recipient ->> 'first_name', '') || ' ' || coalesce(v_recipient ->> 'last_name', '')),
      'account_holder_name', trim(coalesce(v_holder.first_name, '') || ' ' || coalesce(v_holder.last_name, '')),
      'tracking_number', p_order.tracking_number,
      'total', p_order.total,
      'review_decision', p_order.review_decision,
      'review_reason', p_order.review_reason,
      'reviewed_at', p_order.reviewed_at
    );
  end if;
  if p_detail then
    v_row := v_row || jsonb_build_object('dietary', public.client_dietary_info(p_order.client_id));
    if p_role <> 'kitchen_staff' then
      v_row := v_row || jsonb_build_object('special_instructions', p_order.special_instructions);
    end if;
    if p_role in ('owner_admin', 'dietitian_staff') then
      v_row := v_row || jsonb_build_object(
        'customer_email', v_recipient ->> 'email',
        'history', coalesce((
          select jsonb_agg(jsonb_build_object('status', h.status, 'changed_at', h.changed_at,
                 'changed_by', nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''))
                 order by h.changed_at)
          from public.order_status_history h left join public.profiles p on p.id = h.changed_by
          where h.order_id = p_order.id), '[]'::jsonb)
      );
    end if;
    if v_show_address and p_order.fulfillment_type = 'delivery' then
      v_row := v_row || jsonb_build_object(
        'delivery', jsonb_build_object(
          'first_name', v_recipient ->> 'first_name',
          'contact_number', v_recipient ->> 'contact_number',
          'address', v_recipient ->> 'address',
          'notes', p_order.special_instructions
        )
      );
    end if;
  end if;
  return v_row;
end;
$$;
revoke all on function public.staff_order_json(public.app_role, public.orders, boolean) from public, anon, authenticated;
