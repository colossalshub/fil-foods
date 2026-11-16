-- Run in Supabase SQL editor after Auth users exist (or after scripts/seed-staff-users.mjs).

update public.profiles
set role = 'owner_admin', is_verified = true, is_active = true, profile_complete = true, updated_at = now()
where lower(email) = 'admin@filfoods.ph';

update public.profiles
set role = 'dietitian_staff', is_verified = true, is_active = true, profile_complete = true, updated_at = now()
where lower(email) = 'maria.santos@filfoods.ph';

update public.profiles
set role = 'kitchen_staff', is_verified = true, is_active = true, profile_complete = true, updated_at = now()
where lower(email) = 'juan.delacruz@filfoods.ph';

update public.profiles
set role = 'delivery_staff', is_verified = true, is_active = true, profile_complete = true, updated_at = now()
where lower(email) in ('ana.reyes@filfoods.ph', 'mark.peralta@filfoods.ph');