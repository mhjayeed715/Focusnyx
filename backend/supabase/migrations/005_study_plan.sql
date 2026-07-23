create table if not exists academic_study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table academic_study_plans enable row level security;

create policy "Users manage own study plan"
  on academic_study_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
