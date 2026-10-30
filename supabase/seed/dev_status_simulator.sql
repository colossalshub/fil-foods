-- Development-only helpers for exercising client acceptance criteria.
-- Do not run this seed in production.

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
  if current_setting('app.environment', true) <> 'test' then
    raise exception 'dev_simulator_disabled';
  end if;
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
  insert into public.notifications (client_id, title, body, notification_type, order_id)
  values (
    v_order.client_id,
    'Order status changed',
    'Your order status is now ' || replace(initcap(p_new_status::text), '_', ' ') || '.',
    'status_changed',
    p_order_id
  );
  perform public.append_audit_event(
    'order_status_changed',
    jsonb_build_object('order_id', p_order_id, 'status', p_new_status)
  );
  return v_order;
end
$$;

grant execute on function public.dev_set_order_status(uuid, public.order_status) to authenticated;
