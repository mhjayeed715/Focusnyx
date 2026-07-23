-- ============================================================
-- Migration: Add daily_wellness table
-- Run this in Supabase SQL Editor (safe to run on existing DB)
-- ============================================================

create table if not exists daily_wellness (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  sleep_hours numeric(4,1) not null default 0,
  mood_key text not null default 'okay',
  hydration_glasses int not null default 0,
  hydration_goal int not null default 8,
  steps int not null default 0,
  steps_goal int not null default 10000,
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);

create index if not exists idx_daily_wellness_user on daily_wellness(user_id);
create index if not exists idx_daily_wellness_date on daily_wellness(log_date);

alter table daily_wellness enable row level security;

create policy "daily_wellness_all" on daily_wellness
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
