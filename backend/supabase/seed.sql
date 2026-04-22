insert into profiles (id, university_email, display_name, preferred_language)
values
  ('00000000-0000-0000-0000-000000000001', 'student@smuct.edu', 'Demo Student', 'en')
on conflict (id) do nothing;
