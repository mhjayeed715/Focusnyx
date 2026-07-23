-- Run this in Supabase SQL Editor to fix existing academic_courses table
-- Only needed if you already ran the previous schema.sql

-- Change credits from int to numeric to support decimal credits (e.g. 1.5)
ALTER TABLE academic_courses ALTER COLUMN credits TYPE numeric(4,1);

-- Drop old constraint if it exists and re-add without upper cap
ALTER TABLE academic_courses DROP CONSTRAINT IF EXISTS academic_courses_credits_check;
ALTER TABLE academic_courses ADD CONSTRAINT academic_courses_credits_check CHECK (credits >= 0.5);
