-- Fix the public_profiles view to use SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
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
FROM public.profiles;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Add RLS policies to user_skills table to restrict visibility
-- First check if table exists and has RLS enabled
ALTER TABLE IF EXISTS public.user_skills ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies if any
DROP POLICY IF EXISTS "User skills are viewable by everyone" ON public.user_skills;
DROP POLICY IF EXISTS "Users can view all user skills" ON public.user_skills;

-- Create new restrictive policies for user_skills
-- Users can view their own skills
CREATE POLICY "Users can view own skills"
ON public.user_skills
FOR SELECT
USING (auth.uid() = user_id);

-- Team members can view each other's skills
CREATE POLICY "Team members can view teammate skills"
ON public.user_skills
FOR SELECT
USING (
  user_id IN (
    SELECT tm.user_id FROM team_memberships tm
    WHERE tm.team_id IN (
      SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
      UNION
      SELECT id FROM teams WHERE leader_id = auth.uid()
    )
    UNION
    SELECT t.leader_id FROM teams t
    WHERE t.id IN (
      SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
    )
  )
);

-- Users can manage their own skills
DROP POLICY IF EXISTS "Users can insert own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users can update own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users can delete own skills" ON public.user_skills;

CREATE POLICY "Users can insert own skills"
ON public.user_skills
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
ON public.user_skills
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
ON public.user_skills
FOR DELETE
USING (auth.uid() = user_id);