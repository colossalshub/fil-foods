-- Revised workbook (2026-11-19) queues:
--   KIT-11 AC 2 / KIT-12 AC 4  Kitchen sees and works only orders with confirmed payment. Unpaid,
--                              failed or cancelled-payment orders are hidden and cannot be prepared.
--                              Owner decision: COD orders may reach the Kitchen unpaid. No COD
--                              orders exist yet (payments are a later item); the exception goes into
--                              order_cleared_for_kitchen when the payment method is recorded.
--   DEL-11 AC 2 / DEL-17 AC 5  Delivery Staff receive only orders marked Ready for Pickup
--                              (ready_for_delivery) that are assigned to them, and keep them while
--                              they deliver (out_for_delivery, completed).

create or replace function public.order_cleared_for_kitchen(p_order public.orders)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.order_was_paid(p_order.id);
$$;
revoke all on function public.order_cleared_for_kitchen(public.orders) from public, anon, authenticated;

create or replace function public.staff_can_see_order(p_role public.app_role, p_order public.orders)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_role
    when 'owner_admin' then true
    when 'dietitian_staff' then true
    when 'kitchen_staff' then p_order.status in (
        'paid', 'confirmed', 'preparing', 'ready_for_delivery', 'ready_for_pick_up', 'out_for_delivery', 'completed', 'cancelled'
      ) and public.order_cleared_for_kitchen(p_order)
    when 'delivery_staff' then p_order.fulfillment_type = 'delivery'
      and p_order.assigned_delivery_id = auth.uid()
      and p_order.status in ('ready_for_delivery', 'out_for_delivery', 'completed')
    else false
  end;
$$;
revoke all on function public.staff_can_see_order(public.app_role, public.orders) from public, anon, authenticated;

-- Kitchen and Delivery can only move orders they are allowed to see.
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
  v_role := public.require_staff(array['owner_admin', 'dietitian_staff', 'kitchen_staff', 'delivery_staff']::public.app_role[]);
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_role = 'delivery_staff' and v_order.assigned_delivery_id is distinct from auth.uid() then
    raise exception 'not_assigned';
  end if;
  if v_role = 'kitchen_staff' and not public.staff_can_see_order(v_role, v_order) then
    raise exception 'payment_not_confirmed';
  end if;
  if v_role = 'delivery_staff' and not public.staff_can_see_order(v_role, v_order) then
    raise exception 'order_not_ready';
  end if;
  if not public.order_status_allowed_for_staff(v_role, v_order.status, p_new_status) then
    raise exception 'role_cannot_transition';
  end if;
  if not public.validate_order_status_transition(v_order.fulfillment_type, v_order.status, p_new_status) then
    raise exception 'invalid_status_transition';
  end if;
  return public.record_order_status_change(p_order_id, p_new_status);
end;
$$;
revoke all on function public.transition_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.transition_order_status(uuid, public.order_status) to authenticated;
