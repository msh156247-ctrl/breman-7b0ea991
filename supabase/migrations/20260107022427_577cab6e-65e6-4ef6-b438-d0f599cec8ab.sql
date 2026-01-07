-- Allow clients to manage milestones for their contracts
CREATE POLICY "Clients can insert milestones for their contracts"
ON public.milestones
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = milestones.contract_id
    AND p.client_id = auth.uid()
  )
);

CREATE POLICY "Clients can update milestones for their contracts"
ON public.milestones
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = milestones.contract_id
    AND p.client_id = auth.uid()
  )
);

CREATE POLICY "Clients can delete milestones for their contracts"
ON public.milestones
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = milestones.contract_id
    AND p.client_id = auth.uid()
  )
);

-- Also allow team leaders to update milestone status
CREATE POLICY "Team leaders can update milestones for their contracts"
ON public.milestones
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM contracts c
    JOIN teams t ON c.team_id = t.id
    WHERE c.id = milestones.contract_id
    AND t.leader_id = auth.uid()
  )
);