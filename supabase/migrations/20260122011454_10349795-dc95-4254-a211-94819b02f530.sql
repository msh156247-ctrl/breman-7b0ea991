-- Fix overly permissive RLS on pending_digest_notifications
-- This table should only be accessed by database triggers and service role
DROP POLICY IF EXISTS "Service role can manage pending digest notifications" ON public.pending_digest_notifications;

-- Create restrictive policy - regular users cannot access this table
-- The notify_email_on_insert trigger (SECURITY DEFINER) and edge functions with service role key can still access
CREATE POLICY "Only system can manage pending digest notifications"
ON public.pending_digest_notifications
FOR ALL
USING (false)
WITH CHECK (false);

-- Ensure activity_logs has proper INSERT restriction
-- First drop if exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_logs;

-- Re-create INSERT policy for activity_logs  
CREATE POLICY "Admins can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Create a public_profiles view that excludes email for privacy
-- First drop if it's a table (from older migration) or view
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  name,
  avatar_url,
  bio,
  level,
  xp,
  rating_avg,
  user_type,
  primary_role,
  verified,
  created_at,
  updated_at
  -- Explicitly exclude: email, animal_skin, main_role_type, sub_role_types
FROM public.profiles;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Add write protection to skills table (only admins can modify)
DROP POLICY IF EXISTS "Admins can manage skills" ON public.skills;

CREATE POLICY "Admins can manage skills"
ON public.skills
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));