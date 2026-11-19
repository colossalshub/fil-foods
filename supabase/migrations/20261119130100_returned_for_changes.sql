-- Revised workbook (2026-11-19), USR-23 / USR-21 / DIT-15:
--   * The Dietitian's return sets "Returned for Changes" (was: cancelled) and keeps the reason.
--   * The user edits the order and resubmits it (resubmit_order). It goes through the same checks
--     as a new order, keeps its ORD- reference and returns to For Dietitian Review.
--   * A returned order is not active: its meal times do not block other orders that day.

create or replace function public.order_status_label(p_status public.order_status)
returns text
language sql
immutable
as $$
  select case p_status::text
    when 'for_dietitian_review' then 'For Dietitian Review'
    when 'returned_for_changes' then 'Returned for Changes'
    when 'awaiting_payment' then 'Awaiting Payment'
    when 'paid' then 'Paid'
    when 'confirmed' then 'Confirmed'
    when 'preparing' then 'Preparing'
    when 'ready_for_pick_up' then 'Ready for Pickup'
    when 'ready_for_delivery' then 'Ready for Delivery'
    when 'out_for_delivery' then 'Out for Delivery'
    when 'completed' then 'Completed'
    when 'cancelled' then 'Cancelled'
    else 'Needs attention'
  end;
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
  -- Dietitian return and the user's resubmission.
  if p_old = 'for_dietitian_review' and p_new = 'returned_for_changes' then return true; end if;
  if p_old = 'returned_for_changes' and p_new = 'for_dietitian_review' then return true; end if;
  if p_fulfillment = 'delivery' then
    v_flow := array[
      'for_dietitian_review', 'awaiting_payment', 'paid', 'preparing',
      'ready_for_delivery', 'out_for_delivery', 'completed'
    ]::public.order_status[];
  else
    v_flow := array[
      'for_dietitian_review', 'awaiting_payment', 'paid', 'preparing',
      'ready_for_pick_up', 'completed'
    ]::public.order_status[];
  end if;
  if p_old = 'confirmed' and p_new = 'preparing' then return true; end if;
  if p_old = 'confirmed' and p_new = 'paid' then return true; end if;
  return array_position(v_flow, p_new) = array_position(v_flow, p_old) + 1;
end;
$$;

create or replace function public.dietitian_review_order(
  p_order_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  perform public.require_staff(array['dietitian_staff', 'owner_admin']::public.app_role[]);
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'for_dietitian_review' then raise exception 'already_reviewed'; end if;
  if not p_approve and v_reason is null then raise exception 'reason_required'; end if;
  update public.orders
  set review_decision = case when p_approve then 'approved' else 'returned' end,
      review_reason = v_reason,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_order_id;
  if p_approve then
    v_order := public.record_order_status_change(
      p_order_id, 'awaiting_payment', 'Order approved',
      'Your order ' || v_order.order_ref || ' was approved by the Dietitian. You can now pay for it.'
    );
  else
    v_order := public.record_order_status_change(
      p_order_id, 'returned_for_changes', 'Order Returned for Changes',
      'The Dietitian returned your order ' || v_order.order_ref || ': ' || v_reason ||
      ' Edit the order and resubmit it for review.'
    );
  end if;
  perform public.append_audit_event('order_reviewed', jsonb_build_object(
    'order_id', p_order_id, 'order_no', v_order.order_no, 'order_ref', v_order.order_ref,
    'decision', case when p_approve then 'approved' else 'returned' end, 'reason', v_reason
  ));
  return v_order;
end;
$$;

-- Shared checks for a new or resubmitted order (moved out of place_order unchanged, except that
-- returned orders and the order being resubmitted do not count as booked meal times).
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
  end loop;
  if cardinality(v_slots) + cardinality(v_booked) > 3 then raise exception 'max_meals_per_day'; end if;

  return jsonb_build_object(
    'delivery_fee', v_delivery_fee,
    'plan_id', v_plan.id,
    'total', coalesce(v_plan.price, v_subtotal) + v_delivery_fee
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
    null, -- set by orders_assign_reference
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
  perform public.append_audit_event('order_created', jsonb_build_object('order_id', v_order.id, 'plan_id', v_priced->>'plan_id'));
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

-- USR-23: the user edits a returned order and resubmits it after confirming twice in the app.
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
    insert into public.order_items (order_id, meal_id, quantity, unit_price, meal_time)
    values (p_order_id, v_meal.id, (v_item->>'quantity')::integer, v_meal.price,
            coalesce(nullif(v_item->>'meal_time', ''), v_meal.category));
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
    'order_id', p_order_id, 'order_ref', v_order.order_ref, 'previous_reason', v_previous_reason));
  return v_order;
end;
$$;
revoke all on function public.resubmit_order(uuid, public.fulfillment_type, timestamptz, text, text, jsonb, text) from public, anon;
grant execute on function public.resubmit_order(uuid, public.fulfillment_type, timestamptz, text, text, jsonb, text) to authenticated;

-- A resubmission can switch pickup/delivery: the TRK- number follows the fulfillment type, the
-- ORD- reference never changes.
create or replace function public.orders_keep_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.order_ref := old.order_ref;
  new.tracking_number := case when new.fulfillment_type = 'delivery'
    then 'TRK-' || substr(old.order_ref, 5) end;
  return new;
end;
$$;
drop trigger if exists orders_keep_reference on public.orders;
create trigger orders_keep_reference
  before update of order_ref, tracking_number, fulfillment_type on public.orders
  for each row execute procedure public.orders_keep_reference();

-- Staff bells: a resubmitted order needs review again (DIT-05 / ADM-05).
create or replace function public.orders_notify_staff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_no text := coalesce(new.order_ref, public.order_display_no(new.order_no));
begin
  if tg_op = 'INSERT' then
    if new.status = 'for_dietitian_review' then
      perform public.notify_staff('dietitian_staff', 'reviewRequest',
        'Order ' || v_no || ' needs review', 'A new order was submitted for Dietitian review.', new.id);
      perform public.notify_staff('owner_admin', 'newOrder',
        'New order ' || v_no, 'Waiting for Dietitian review.', new.id);
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status = 'for_dietitian_review' and old.status = 'returned_for_changes' then
      perform public.notify_staff('dietitian_staff', 'reviewRequest',
        'Order ' || v_no || ' needs review', 'The customer edited and resubmitted this order.', new.id);
      perform public.notify_staff('owner_admin', 'newOrder',
        'Order ' || v_no || ' was resubmitted', 'Waiting for Dietitian review.', new.id);
    elsif new.status = 'paid' then
      perform public.notify_staff('kitchen_staff', 'newOrder',
        'New order ' || v_no, 'Approved and paid. Ready to prepare.', new.id);
      perform public.notify_staff('owner_admin', 'orderPaid', 'Order ' || v_no || ' was paid', '', new.id);
    elsif new.status = 'ready_for_delivery' then
      perform public.notify_staff('owner_admin', 'readyForPickup',
        'Order ' || v_no || ' is ready for pickup',
        case when new.assigned_delivery_id is null then 'Assign a delivery staff member.' else '' end, new.id);
      if new.assigned_delivery_id is not null then
        perform public.notify_staff('delivery_staff', 'readyForPickup',
          'Order ' || v_no || ' is ready for pickup', 'Collect the order and start the delivery.', new.id,
          new.assigned_delivery_id);
      end if;
    elsif new.status = 'ready_for_pick_up' then
      perform public.notify_staff('owner_admin', 'readyForPickup',
        'Order ' || v_no || ' is ready for customer pickup', '', new.id);
    elsif new.status = 'completed' then
      perform public.notify_staff('owner_admin', 'orderCompleted', 'Order ' || v_no || ' was completed', '', new.id);
    end if;
  end if;
  return new;
end;
$$;
