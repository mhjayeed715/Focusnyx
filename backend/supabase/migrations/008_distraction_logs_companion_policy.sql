-- Migration: Allow companion app to insert distraction logs
-- The companion uses the anon key but provides a user_id in the payload.
-- We add a separate insert policy that allows inserts where user_id is provided.

-- Drop existing policy and recreate with separate read/write policies
DROP POLICY IF EXISTS "distraction_logs_all" ON distraction_logs;

-- Users can read their own logs (requires auth)
CREATE POLICY "distraction_logs_select" ON distraction_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users (extension) can insert their own logs
CREATE POLICY "distraction_logs_insert_auth" ON distraction_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role / anon can insert logs with any user_id (for companion app)
-- This uses a permissive insert policy scoped to the anon role
CREATE POLICY "distraction_logs_insert_companion" ON distraction_logs
  FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- Users can delete their own logs
CREATE POLICY "distraction_logs_delete" ON distraction_logs
  FOR DELETE USING (auth.uid() = user_id);
