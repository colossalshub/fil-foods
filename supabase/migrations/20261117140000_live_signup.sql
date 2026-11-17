-- USR-01 / USR-02 / USR-04 / USR-33 on a live project: real Supabase sign-up, email-code
-- verification and password reset. Local only until the owner approves a remote push.

-- 1. The sign-up form's details travel as auth metadata; copy them into the profile. A username
--    or contact number that is already used is left empty instead of failing the sign-up
--    (the app checks availability first with check_signup_available).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full_name text := coalesce(nullif(m->>'full_name', ''), nullif(m->>'name', ''), '');
  v_username text := nullif(trim(m->>'username'), '');
  v_contact text := nullif(regexp_replace(coalesce(m->>'contact_number', ''), '\D', '', 'g'), '');
  v_account_for text := case when m->>'account_for' in ('self', 'family') then m->>'account_for' end;
  v_terms boolean := coalesce((m->>'terms_accepted')::boolean, false);
begin
  if v_username is not null and exists (select 1 from public.profiles where username = v_username) then
    v_username := null;
  end if;
  if v_contact is not null and (v_contact !~ '^[0-9]{11}$'
     or exists (select 1 from public.profiles where contact_number = v_contact)) then
    v_contact := null;
  end if;

  insert into public.profiles (
    id, username, first_name, middle_name, last_name, suffix, contact_number, address,
    email, auth_provider, is_verified, profile_complete, account_for, terms_accepted_at, terms_version
  )
  values (
    new.id,
    v_username,
    coalesce(nullif(m->>'first_name', ''), nullif(m->>'given_name', ''), nullif(split_part(v_full_name, ' ', 1), ''), ''),
    nullif(trim(m->>'middle_name'), ''),
    coalesce(nullif(m->>'last_name', ''), nullif(m->>'family_name', ''),
             nullif(trim(substr(v_full_name, length(split_part(v_full_name, ' ', 1)) + 1)), ''), ''),
    nullif(trim(m->>'suffix'), ''),
    v_contact,
    nullif(trim(m->>'address'), ''),
    new.email,
    coalesce(nullif(m->>'auth_provider', ''), nullif(new.raw_app_meta_data->>'provider', ''), 'password'),
    coalesce(new.email_confirmed_at is not null, false),
    false,
    coalesce(v_account_for, 'self'),
    case when v_terms then now() end,
    case when v_terms then nullif(m->>'terms_version', '') end
  )
  on conflict (id) do nothing;
  return new;
end
$$;

-- 2. USR-33: the account is verified once Supabase confirms the email code.
create or replace function public.sync_profile_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set is_verified = true, updated_at = now()
    where id = new.id and not is_verified;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_profile_verified() from public, anon, authenticated;
drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute procedure public.sync_profile_verified();

-- Accounts confirmed before this trigger existed.
update public.profiles p set is_verified = true
from auth.users u
where u.id = p.id and u.email_confirmed_at is not null and not p.is_verified;

-- 3. USR-01: "This username or contact number is already registered." / "This email address is
--    already registered." before the account is created. Returns flags only, never account data.
create or replace function public.check_signup_available(p_username text, p_email text, p_contact text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'username_taken', exists (select 1 from public.profiles where username = nullif(trim(p_username), '')),
    'email_taken', exists (select 1 from public.profiles where lower(email) = lower(nullif(trim(p_email), ''))),
    'contact_taken', exists (select 1 from public.profiles
                             where contact_number = nullif(regexp_replace(coalesce(p_contact, ''), '\D', '', 'g'), ''))
  );
$$;
revoke all on function public.check_signup_available(text, text, text) from public;
grant execute on function public.check_signup_available(text, text, text) to anon, authenticated;

-- 4. USR-04: "No account found with this contact number." / "...email address." / Google-only.
--    Returns a status word only; the email address is never returned for a contact number.
create or replace function public.password_reset_status(p_mode text, p_value text)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_provider text;
  v_has_password boolean;
begin
  if p_mode = 'contact' then
    select id, auth_provider into v_id, v_provider from public.profiles
    where contact_number = regexp_replace(coalesce(p_value, ''), '\D', '', 'g') and role = 'client';
  elsif p_mode = 'email' then
    select id, auth_provider into v_id, v_provider from public.profiles
    where lower(email) = lower(trim(coalesce(p_value, ''))) and role = 'client';
  else
    raise exception 'bad_mode';
  end if;
  if v_id is null then return 'not_found'; end if;
  select coalesce(encrypted_password, '') <> '' into v_has_password from auth.users where id = v_id;
  if not coalesce(v_has_password, false) then return 'google_only'; end if;
  return 'ok';
end;
$$;
revoke all on function public.password_reset_status(text, text) from public;
grant execute on function public.password_reset_status(text, text) to anon, authenticated;
