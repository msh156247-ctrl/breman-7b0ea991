-- Update disputes policy to include team members from the contracted team
DROP POLICY IF EXISTS "Dispute parties can view" ON public.disputes;

CREATE POLICY "Dispute parties can view"
ON public.disputes
FOR SELECT
USING (
  -- User opened the dispute
  opened_by = auth.uid()
  OR
  -- User is the project client
  EXISTS (
    SELECT 1 FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = disputes.contract_id AND p.client_id = auth.uid()
  )
  OR
  -- User is the team leader of the contracted team
  EXISTS (
    SELECT 1 FROM contracts c
    JOIN teams t ON c.team_id = t.id
    WHERE c.id = disputes.contract_id AND t.leader_id = auth.uid()
  )
  OR
  -- User is a member of the contracted team
  EXISTS (
    SELECT 1 FROM contracts c
    JOIN team_memberships tm ON c.team_id = tm.team_id
    WHERE c.id = disputes.contract_id AND tm.user_id = auth.uid()
  )
);

-- Update contracts policy to include team members
DROP POLICY IF EXISTS "Contract parties can view" ON public.contracts;

CREATE POLICY "Contract parties can view"
ON public.contracts
FOR SELECT
USING (
  -- User is the project client
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = contracts.project_id AND projects.client_id = auth.uid()
  )
  OR
  -- User is the team leader
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = contracts.team_id AND teams.leader_id = auth.uid()
  )
  OR
  -- User is a team member of the contracted team
  EXISTS (
    SELECT 1 FROM team_memberships tm
    WHERE tm.team_id = contracts.team_id AND tm.user_id = auth.uid()
  )
);

-- Update milestones policy to include team members
DROP POLICY IF EXISTS "Milestone parties can view" ON public.milestones;

CREATE POLICY "Milestone parties can view"
ON public.milestones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = milestones.contract_id 
    AND (
      -- User is the project client
      p.client_id = auth.uid()
      OR
      -- User is the team leader
      c.team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid())
      OR
      -- User is a team member
      c.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    )
  )
);