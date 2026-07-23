-- Drop all existing policies first
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_update" on profiles;
drop policy if exists "academic_tasks_all" on academic_tasks;
drop policy if exists "academic_exams_all" on academic_exams;
drop policy if exists "semester_cgpas_all" on academic_semester_cgpas;
drop policy if exists "academic_courses_all" on academic_courses;
drop policy if exists "focus_sessions_all" on focus_sessions;
drop policy if exists "distraction_logs_all" on distraction_logs;
drop policy if exists "notes_all" on notes;
drop policy if exists "notes_select" on notes;
drop policy if exists "notes_insert" on notes;
drop policy if exists "notes_update" on notes;
drop policy if exists "notes_delete" on notes;
drop policy if exists "wellness_logs_all" on wellness_logs;
drop policy if exists "coach_reports_all" on coach_reports;
drop policy if exists "blocklist_sites_all" on blocklist_sites;
drop policy if exists "transactions_all" on transactions;
drop policy if exists "budgets_all" on budgets;
drop policy if exists "debts_all" on debts;
drop policy if exists "savings_goals_all" on savings_goals;

-- Recreate all policies
create policy "profiles_select" on profiles for select using (auth.uid() = id);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

create policy "academic_tasks_all" on academic_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "academic_exams_all" on academic_exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "semester_cgpas_all" on academic_semester_cgpas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "academic_courses_all" on academic_courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "focus_sessions_all" on focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "distraction_logs_all" on distraction_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_all" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wellness_logs_all" on wellness_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "coach_reports_all" on coach_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "blocklist_sites_all" on blocklist_sites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_all" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_all" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "debts_all" on debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "savings_goals_all" on savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Recreate trigger
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, university_email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
