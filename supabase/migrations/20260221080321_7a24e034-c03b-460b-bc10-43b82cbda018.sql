
-- Allow users to withdraw their own applications (update status to 'withdrawn')
CREATE POLICY "Users can withdraw own applications"
ON public.team_applications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status = 'withdrawn');
