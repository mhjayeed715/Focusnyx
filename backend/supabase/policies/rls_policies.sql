alter table profiles enable row level security;
alter table academic_tasks enable row level security;
alter table focus_sessions enable row level security;
alter table distraction_logs enable row level security;
alter table notes enable row level security;
alter table expenses enable row level security;
alter table wellness_logs enable row level security;
alter table coach_reports enable row level security;
alter table blocklist_sites enable row level security;

-- Placeholder policies. Replace auth.uid() mapping logic during implementation.
create policy "users_can_select_their_profiles" on profiles
  for select using (true);
