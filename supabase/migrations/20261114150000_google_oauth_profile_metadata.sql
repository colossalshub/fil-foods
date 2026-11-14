create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    ''
  );
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    email,
    auth_provider,
    is_verified,
    profile_complete
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'first_name', ''),
      nullif(new.raw_user_meta_data->>'given_name', ''),
      nullif(split_part(v_full_name, ' ', 1), ''),
      ''
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'last_name', ''),
      nullif(new.raw_user_meta_data->>'family_name', ''),
      nullif(trim(substr(v_full_name, length(split_part(v_full_name, ' ', 1)) + 1)), ''),
      ''
    ),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'auth_provider', ''),
      nullif(new.raw_app_meta_data->>'provider', ''),
      'password'
    ),
    coalesce(new.email_confirmed_at is not null, false),
    false
  )
  on conflict (id) do nothing;
  return new;
end
$$;
