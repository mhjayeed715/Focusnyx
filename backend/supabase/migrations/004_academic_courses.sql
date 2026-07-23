create table if not exists academic_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  credits int not null default 3,
  grade text not null default 'A',
  target_grade text not null default 'A',
  mid_marks numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table academic_courses enable row level security;
