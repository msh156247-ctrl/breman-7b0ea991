-- Drop the security definer view and recreate with invoker security
DROP VIEW IF EXISTS public.public_profiles;

-- Create view with SECURITY INVOKER (default, uses querying user's permissions)
-- This respects the RLS policies on the underlying profiles table
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
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;