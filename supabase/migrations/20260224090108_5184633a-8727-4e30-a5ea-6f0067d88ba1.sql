-- Allow team leaders to view skill experiences of users who applied to their teams
CREATE POLICY "Leaders can view applicant experiences"
ON public.skill_experiences
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM team_applications ta
    JOIN teams t ON ta.team_id = t.id
    WHERE ta.user_id = skill_experiences.user_id
    AND t.leader_id = auth.uid()
  )
);