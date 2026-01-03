-- Drop the authenticated-only policy (still too permissive)
DROP POLICY IF EXISTS "Profiles viewable by authenticated users only" ON public.profiles;

-- Create strict policy: users can only view their own profile
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);