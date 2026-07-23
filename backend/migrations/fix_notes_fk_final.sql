-- Run in Supabase SQL Editor

-- Step 1: Drop the broken FK
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;

-- Step 2: Re-add it pointing to auth.users (correct target)
ALTER TABLE notes
  ADD CONSTRAINT notes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Back-fill any missing profile rows for existing auth users
INSERT INTO profiles (id, university_email, display_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT DO NOTHING;
