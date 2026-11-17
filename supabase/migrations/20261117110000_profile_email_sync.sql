-- ADM-06 / DIT-06 / KIT-06 / DEL-06: a staff member changes their own email from Settings with
-- supabase.auth.updateUser({ email }). Supabase emails a confirmation link; once confirmed,
-- auth.users.email changes and this trigger copies it to profiles so staff lists, customer
-- records and the audit log show the new address. Admin edits through the admin-staff Edge
-- Function already write both, and this keeps them in step.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = lower(new.email) where id = new.id and email is distinct from lower(new.email);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_profile_email() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute procedure public.sync_profile_email();
