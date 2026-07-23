-- ============================================================
-- Focusnyx — Wellness & Study Plan Schema Extension
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Academic Study Plans ────────────────────────────────────
create table if not exists academic_study_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

-- ─── Wellness: Hydration ─────────────────────────────────────
create table if not exists wellness_hydration (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  glasses int not null default 0 check (glasses >= 0),
  goal int not null default 8 check (goal > 0),
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);

-- ─── Wellness: Sleep Sessions ────────────────────────────────
create table if not exists wellness_sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  bedtime text,
  wake_time text,
  quality int not null default 3 check (quality >= 1 and quality <= 5),
  duration_hours numeric(4,1) not null default 0 check (duration_hours >= 0),
  created_at timestamptz not null default now()
);

-- ─── Wellness: Mood Entries ──────────────────────────────────
create table if not exists wellness_mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  mood text not null,
  note text,
  created_at timestamptz not null default now()
);

-- ─── Wellness: Medications ───────────────────────────────────
create table if not exists wellness_medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dosage text,
  frequency text not null default 'daily',
  time_of_day text not null default 'morning',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Wellness: Medication Logs ───────────────────────────────
create table if not exists wellness_medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null references wellness_medications(id) on delete cascade,
  log_date date not null default current_date,
  taken boolean not null default false,
  created_at timestamptz not null default now(),
  unique(medication_id, log_date)
);

-- ─── Wellness: Activity (Steps) ─────────────────────────────
create table if not exists wellness_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  steps int not null default 0 check (steps >= 0),
  goal int not null default 10000 check (goal > 0),
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);

-- ─── Wellness: Body Metrics ─────────────────────────────────
create table if not exists wellness_body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  weight_kg numeric(5,1),
  height_cm numeric(5,1),
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);

-- ─── Wellness: Daily Snapshot (burnout log) ────────────────
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

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_daily_wellness_user on daily_wellness(user_id);
create index if not exists idx_daily_wellness_date on daily_wellness(log_date);
create index if not exists idx_wellness_hydration_user on wellness_hydration(user_id);
create index if not exists idx_wellness_hydration_date on wellness_hydration(log_date);
create index if not exists idx_wellness_sleep_user on wellness_sleep_sessions(user_id);
create index if not exists idx_wellness_mood_user on wellness_mood_entries(user_id);
create index if not exists idx_wellness_medications_user on wellness_medications(user_id);
create index if not exists idx_wellness_medication_logs_user on wellness_medication_logs(user_id);
create index if not exists idx_wellness_activity_user on wellness_activity(user_id);
create index if not exists idx_wellness_body_metrics_user on wellness_body_metrics(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table academic_study_plans enable row level security;
alter table wellness_hydration enable row level security;
alter table wellness_sleep_sessions enable row level security;
alter table wellness_mood_entries enable row level security;
alter table wellness_medications enable row level security;
alter table wellness_medication_logs enable row level security;
alter table wellness_activity enable row level security;
alter table wellness_body_metrics enable row level security;
alter table daily_wellness enable row level security;

-- ============================================================
-- RLS Policies
-- ============================================================

-- academic_study_plans
create policy "study_plans_select" on academic_study_plans for select using (auth.uid() = user_id);
create policy "study_plans_insert" on academic_study_plans for insert with check (auth.uid() = user_id);
create policy "study_plans_update" on academic_study_plans for update using (auth.uid() = user_id);

-- wellness_hydration
create policy "hydration_all" on wellness_hydration
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wellness_sleep_sessions
create policy "sleep_all" on wellness_sleep_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wellness_mood_entries
create policy "mood_all" on wellness_mood_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wellness_medications
create policy "medications_all" on wellness_medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wellness_medication_logs
create policy "medication_logs_all" on wellness_medication_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wellness_activity
create policy "activity_all" on wellness_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wellness_body_metrics
create policy "body_metrics_all" on wellness_body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- daily_wellness
create policy "daily_wellness_all" on daily_wellness
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
