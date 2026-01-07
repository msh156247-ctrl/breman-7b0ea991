-- Allow clients to update proposals for their projects (accept/reject)
CREATE POLICY "Clients can update proposals for their projects"
ON public.project_proposals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_proposals.project_id
    AND projects.client_id = auth.uid()
  )
);

-- Allow clients to create contracts for their projects
CREATE POLICY "Clients can create contracts for their projects"
ON public.contracts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = contracts.project_id
    AND projects.client_id = auth.uid()
  )
);