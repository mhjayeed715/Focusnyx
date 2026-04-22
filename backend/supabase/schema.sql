create table if not exists profiles (
  id uuid primary key,
  university_email text unique not null,
  display_name text not null,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists academic_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  subject text not null,
  estimated_minutes int not null,
  xp_reward int not null default 0,
  is_completed boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  planned_minutes int not null,
  actual_minutes int,
  created_at timestamptz not null default now()
);

create table if not exists distraction_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  domain text not null,
  blocked_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  content text not null,
  source text not null default 'typed',
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount_bdt numeric(12,2) not null,
  category text not null,
  spent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists wellness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mood text not null,
  sleep_hours numeric(4,2) not null,
  study_hours numeric(4,2),
  rest_hours numeric(4,2),
  created_at timestamptz not null default now()
);

create table if not exists coach_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  period text not null,
  report text not null,
  generated_at timestamptz not null default now()
);

create table if not exists blocklist_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  domain text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, domain)
);
