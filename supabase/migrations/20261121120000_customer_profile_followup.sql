-- Customer follow-up: remember the guide on the account, remember a linked Google sign-in,
-- and keep a change history when the customer updates their own profile.

alter table public.profiles
  add column if not exists guide_seen_at timestamptz,
  add column if not exists google_linked boolean not null default false;

drop trigger if exists profiles_record_field_changes on public.profiles;

alter table public.profile_change_history
  add column if not exists actor_name text;

-- The customer app calls this after a profile, health, diet, or allergy save.
-- It records the previous value, the new value, and who made the change (USR-38).
create or replace function public.log_own_profile_change(p_field text, p_old text, p_new text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_old text := nullif(trim(coalesce(p_old, '')), '');
  v_new text := nullif(trim(coalesce(p_new, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if nullif(trim(coalesce(p_field, '')), '') is null then
    return;
  end if;
  if v_old is not distinct from v_new then
    return;
  end if;
  select nullif(trim(both ' ' from coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    into v_actor
  from public.profiles
  where id = auth.uid();
  insert into public.profile_change_history (client_id, field_name, old_value, new_value, actor_name)
  values (auth.uid(), trim(p_field), v_old, v_new, v_actor);
end;
$$;

revoke all on function public.log_own_profile_change(text, text, text) from public;
grant execute on function public.log_own_profile_change(text, text, text) to authenticated;
