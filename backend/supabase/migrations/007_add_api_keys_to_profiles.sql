-- Add API Key columns to profiles table for persistent database storage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS groq_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'groq';

-- Grant update permissions on profiles to authenticated users
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
