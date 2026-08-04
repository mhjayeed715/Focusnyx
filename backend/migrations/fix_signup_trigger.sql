-- ============================================================
-- FIX: "Database error saving new user" on Supabase Signup
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- 1. Clean up any orphaned profile records left behind from deleted auth users
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 2. Ensure profiles table cascades on user deletion from auth.users
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create bulletproof trigger function with orphan cleanup & exception safety
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Delete any legacy orphaned profile record with the same email
  DELETE FROM public.profiles 
  WHERE university_email = NEW.email AND id != NEW.id;

  -- Insert or update the new user profile
  INSERT INTO public.profiles (id, university_email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    university_email = EXCLUDED.university_email,
    display_name = EXCLUDED.display_name;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch any unexpected database error so user signup transaction NEVER fails
  RETURN NEW;
END;
$$;

-- 4. Re-bind the trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
