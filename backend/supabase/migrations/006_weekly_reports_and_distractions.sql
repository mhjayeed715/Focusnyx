-- Migration 006: Weekly Reports and Distraction Logs Enhancements

-- ─── Weekly AI Reports Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  raw_data JSONB,
  ai_report TEXT,
  highlights JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own reports" ON weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_all" ON weekly_reports;

CREATE POLICY "weekly_reports_all" ON weekly_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_week ON weekly_reports(user_id, week_start);

-- ─── Distraction Logs Enhancements ─────────────────────────────
ALTER TABLE distraction_logs ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE distraction_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE distraction_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_distraction_user_time ON distraction_logs(user_id, timestamp);
