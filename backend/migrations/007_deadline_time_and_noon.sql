-- ============================================================
-- Migration: 007_deadline_time_and_noon
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add exam_time column to academic_exams
--    Stores HH:MM (24h) time string, optional
alter table academic_exams
  add column if not exists exam_time text default null;

-- 2. Rename 'afternoon' → 'noon' in wellness_medications
update wellness_medications
  set time_of_day = 'noon'
  where time_of_day = 'afternoon';

-- 3. Rename 'afternoon' → 'noon' in wellness_medication_logs
--    (join to get the time_of_day from the parent medication)
--    No direct time_of_day column in logs, so nothing needed there.

-- Done. Safe to run multiple times (idempotent).
