-- Fix 1: milestone_submissions RLS policy - restrict to contract parties only
DROP POLICY IF EXISTS "Submissions viewable by parties" ON public.milestone_submissions;

CREATE POLICY "Submissions viewable by contract parties" 
ON public.milestone_submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM milestones m
    JOIN contracts c ON m.contract_id = c.id
    JOIN projects p ON c.project_id = p.id
    WHERE m.id = milestone_submissions.milestone_id 
    AND (
      p.client_id = auth.uid() OR 
      c.team_id IN (
        SELECT id FROM teams WHERE leader_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM team_memberships tm
        WHERE tm.team_id = c.team_id AND tm.user_id = auth.uid()
      ) OR
      auth.uid() = milestone_submissions.submitted_by
    )
  )
);

-- Fix 2: Team attachments - make bucket private and update policies
UPDATE storage.buckets 
SET public = false 
WHERE id = 'team-attachments';

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Anyone can view team attachments" ON storage.objects;

-- Create secure policy for team members only
CREATE POLICY "Team members can view team attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'team-attachments' AND
  (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_id::text = (storage.foldername(name))[1]
    ) OR
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.leader_id = auth.uid()
      AND t.id::text = (storage.foldername(name))[1]
    )
  )
);