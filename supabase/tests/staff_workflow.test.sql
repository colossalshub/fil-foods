-- End-to-end staff workflow check against a local database with all migrations applied.
-- Run: psql -v ON_ERROR_STOP=1 -f supabase/tests/staff_workflow.test.sql (see supabase/tests/README.md)
\set QUIET on
\set ON_ERROR_STOP on

-- Fixtures (as the database owner) -------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@filfoods.ph', '{"first_name":"Admin","last_name":"Account"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'maria.santos@filfoods.ph', '{"first_name":"Maria","last_name":"Santos"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'juan.delacruz@filfoods.ph', '{"first_name":"Juan","last_name":"Dela Cruz"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'ana.reyes@filfoods.ph', '{"first_name":"Ana","last_name":"Reyes"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'mark.peralta@filfoods.ph', '{"first_name":"Mark","last_name":"Peralta"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'carlos.dizon@example.com', '{"first_name":"Carlos","last_name":"Dizon"}');
update public.profiles set role = 'owner_admin' where email = 'admin@filfoods.ph';
update public.profiles set role = 'dietitian_staff' where email = 'maria.santos@filfoods.ph';
update public.profiles set role = 'kitchen_staff' where email = 'juan.delacruz@filfoods.ph';
update public.profiles set role = 'delivery_staff' where email like '%.%@filfoods.ph' and email in ('ana.reyes@filfoods.ph', 'mark.peralta@filfoods.ph');
update public.profiles set is_verified = true, address = '42 Maharlika St, Pinyahan, Quezon City',
  contact_number = '09175550123', account_for = 'family' where email = 'carlos.dizon@example.com';
insert into public.meal_recipients (id, account_holder_id, first_name, last_name, contact_number, address)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Lia', 'Dizon', '09175550999', '42 Maharlika St, Pinyahan, Quezon City');
update public.profiles set meal_recipient_id = '00000000-0000-0000-0000-0000000000f1' where email = 'carlos.dizon@example.com';
insert into public.client_health_items (client_id, item_type, value, reaction_note) values
  ('00000000-0000-0000-0000-0000000000c1', 'allergy', 'Shellfish', 'Hives'),
  ('00000000-0000-0000-0000-0000000000c1', 'condition', 'Diabetes', null),
  ('00000000-0000-0000-0000-0000000000c1', 'condition', 'HTN', null),
  ('00000000-0000-0000-0000-0000000000c1', 'restriction', 'Low-sugar', null);
insert into public.nutritional_preferences (client_id, lower_sodium, higher_protein) values ('00000000-0000-0000-0000-0000000000c1', true, true);

-- A schedule inside kitchen hours, past the lead time.
select s as slot from generate_series(date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '10 days', interval '1 hour') s
where public.is_within_kitchen_hours(s) limit 1 \gset
-- A slot on a later day, so a second order does not reuse the first order's meal time.
select s as slot2 from generate_series(date_trunc('day', :'slot'::timestamptz) + interval '1 day', date_trunc('day', :'slot'::timestamptz) + interval '8 days', interval '1 hour') s
where public.is_within_kitchen_hours(s) limit 1 \gset
select id as meal_id from public.meals where is_available and not ('Shellfish' = any(allergens)) and not exists (
  select 1 from public.meal_conflicts_with_client('00000000-0000-0000-0000-0000000000c1', meals.id)) limit 1 \gset

create or replace function pg_temp.expect_error(p_sql text, p_fragment text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'expected error containing "%" from: %', p_fragment, p_sql;
exception when others then
  -- The "expected error" raised above also contains the fragment, so check for it first.
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

-- Client places a delivery order -> For Dietitian Review ---------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select id as order_id from public.place_order(gen_random_uuid(), 'delivery', :'slot'::timestamptz,
  '42 Maharlika St, Pinyahan, Quezon City', 'Call Lia. Blue gate.',
  jsonb_build_array(jsonb_build_object('meal_id', :'meal_id', 'quantity', 1))) \gset
select pg_temp.check((select status from public.orders where id = :'order_id') = 'for_dietitian_review', 'order starts in For Dietitian Review');
select pg_temp.expect_error('select public.staff_orders()', 'not_authorized');
select pg_temp.expect_error($$select public.record_order_status_change('$$ || :'order_id' || $$', 'paid')$$, 'permission denied');
select pg_temp.expect_error($$update public.profiles set role = 'owner_admin' where id = auth.uid()$$, 'not_authorized');
select pg_temp.expect_error($$select public.pay_order('$$ || :'order_id' || $$')$$, 'payment_not_due');
commit;

-- Dietitian sees the order, its dietary info; returns without reason fails; approves ---------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select pg_temp.check(jsonb_array_length(public.staff_orders()) = 1, 'dietitian lists the submitted order');
select pg_temp.check((public.staff_order_detail(:'order_id') -> 'dietary' -> 'conditions') ? 'Diabetes', 'dietitian sees health conditions');
select pg_temp.check((public.staff_order_detail(:'order_id') ->> 'first_name') = 'Lia', 'order shows the meal recipient, not the account holder');
select pg_temp.check(public.staff_order_detail(:'order_id') -> 'delivery' is null, 'dietitian never receives the delivery address');
select pg_temp.check((select count(*) from public.staff_notifications where recipient_id = auth.uid() and kind = 'reviewRequest') = 1, 'dietitian bell got the review request');
select pg_temp.expect_error($$select public.transition_order_status('$$ || :'order_id' || $$', 'awaiting_payment')$$, 'role_cannot_transition');
select pg_temp.expect_error($$select public.dietitian_review_order('$$ || :'order_id' || $$', false, '  ')$$, 'reason_required');
select pg_temp.expect_error($$insert into public.meals (name, category, price) values ('X', 'Lunch', 10)$$, 'row-level security');
select pg_temp.expect_error('select public.admin_audit_log(10)', 'not_authorized');
select public.dietitian_review_order(:'order_id', true, null) is not null as approved;
select pg_temp.expect_error($$select public.dietitian_review_order('$$ || :'order_id' || $$', true, null)$$, 'already_reviewed');
commit;
select pg_temp.check((select status from public.orders where id = :'order_id') = 'awaiting_payment', 'approval moves the order to Awaiting Payment');

-- Kitchen cannot see unpaid orders; client pays ------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select pg_temp.check(jsonb_array_length(public.staff_orders()) = 0, 'kitchen cannot see unpaid orders');
select pg_temp.check((select count(*) from public.orders) = 0, 'kitchen cannot read orders table directly');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select public.pay_order(:'order_id') is not null as paid;
select pg_temp.check((select count(*) from public.notifications where order_id = :'order_id' and title = 'Order approved') = 1, 'client was told the order was approved');
commit;

-- Kitchen prepares; sees first name + items, no price/address/last name -------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select public.staff_orders() -> 0 as kitchen_row \gset
select pg_temp.check((:'kitchen_row'::jsonb ->> 'first_name') = 'Lia' and not (:'kitchen_row'::jsonb ? 'total')
  and not (:'kitchen_row'::jsonb ? 'customer_name') and not ((:'kitchen_row'::jsonb -> 'items' -> 0) ? 'unit_price'), 'kitchen row is first name + food only');
select pg_temp.check(public.staff_order_detail(:'order_id') -> 'delivery' is null
  and not (public.staff_order_detail(:'order_id') ? 'special_instructions'), 'kitchen detail has no address or delivery notes');
select pg_temp.check((public.staff_order_detail(:'order_id') -> 'dietary' -> 'allergies' -> 0 ->> 'value') = 'Shellfish', 'kitchen sees allergies before acting');
select pg_temp.check((select count(*) from public.staff_notifications where recipient_id = auth.uid() and kind = 'newOrder') = 1, 'kitchen bell got the paid order');
select pg_temp.expect_error($$select public.transition_order_status('$$ || :'order_id' || $$', 'ready_for_delivery')$$, 'role_cannot_transition');
select public.transition_order_status(:'order_id', 'preparing') is not null as preparing;
select pg_temp.check((public.staff_customer_detail('00000000-0000-0000-0000-0000000000c1') ? 'history') = false, 'kitchen customer view has no order history');
select pg_temp.expect_error('select public.staff_customers()', 'not_authorized');
select pg_temp.expect_error($$select public.assign_delivery_staff('$$ || :'order_id' || $$', '00000000-0000-0000-0000-0000000000e2')$$, 'not_authorized');
update public.meals set price = price where id = :'meal_id';
commit;

-- Admin assigns Mark; only delivery-role staff can be picked -----------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.expect_error($$select public.assign_delivery_staff('$$ || :'order_id' || $$', '00000000-0000-0000-0000-0000000000b1')$$, 'not_delivery_staff');
select public.assign_delivery_staff(:'order_id', '00000000-0000-0000-0000-0000000000e2') is not null as assigned;
select pg_temp.check((public.staff_order_detail(:'order_id') ->> 'assignee_name') = 'Mark Peralta', 'admin sees the assignee on the order');
select pg_temp.check((public.staff_order_detail(:'order_id') -> 'delivery' ->> 'address') like '42 Maharlika%', 'admin sees the delivery address');
select pg_temp.check(jsonb_array_length(public.staff_customers()) = 1, 'admin customer list has only clients');
select pg_temp.check(exists (select 1 from jsonb_array_elements(public.admin_audit_log(50)) e where e ->> 'event_type' = 'menu.update'), 'menu change by kitchen is in the audit log');
select pg_temp.expect_error($$select public.dietitian_removal_requests('pending')$$, 'not_authorized');
commit;

-- Kitchen marks ready -> Mark notified; Ana cannot see it ---------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select public.transition_order_status(:'order_id', 'ready_for_delivery') is not null as ready;
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
select pg_temp.check(jsonb_array_length(public.staff_orders()) = 0, 'unassigned delivery staff cannot see the order');
select pg_temp.expect_error($$select public.transition_order_status('$$ || :'order_id' || $$', 'out_for_delivery')$$, 'not_assigned');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);
select pg_temp.check(jsonb_array_length(public.staff_orders()) = 1, 'assigned delivery staff sees the order');
select pg_temp.check((public.staff_order_detail(:'order_id') -> 'delivery' ->> 'contact_number') = '09175550999', 'delivery sees recipient contact and address');
select pg_temp.check(not (public.staff_order_detail(:'order_id') ? 'total'), 'delivery never sees prices');
select pg_temp.check((select count(*) from public.staff_notifications where recipient_id = auth.uid() and kind = 'readyForPickup') >= 1, 'assigned delivery staff was notified');
select public.transition_order_status(:'order_id', 'out_for_delivery') is not null as out_for_delivery;
select public.transition_order_status(:'order_id', 'completed') is not null as completed;
commit;
select pg_temp.check((select array_agg(status::text order by changed_at) from public.order_status_history where order_id = :'order_id')
  = array['for_dietitian_review','awaiting_payment','paid','preparing','ready_for_delivery','out_for_delivery','completed'], 'full lifecycle recorded with timestamps');
select pg_temp.check(exists (select 1 from public.notifications where order_id = :'order_id' and body like '%is now Completed.'), 'client sees Completed wording');

-- ADM-21: Admin turns off delivery menu updates; staff cannot change settings ---------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select pg_temp.expect_error($$select public.save_staff_notification_settings('kitchen', false, '{}')$$, 'not_authorized');
update public.settings set value = '{}' where key = 'staff_notifications';
commit;
select pg_temp.check((select value -> 'kitchen' ->> 'enabled' from public.settings where key = 'staff_notifications') = 'true', 'staff cannot change notification settings');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select public.save_staff_notification_settings('delivery', true, '{"readyForPickup": true, "menuUpdated": false}') is not null as saved;
select public.save_staff_notification_settings('kitchen', true, '{"newOrder": false, "menuUpdated": false}') is not null as saved_off;
commit;
select pg_temp.check((select value -> 'kitchen' ->> 'enabled' from public.settings where key = 'staff_notifications') = 'false', 'every type OFF means notifications OFF');
select pg_temp.check(not public.staff_notification_enabled('delivery_staff', 'menuUpdated') and public.staff_notification_enabled('delivery_staff', 'readyForPickup'), 'delivery only receives types that are ON');
select pg_temp.check((select count(*) from public.audit_events where event_type = 'staff_notifications.updated') = 2, 'notification setting changes are logged');

-- DIT-15 return with reason closes the order and tells the user why ------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select id as order2 from public.place_order(gen_random_uuid(), 'pick_up', :'slot2'::timestamptz, null, null,
  jsonb_build_array(jsonb_build_object('meal_id', :'meal_id', 'quantity', 1))) \gset
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select public.dietitian_review_order(:'order2', false, 'Swap the dessert for fruit.') is not null as returned;
commit;
select pg_temp.check((select status::text || '|' || review_decision || '|' || review_reason from public.orders where id = :'order2')
  = 'cancelled|returned|Swap the dessert for fruit.', 'returned order records decision and reason');
select pg_temp.check(exists (select 1 from public.notifications where order_id = :'order2' and body like '%Swap the dessert for fruit.%'), 'user is told the reason');

-- DIT-17 removal requests ---------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select pg_temp.expect_error($$select public.request_health_condition_removal('Gout', null)$$, 'condition_not_found');
select id as req1 from public.request_health_condition_removal('Diabetes', 'Doctor''s note says blood sugar is back to normal.') \gset
select id as req2 from public.request_health_condition_removal('HTN', null) \gset
select pg_temp.check((select id from public.request_health_condition_removal('Diabetes', null)) = :'req1', 'a second request for the same condition reuses the pending one');
select pg_temp.expect_error($$select public.decide_health_condition_removal('$$ || :'req1' || $$', true, null)$$, 'not_authorized');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select pg_temp.check((public.dietitian_removal_requests('pending') -> 0 ->> 'recipient_name') = 'Lia Dizon'
  and (public.dietitian_removal_requests('pending') -> 0 ->> 'requested_by') = 'Carlos Dizon', 'requests list recipient and requester, oldest first');
select pg_temp.check((public.dietitian_removal_request_detail(:'req1') -> 'dietary' -> 'allergies' -> 0 ->> 'value') = 'Shellfish', 'request shows other dietary info');
select public.decide_health_condition_removal(:'req1', true, null) is not null as approved;
select pg_temp.expect_error($$select public.decide_health_condition_removal('$$ || :'req1' || $$', false, 'late')$$, 'already_decided');
select pg_temp.expect_error($$select public.decide_health_condition_removal('$$ || :'req2' || $$', false, '')$$, 'reason_required');
select public.decide_health_condition_removal(:'req2', false, 'Please send a recent doctor''s note.') is not null as rejected;
commit;
select pg_temp.check(not exists (select 1 from public.client_health_items where client_id = '00000000-0000-0000-0000-0000000000c1' and value = 'Diabetes'), 'approved condition was removed');
select pg_temp.check(exists (select 1 from public.client_health_items where client_id = '00000000-0000-0000-0000-0000000000c1' and value = 'HTN'), 'rejected condition stays');
select pg_temp.check(exists (select 1 from public.notifications where body = 'Your request to remove Diabetes from Lia Dizon''s health conditions was approved.'), 'approval notice wording');
select pg_temp.check(exists (select 1 from public.notifications where body like 'Your request to remove HTN from Lia Dizon''s health conditions was not approved. Please send%'), 'rejection notice includes the reason');
select pg_temp.check((select count(*) from public.audit_events where event_type = 'health_condition_removal.decided') = 2, 'removal decisions are audited');
select pg_temp.check((select count(*) from public.profile_change_history where client_id = '00000000-0000-0000-0000-0000000000c1' and field_name = 'Health conditions') = 1, 'approval is in change history');
select pg_temp.check(public.verify_audit_chain() is not null, 'audit chain still verifies');

-- ADM-16: a deactivated staff member loses access immediately ----------------------------
update public.profiles set is_active = false where email = 'mark.peralta@filfoods.ph';
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);
select pg_temp.expect_error('select public.staff_orders()', 'not_authorized');
commit;

-- ADM-06 / DIT-06: a confirmed auth email change reaches the profile ------------------------
update auth.users set email = 'Maria.New@filfoods.ph' where id = (select id from public.profiles where email = 'maria.santos@filfoods.ph');
select pg_temp.check(exists (select 1 from public.profiles where email = 'maria.new@filfoods.ph'), 'auth email change syncs to profiles');
-- DIT-17: the client cannot delete a condition directly; adding one is allowed ----------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select pg_temp.expect_error($$delete from public.client_health_items where client_id = '00000000-0000-0000-0000-0000000000c1' and item_type = 'condition'$$, 'condition_removal_requires_review');
select pg_temp.expect_error($$update public.client_health_items set value = 'Nothing' where client_id = '00000000-0000-0000-0000-0000000000c1' and item_type = 'condition'$$, 'condition_removal_requires_review');
insert into public.client_health_items (client_id, item_type, value) values ('00000000-0000-0000-0000-0000000000c1', 'condition', 'Gout');
delete from public.client_health_items where client_id = '00000000-0000-0000-0000-0000000000c1' and item_type = 'allergy' and value = 'Shellfish';
commit;
select pg_temp.check(exists (select 1 from public.client_health_items where client_id = '00000000-0000-0000-0000-0000000000c1' and value = 'Gout')
  and not exists (select 1 from public.client_health_items where client_id = '00000000-0000-0000-0000-0000000000c1' and value = 'Shellfish'),
  'clients add conditions and edit allergies freely');
-- Schema audit (20261117130000) ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c2', 'rosa.lim@example.com', '{"first_name":"Rosa","last_name":"Lim"}');
update public.profiles set is_verified = true, address = '7 Kamias Rd, Quezon City', account_for = 'self'
where email = 'rosa.lim@example.com';
select id as breakfast_id from public.meals where is_available and category = 'Breakfast' and not exists (
  select 1 from public.meal_conflicts_with_client('00000000-0000-0000-0000-0000000000c2', meals.id)) limit 1 \gset
select id as lunch_id from public.meals where is_available and category = 'Lunch' and not exists (
  select 1 from public.meal_conflicts_with_client('00000000-0000-0000-0000-0000000000c2', meals.id)) limit 1 \gset
select id as lunch2_id from public.meals where is_available and category = 'Lunch' and id <> :'lunch_id' and not exists (
  select 1 from public.meal_conflicts_with_client('00000000-0000-0000-0000-0000000000c2', meals.id)) limit 1 \gset
select id as dinner_id from public.meals where is_available and category = 'Dinner' and not exists (
  select 1 from public.meal_conflicts_with_client('00000000-0000-0000-0000-0000000000c2', meals.id)) limit 1 \gset

select pg_temp.check((select relrowsecurity from pg_class where oid = 'public.meal_recipients'::regclass), 'meal_recipients has RLS on');
select pg_temp.check((select string_agg(id || '=' || price::integer, ',' order by sort_order) from public.meal_plans)
  = 'weekly=4999,monthly=27899,yearly=327999', 'plan prices match USR-20 A');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select pg_temp.check(not exists (select 1 from public.meal_recipients), 'another account cannot read meal recipients');
select pg_temp.check((select count(*) from public.meal_plans) = 3, 'signed-in users can read plans');
update public.meal_plans set price = 1;
select pg_temp.expect_error($$select public.place_order(gen_random_uuid(), 'pick_up', '$$ || :'slot' || $$', null, null,
  jsonb_build_array(jsonb_build_object('meal_id', '$$ || :'lunch_id' || $$', 'quantity', 2)))$$, 'one_meal_per_time');
select pg_temp.expect_error($$select public.place_order(gen_random_uuid(), 'pick_up', '$$ || :'slot' || $$', null, null,
  jsonb_build_array(jsonb_build_object('meal_id', '$$ || :'lunch_id' || $$', 'quantity', 1),
                    jsonb_build_object('meal_id', '$$ || :'lunch2_id' || $$', 'quantity', 1)))$$, 'one_meal_per_time');
select pg_temp.expect_error($$select public.place_order(gen_random_uuid(), 'pick_up', '$$ || :'slot' || $$', null, null,
  jsonb_build_array(jsonb_build_object('meal_id', '$$ || :'breakfast_id' || $$', 'quantity', 1),
                    jsonb_build_object('meal_id', '$$ || :'lunch_id' || $$', 'quantity', 1),
                    jsonb_build_object('meal_id', '$$ || :'dinner_id' || $$', 'quantity', 1),
                    jsonb_build_object('meal_id', '$$ || :'lunch2_id' || $$', 'quantity', 1, 'meal_time', 'Snack')))$$, 'max_meals_per_day');
select pg_temp.expect_error($$select public.place_order(gen_random_uuid(), 'pick_up', '$$ || :'slot' || $$', null, null,
  jsonb_build_array(jsonb_build_object('meal_id', '$$ || :'lunch_id' || $$', 'quantity', 1)), 'daily')$$, 'plan_unavailable');
select id as plan_order, total as plan_total, plan_id as plan_used from public.place_order(gen_random_uuid(), 'pick_up', :'slot'::timestamptz, null, null,
  jsonb_build_array(jsonb_build_object('meal_id', :'lunch_id', 'quantity', 1),
                    jsonb_build_object('meal_id', :'lunch2_id', 'quantity', 1, 'meal_time', 'Dinner')), 'weekly') \gset
select pg_temp.expect_error($$select public.place_order(gen_random_uuid(), 'pick_up', '$$ || :'slot' || $$', null, null,
  jsonb_build_array(jsonb_build_object('meal_id', '$$ || :'dinner_id' || $$', 'quantity', 1)))$$, 'one_meal_per_time');
select id as std_order, total as std_total from public.place_order(gen_random_uuid(), 'pick_up', :'slot'::timestamptz, null, null,
  jsonb_build_array(jsonb_build_object('meal_id', :'breakfast_id', 'quantity', 1))) \gset
commit;
select pg_temp.check((select price from public.meal_plans where id = 'weekly') = 4999, 'clients cannot change plan prices');
select pg_temp.check(:'plan_total'::numeric = 4999 and :'plan_used' = 'weekly', 'a Weekly plan order totals ₱4,999 on the server');
select pg_temp.check(:'std_total'::numeric = (select price from public.meals where id = :'breakfast_id'), 'a Standard order totals the meal price');
select pg_temp.check((select array_agg(meal_time order by meal_time) from public.order_items where order_id = :'plan_order') = array['Dinner', 'Lunch'],
  'order items keep the chosen meal time');
select pg_temp.check(exists (select 1 from public.notifications where order_id = :'order2' and body like 'Order TRK-%for Lia Dizon was sent to the Dietitian for review.'),
  'family orders name the meal recipient');
select pg_temp.check(exists (select 1 from public.notifications n join public.orders o on o.id = n.order_id where n.order_id = :'std_order'
  and n.body = 'Order ' || o.tracking_number || ' was sent to the Dietitian for review.'), 'self orders do not add a recipient name');
select pg_temp.check(exists (select 1 from public.notifications where order_id = :'order_id' and body like 'Order TRK-%for Lia Dizon is now Out for Delivery.'),
  'status notices follow USR-25 wording');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
insert into public.help_feedback (client_id, topic, message) values (auth.uid(), 'Account access', 'I cannot see today''s orders.');
select pg_temp.expect_error($$insert into public.help_feedback (client_id, message) values ('00000000-0000-0000-0000-0000000000c2', 'spoof')$$, 'row-level security');
commit;
select pg_temp.check(exists (select 1 from public.help_feedback where topic = 'Account access'), 'staff help messages are stored with a topic');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select pg_temp.expect_error($$update public.profiles set meal_recipient_id = '00000000-0000-0000-0000-0000000000f1' where id = auth.uid()$$, 'recipient_not_owned');
select pg_temp.expect_error($$select public.save_meal_recipient('{"first_name":"Ben"}')$$, 'recipient_name_required');
select id as rosa_recipient from public.save_meal_recipient('{"first_name":"Ben","last_name":"Lim","relationship":"Parent","contact_number":"0917 555 0111","address":"7 Kamias Rd, Quezon City"}') \gset
select pg_temp.check((select id from public.save_meal_recipient('{"first_name":"Benito","last_name":"Lim"}')) = :'rosa_recipient', 'one recipient per account, updated in place');
commit;
select pg_temp.check((select account_for || '|' || meal_recipient_id from public.profiles where email = 'rosa.lim@example.com') = 'family|' || :'rosa_recipient',
  'saving a recipient links it to the profile');
\echo ALL STAFF WORKFLOW CHECKS PASSED
