-- Update profiles RLS to allow team members to view each other
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;

-- Policy 1: Users can always see their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Users can see profiles of people in their teams (teammates + team leaders)
CREATE POLICY "Team members can view teammate profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    -- Get all user_ids from teams where the current user is a member
    SELECT tm.user_id FROM team_memberships tm
    WHERE tm.team_id IN (
      SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
      UNION
      SELECT id FROM teams WHERE leader_id = auth.uid()
    )
    UNION
    -- Get team leaders of teams where current user is a member
    SELECT t.leader_id FROM teams t
    WHERE t.id IN (
      SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
    )
    UNION
    -- Get members of teams where current user is leader
    SELECT tm.user_id FROM team_memberships tm
    WHERE tm.team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid())
  )
);

-- Create a secure view that excludes email for public profile viewing
CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_barrier = true) AS
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

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;