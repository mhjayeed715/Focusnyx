-- ============================================================
-- Focusnyx — Full Schema
-- Run this ONCE in Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Profiles ────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  university_email text unique not null,
  display_name text not null,
  preferred_language text not null default 'en',
  level int not null default 1,
  total_xp int not null default 0,
  streak int not null default 0,
  groq_api_key text,
  gemini_api_key text,
  ai_provider text default 'groq',
  created_at timestamptz not null default now()
);

-- ─── Academic Tasks ──────────────────────────────────────────
create table if not exists academic_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null,
  estimated_minutes int not null,
  xp_reward int not null default 0,
  is_completed boolean not null default false,
  subtasks jsonb not null default '[]',
  due_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Academic Semester CGPAs ──────────────────────────────────
create table if not exists academic_semester_cgpas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_no int,
  cgpa_value numeric(4,2) not null check (cgpa_value >= 0 and cgpa_value <= 4),
  created_at timestamptz not null default now()
);

-- ─── Academic Exams ─────────────────────────────────────────
create table if not exists academic_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  exam_date date not null,
  created_at timestamptz not null default now()
);

-- ─── Academic Courses (per-user, per-semester) ───────────────
create table if not exists academic_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  credits numeric(4,1) not null default 3 check (credits >= 0.5),
  grade text not null default 'A',
  target_grade text not null default 'A',
  mid_marks numeric(5,2) not null default 0 check (mid_marks >= 0 and mid_marks <= 40),
  created_at timestamptz not null default now()
);

-- ─── Focus Sessions ───────────────────────────────────────────
create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  planned_minutes int not null,
  actual_minutes int,
  created_at timestamptz not null default now()
);

-- ─── Distraction Logs ────────────────────────────────────────
create table if not exists distraction_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text,
  type text,
  details jsonb,
  timestamp timestamptz default now(),
  blocked_at timestamptz not null default now()
);

-- ─── Notes ───────────────────────────────────────────────────
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  content text not null,
  source text not null default 'typed',
  created_at timestamptz not null default now()
);

-- ─── Wellness Logs ───────────────────────────────────────────
create table if not exists wellness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null,
  sleep_hours numeric(4,2) not null,
  study_hours numeric(4,2),
  rest_hours numeric(4,2),
  created_at timestamptz not null default now()
);

-- ─── Weekly AI Reports ───────────────────────────────────────
create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  raw_data jsonb,
  ai_report text,
  highlights jsonb,
  generated_at timestamptz default now()
);

-- ─── Coach Reports ────────────────────────────────────────────
create table if not exists coach_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  report text not null,
  generated_at timestamptz not null default now()
);

-- ─── Blocklist Sites ─────────────────────────────────────────
create table if not exists blocklist_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, domain)
);

-- ─── Finance: Transactions ───────────────────────────────────
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ─── Finance: Monthly Budgets ────────────────────────────────
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,          -- store as first day of month: 2025-06-01
  limit_amount numeric(12,2) not null default 0 check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  unique(user_id, month)
);

-- ─── Finance: Debts / Loans ──────────────────────────────────
create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('lent', 'borrowed')),
  person_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  status text not null default 'pending' check (status in ('pending', 'settled')),
  created_at timestamptz not null default now()
);

-- ─── Finance: Savings Goals ──────────────────────────────────
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  deadline date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_academic_exams_user on academic_exams(user_id);
create index if not exists idx_academic_tasks_user on academic_tasks(user_id);
create index if not exists idx_academic_semester_cgpas_user on academic_semester_cgpas(user_id);
create index if not exists idx_academic_courses_user on academic_courses(user_id);
create index if not exists idx_focus_sessions_user on focus_sessions(user_id);
create index if not exists idx_transactions_user on transactions(user_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_budgets_user on budgets(user_id);
create index if not exists idx_debts_user on debts(user_id);
create index if not exists idx_savings_goals_user on savings_goals(user_id);
create index if not exists idx_notes_user on notes(user_id);
create index if not exists idx_wellness_logs_user on wellness_logs(user_id);

-- ============================================================
-- Row Level Security — enable on every table
-- ============================================================
alter table profiles enable row level security;
alter table academic_tasks enable row level security;
alter table academic_exams enable row level security;
alter table academic_courses enable row level security;
alter table focus_sessions enable row level security;
alter table distraction_logs enable row level security;
alter table notes enable row level security;
alter table wellness_logs enable row level security;
alter table weekly_reports enable row level security;
alter table coach_reports enable row level security;
alter table blocklist_sites enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table debts enable row level security;
alter table savings_goals enable row level security;

-- ============================================================
-- RLS Policies
-- ============================================================

-- profiles: users can read/upsert only their own row
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select using (auth.uid() = id);

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- academic_tasks
drop policy if exists "academic_tasks_all" on academic_tasks;
create policy "academic_tasks_all" on academic_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- academic_exams
drop policy if exists "academic_exams_all" on academic_exams;
create policy "academic_exams_all" on academic_exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- academic_semester_cgpas
drop policy if exists "semester_cgpas_all" on academic_semester_cgpas;
create policy "semester_cgpas_all" on academic_semester_cgpas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- academic_courses
drop policy if exists "academic_courses_all" on academic_courses;
create policy "academic_courses_all" on academic_courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- focus_sessions
drop policy if exists "focus_sessions_all" on focus_sessions;
create policy "focus_sessions_all" on focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- distraction_logs
drop policy if exists "distraction_logs_all" on distraction_logs;
create policy "distraction_logs_all" on distraction_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notes
drop policy if exists "notes_all" on notes;
create policy "notes_all" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wellness_logs
drop policy if exists "wellness_logs_all" on wellness_logs;
create policy "wellness_logs_all" on wellness_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- weekly_reports
drop policy if exists "weekly_reports_all" on weekly_reports;
drop policy if exists "Users see own reports" on weekly_reports;
create policy "weekly_reports_all" on weekly_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- coach_reports
drop policy if exists "coach_reports_all" on coach_reports;
create policy "coach_reports_all" on coach_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- blocklist_sites
drop policy if exists "blocklist_sites_all" on blocklist_sites;
create policy "blocklist_sites_all" on blocklist_sites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- transactions
drop policy if exists "transactions_all" on transactions;
create policy "transactions_all" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- budgets
drop policy if exists "budgets_all" on budgets;
create policy "budgets_all" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- debts
drop policy if exists "debts_all" on debts;
create policy "debts_all" on debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- savings_goals
drop policy if exists "savings_goals_all" on savings_goals;
create policy "savings_goals_all" on savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on signup (trigger)
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, university_email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
