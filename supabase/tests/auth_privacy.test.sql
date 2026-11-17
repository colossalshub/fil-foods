-- Live sign-up (20261117140000) and privacy hardening (20261117150000) checks.
-- Runs after staff_workflow.test.sql on the same throwaway database (see run-local.sh).
\set QUIET on
\set ON_ERROR_STOP on
create or replace function pg_temp.expect_error(p_sql text, p_fragment text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'expected error containing "%" from: %', p_fragment, p_sql;
exception when others then
  if sqlerrm like 'expected error%' then raise; end if;
  if position(p_fragment in coalesce(sqlerrm, '')) = 0 then
    raise exception 'expected "%" but got "%" from: %', p_fragment, sqlerrm, p_sql;
  end if;
end $$;
create or replace function pg_temp.check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_label; end if;
  raise notice 'ok - %', p_label;
end $$;
\set QUIET off
set client_min_messages = notice;

-- USR-01: sign-up metadata becomes the profile ----------------------------------------------
insert into auth.users (id, email, encrypted_password, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000aa01', 'jose.rizal@example.com', 'hash',
   '{"first_name":"Jose","middle_name":"P","last_name":"Rizal","username":"joserizal","contact_number":"0917 555 0300",
     "address":"Calamba, Laguna","account_for":"family","terms_accepted":true,"terms_version":"1.0"}');
select pg_temp.check((select username || '|' || contact_number || '|' || address || '|' || account_for || '|' || terms_version
  from public.profiles where id = '00000000-0000-0000-0000-00000000aa01') = 'joserizal|09175550300|Calamba, Laguna|family|1.0',
  'sign-up details are copied into the profile');
select pg_temp.check(not (select is_verified from public.profiles where id = '00000000-0000-0000-0000-00000000aa01'), 'new accounts start unverified');
insert into auth.users (id, email, encrypted_password, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000aa02', 'copy.cat@example.com', 'hash', '{"first_name":"Copy","last_name":"Cat","username":"joserizal","contact_number":"09175550300"}');
select pg_temp.check((select username is null and contact_number is null from public.profiles where id = '00000000-0000-0000-0000-00000000aa02'),
  'a taken username or number does not break sign-up');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000aa01';
select pg_temp.check((select is_verified from public.profiles where id = '00000000-0000-0000-0000-00000000aa01'), 'confirming the email code verifies the account');
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-00000000aa03', 'google.only@example.com', '{"full_name":"Goo Gle"}', '{"provider":"google"}');

-- USR-01 / USR-04 lookups as anon: flags and status words only ------------------------------
begin;
set local role anon;
select pg_temp.check((public.check_signup_available('joserizal', 'JOSE.RIZAL@example.com', '09175550300'))
  = '{"email_taken": true, "contact_taken": true, "username_taken": true}'::jsonb, 'sign-up check finds taken username, email and number');
select pg_temp.check((public.check_signup_available('newname', 'new@example.com', '09990000000'))
  = '{"email_taken": false, "contact_taken": false, "username_taken": false}'::jsonb, 'sign-up check passes free values');
select pg_temp.check(public.password_reset_status('contact', '09999999999') = 'not_found', 'unknown number: not_found');
select pg_temp.check(public.password_reset_status('email', 'Jose.Rizal@example.com') = 'ok', 'registered email: ok');
select pg_temp.check(public.password_reset_status('email', 'google.only@example.com') = 'google_only', 'Google-only account: google_only');
select pg_temp.check(public.password_reset_status('email', 'admin@filfoods.ph') = 'not_found', 'staff accounts are not reset from the user app');
-- anon sees no rows of personal tables
select pg_temp.check((select count(*) from public.profiles) = 0 and (select count(*) from public.client_health_items) = 0
  and (select count(*) from public.meal_recipients) = 0 and (select count(*) from public.orders) = 0
  and (select count(*) from public.help_feedback) = 0 and (select count(*) from public.notifications) = 0, 'anon reads no personal rows');
select pg_temp.expect_error($$select * from public.meal_conflicts_with_client('00000000-0000-0000-0000-0000000000c1', gen_random_uuid())$$, 'permission denied');
select pg_temp.expect_error($$select public.append_audit_event('forged', '{}')$$, 'permission denied');
select pg_temp.expect_error($$select * from public.verify_audit_chain()$$, 'permission denied');
select pg_temp.expect_error($$select public.order_was_paid(gen_random_uuid())$$, 'permission denied');
commit;

-- P1/P2: signed-in users -------------------------------------------------------------------
select id as allergy_meal from public.meals where 'Fish' = any(allergens) or exists (
  select 1 from unnest(ingredients) i where i ilike '%fish%') limit 1 \gset
insert into public.client_health_items (client_id, item_type, value) values ('00000000-0000-0000-0000-00000000aa01', 'allergy', 'Fish');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
select pg_temp.expect_error($$select * from public.meal_conflicts_with_client('00000000-0000-0000-0000-0000000000c1', gen_random_uuid())$$, 'permission denied');
select pg_temp.check((select count(*) from public.my_meal_conflicts(:'allergy_meal')) = 1, 'users still see their own allergy conflicts');
select pg_temp.expect_error($$select public.append_audit_event('forged', '{}')$$, 'permission denied');
select pg_temp.expect_error($$select public.admin_audit_event('staff.create', '{}')$$, 'not_authorized');
-- P5: own profile edits
update public.profiles set first_name = 'José' where id = auth.uid();
select pg_temp.expect_error($$update public.profiles set email = 'someone.else@example.com' where id = auth.uid()$$, 'not_authorized');
select pg_temp.expect_error($$update public.profiles set auth_provider = 'google' where id = auth.uid()$$, 'not_authorized');
select pg_temp.expect_error($$update public.profiles set failed_attempts = 3 where id = auth.uid()$$, 'not_authorized');
-- P0: the escalation that worked before 20261117150000
select pg_temp.expect_error($$update public.profiles set role = 'owner_admin' where id = auth.uid()$$, 'not_authorized');
select pg_temp.expect_error($$update public.profiles set is_verified = false where id = auth.uid()$$, 'not_authorized');
commit;
select pg_temp.check((select first_name from public.profiles where id = '00000000-0000-0000-0000-00000000aa01') = 'José', 'users still edit their name');

-- P6: notifications can only be marked read
insert into public.notifications (client_id, title, body, notification_type) values ('00000000-0000-0000-0000-00000000aa01', 'Hello', 'Original', 'status_changed');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
update public.notifications set is_read = true where client_id = auth.uid();
select pg_temp.expect_error($$update public.notifications set body = 'Changed' where client_id = auth.uid()$$, 'permission denied');
commit;
select pg_temp.check((select is_read and body = 'Original' from public.notifications where client_id = '00000000-0000-0000-0000-00000000aa01'),
  'notifications: read flag only');

-- P4: Help & Support messages are for the Admin -------------------------------------------
insert into public.help_feedback (client_id, message) values ('00000000-0000-0000-0000-00000000aa01', 'My mother has a new allergy.');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select pg_temp.check(not exists (select 1 from public.help_feedback where client_id = '00000000-0000-0000-0000-00000000aa01'), 'kitchen cannot read client help messages');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.check(exists (select 1 from public.help_feedback where client_id = '00000000-0000-0000-0000-00000000aa01'), 'admin reads help messages');
select public.admin_audit_event('staff.create', '{"staff_id":"x"}') is not null as admin_audit;
select pg_temp.expect_error($$select public.admin_audit_event('order_created', '{}')$$, 'bad_event_type');
commit;
select pg_temp.check(public.purge_old_login_attempts() >= 0, 'login attempt purge runs');

-- P8: Kitchen and Delivery get allergies but not health conditions ---------------------------
select (select id from public.orders where client_id = '00000000-0000-0000-0000-0000000000c1' and status = 'completed' limit 1) as done_order \gset
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select pg_temp.check((public.staff_order_detail(:'done_order') -> 'dietary' -> 'conditions') = '[]'::jsonb
  and jsonb_typeof(public.staff_order_detail(:'done_order') -> 'dietary' -> 'allergies') = 'array', 'kitchen sees no health conditions');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select pg_temp.check(jsonb_array_length(public.staff_order_detail(:'done_order') -> 'dietary' -> 'conditions') > 0, 'the Dietitian still sees health conditions');
commit;

-- Every SECURITY DEFINER function pins search_path --------------------------------------------
select pg_temp.check(not exists (
  select 1 from pg_proc where pronamespace = 'public'::regnamespace and prosecdef
    and not exists (select 1 from unnest(coalesce(proconfig, '{}')) c where c like 'search_path=%')),
  'every SECURITY DEFINER function sets search_path');
select pg_temp.check(not exists (
  select 1 from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity),
  'every public table has RLS on');
\echo ALL AUTH AND PRIVACY CHECKS PASSED
