-- USR-29 help comments durable for staff review (ADM settings / support workflows).

create table if not exists public.help_feedback (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists help_feedback_created_idx on public.help_feedback (created_at desc);

alter table public.help_feedback enable row level security;

drop policy if exists help_feedback_insert_self on public.help_feedback;
create policy help_feedback_insert_self on public.help_feedback
  for insert
  with check (client_id = auth.uid());

drop policy if exists help_feedback_select_self on public.help_feedback;
create policy help_feedback_select_self on public.help_feedback
  for select
  using (client_id = auth.uid());

drop policy if exists help_feedback_staff_read on public.help_feedback;
create policy help_feedback_staff_read on public.help_feedback
  for select
  using (public.is_staff());