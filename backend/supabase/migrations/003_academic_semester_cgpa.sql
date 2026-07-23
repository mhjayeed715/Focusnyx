create table if not exists academic_semester_cgpas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  semester_no int,
  cgpa_value numeric(3,2) not null,
  created_at timestamptz not null default now()
);

alter table academic_semester_cgpas enable row level security;
