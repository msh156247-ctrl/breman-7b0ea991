-- Drop the existing public access policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policy that restricts profile viewing to authenticated users
CREATE POLICY "Profiles viewable by authenticated users only"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);