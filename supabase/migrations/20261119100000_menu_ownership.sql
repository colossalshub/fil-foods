-- Revised workbook (2026-11-19): menu ownership.
--   ADM-18  Admin owns menu details (full write on meals and meal_components).
--   KIT-15  Kitchen Staff only set availability of existing items, through set_meal_availability;
--           each Kitchen change notifies the Admin.
--   DEL-14  removed: Delivery Staff have no menu write access.
--   DIT-14  unchanged: Dietitian reads the menu only.
-- Replaces the shared staff write policies from 20261117100000_staff_modules.sql (section 8).

drop policy if exists meals_staff_write on public.meals;
drop policy if exists meals_admin_write on public.meals;
create policy meals_admin_write on public.meals for all
  using (public.current_staff_role() = 'owner_admin')
  with check (public.current_staff_role() = 'owner_admin');

drop policy if exists meal_components_staff_write on public.meal_components;
drop policy if exists meal_components_admin_write on public.meal_components;
create policy meal_components_admin_write on public.meal_components for all
  using (public.current_staff_role() = 'owner_admin')
  with check (public.current_staff_role() = 'owner_admin');

-- KIT-15: the only menu change Kitchen Staff can make. Admin may call it too (full write).
create or replace function public.set_meal_availability(p_meal_id uuid, p_available boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal public.meals;
begin
  if coalesce(public.current_staff_role()::text, '') not in ('kitchen_staff', 'owner_admin') then
    raise exception 'not_authorized';
  end if;
  if p_available is null then raise exception 'availability_required'; end if;
  update public.meals set is_available = p_available where id = p_meal_id returning * into v_meal;
  if not found then raise exception 'meal_not_found'; end if;
  return jsonb_build_object('id', v_meal.id, 'name', v_meal.name, 'available', v_meal.is_available);
end;
$$;
revoke all on function public.set_meal_availability(uuid, boolean) from public, anon;
grant execute on function public.set_meal_availability(uuid, boolean) to authenticated;

-- Audit every menu change. Admin changes still reach Kitchen/Delivery (ADM-21 settings decide);
-- a Kitchen availability change notifies the Admin instead (KIT-15).
create or replace function public.meals_audit_and_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(new.name, old.name);
  v_action text := lower(tg_op);
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  perform public.append_audit_event('menu.' || v_action, jsonb_build_object(
    'meal_id', coalesce(new.id, old.id), 'name', v_name,
    'old_value', case when tg_op <> 'INSERT' then jsonb_build_object('price', old.price, 'available', old.is_available) end,
    'new_value', case when tg_op <> 'DELETE' then jsonb_build_object('price', new.price, 'available', new.is_available) end
  ));
  if public.current_staff_role() = 'kitchen_staff' then
    perform public.notify_staff('owner_admin', 'menuUpdated', 'Menu item updated',
      v_name || ' is now ' || case when new.is_available then 'Available' else 'Unavailable' end || ' (set by Kitchen Staff).');
  else
    perform public.notify_staff('kitchen_staff', 'menuUpdated', 'Menu item updated', v_name);
    perform public.notify_staff('delivery_staff', 'menuUpdated', 'Menu item updated', v_name);
  end if;
  return coalesce(new, old);
end;
$$;
