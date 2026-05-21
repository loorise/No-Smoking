-- Run in Supabase SQL Editor

create table if not exists public.smoking_events (
  id bigint primary key,
  user_id text not null,
  timestamp bigint not null,
  duration integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists smoking_events_user_id_idx
  on public.smoking_events (user_id);

create index if not exists smoking_events_user_timestamp_idx
  on public.smoking_events (user_id, timestamp desc);

alter table public.smoking_events enable row level security;

create policy "smoking_events_select_own"
  on public.smoking_events
  for select
  using (true);

create policy "smoking_events_insert_own"
  on public.smoking_events
  for insert
  with check (true);

create policy "smoking_events_update_own"
  on public.smoking_events
  for update
  using (true)
  with check (true);

create policy "smoking_events_delete_own"
  on public.smoking_events
  for delete
  using (true);

-- Supabase Dashboard → Database → Replication: enable smoking_events for Realtime
