-- Revised workbook (2026-11-19), USR-13 AC 4/5, USR-23, ADM/KIT search:
--   * Every order has an order reference ORD-YYYY-NNNN, used in the User, Admin and Kitchen modules.
--   * TRK-YYYY-NNNN is only the delivery tracking number, shown separately for delivery orders.
-- Existing orders keep their number: TRK-2026-0002 becomes ORD-2026-0002 (and stays the tracking
-- number only if it is a delivery order).

create sequence if not exists public.orders_ref_seq start 1;

alter table public.orders add column if not exists order_ref text;
alter table public.orders alter column tracking_number drop not null;

-- Backfill: reuse the TRK number where it has the expected shape, else take a new number.
update public.orders
set order_ref = 'ORD-' || substr(tracking_number, 5)
where order_ref is null and tracking_number ~ '^TRK-\d{4}-\d{4,}$';

select setval('public.orders_ref_seq', greatest(
  coalesce((select max(substring(order_ref from '\d+$')::bigint) from public.orders where order_ref is not null), 0),
  coalesce((select last_value from public.orders_tracking_seq), 0),
  1));

update public.orders
set order_ref = 'ORD-' || extract(year from created_at)::text || '-' || lpad(nextval('public.orders_ref_seq')::text, 4, '0')
where order_ref is null;

update public.orders set tracking_number = null where fulfillment_type <> 'delivery';

alter table public.orders alter column order_ref set not null;
create unique index if not exists orders_order_ref_key on public.orders (order_ref);

-- New orders: one number for both references, set before any other trigger reads them.
create or replace function public.orders_assign_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suffix text := extract(year from coalesce(new.created_at, now()))::text || '-' ||
    lpad(nextval('public.orders_ref_seq')::text, 4, '0');
begin
  new.order_ref := 'ORD-' || v_suffix;
  new.tracking_number := case when new.fulfillment_type = 'delivery' then 'TRK-' || v_suffix end;
  return new;
end;
$$;
revoke all on function public.orders_assign_reference() from public, anon, authenticated;
drop trigger if exists orders_assign_reference on public.orders;
create trigger orders_assign_reference
  before insert on public.orders
  for each row execute procedure public.orders_assign_reference();

-- The reference cannot be changed after the order is placed.
create or replace function public.orders_keep_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.order_ref := old.order_ref;
  new.tracking_number := old.tracking_number;
  return new;
end;
$$;
drop trigger if exists orders_keep_reference on public.orders;
create trigger orders_keep_reference
  before update of order_ref, tracking_number on public.orders
  for each row execute procedure public.orders_keep_reference();

-- Staff screens, staff bells and customer history used "#00350" (order_no). They now show the
-- order reference; order_no stays as the internal sequence.
create or replace function public.order_display_no(p_order_no integer)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select order_ref from public.orders where order_no = p_order_no),
    '#' || lpad(coalesce(p_order_no, 0)::text, 5, '0'));
$$;

-- Client notices: "Order ORD-2026-0002" / "Order ORD-2026-0002 for Lia Dizon".
create or replace function public.order_notice_subject(p_order public.orders)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'Order ' || p_order.order_ref || coalesce(
    (select ' for ' || trim(r.first_name || ' ' || r.last_name)
     from public.meal_recipients r
     join public.profiles p on p.id = p_order.client_id and p.account_for = 'family'
     where r.id = p_order.meal_recipient_id),
    '');
$$;
revoke all on function public.order_notice_subject(public.orders) from public, anon, authenticated;

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
    'Payment for order ' || v_order.order_ref || ' was received. Your order is being prepared.'
  );
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
      p_order_id, 'cancelled', 'Order returned for changes',
      'The Dietitian returned your order ' || v_order.order_ref || ': ' || v_reason ||
      ' Please revise your meals and submit a new order.'
    );
  end if;
  perform public.append_audit_event('order_reviewed', jsonb_build_object(
    'order_id', p_order_id, 'order_no', v_order.order_no, 'order_ref', v_order.order_ref,
    'decision', case when p_approve then 'approved' else 'returned' end, 'reason', v_reason
  ));
  return v_order;
end;
$$;
