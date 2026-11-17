-- DIT-17: a client cannot take a health condition off the meal recipient's
-- profile directly. Removing one goes through request_health_condition_removal
-- and only a Dietitian's approval deletes the row. Adding conditions stays free.
create or replace function public.guard_health_condition_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.item_type <> 'condition' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'UPDATE' and new.item_type = old.item_type and lower(new.value) = lower(old.value) then
    return new;
  end if;
  -- The client acting on their own row (not a cascade from deleting the account).
  if auth.uid() is not null and auth.uid() = old.client_id
     and exists (select 1 from public.profiles where id = old.client_id and role = 'client') then
    raise exception 'condition_removal_requires_review'
      using hint = 'Removing a health condition needs Dietitian approval.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists guard_health_condition_removal on public.client_health_items;
create trigger guard_health_condition_removal
before delete or update on public.client_health_items
for each row execute function public.guard_health_condition_removal();
