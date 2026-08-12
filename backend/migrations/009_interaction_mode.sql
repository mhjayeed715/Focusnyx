-- Add interaction_mode column to profiles table for ADHD / Standard mode preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interaction_mode TEXT DEFAULT 'adhd' CHECK (interaction_mode IN ('adhd', 'standard'));

-- For existing rows prior to migration, set to 'standard' explicitly
UPDATE profiles SET interaction_mode = 'standard' WHERE interaction_mode IS NULL;
