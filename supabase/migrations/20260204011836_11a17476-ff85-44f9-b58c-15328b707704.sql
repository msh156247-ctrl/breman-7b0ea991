-- ============================================
-- FIX: Allow team leaders to view applicant profiles
-- Leaders need to see profiles of people who applied to their team
-- ============================================

-- Add policy for team leaders to view applicant profiles
CREATE POLICY "Leaders can view applicant profiles"
ON public.profiles FOR SELECT
USING (
  id IN (
    SELECT ta.user_id
    FROM public.team_applications ta
    JOIN public.teams t ON t.id = ta.team_id
    WHERE t.leader_id = auth.uid()
  )
);