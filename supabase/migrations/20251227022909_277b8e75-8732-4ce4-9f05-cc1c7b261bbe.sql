-- Create storage bucket for team message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-attachments', 'team-attachments', true);

-- Add attachments column to team_messages
ALTER TABLE public.team_messages
ADD COLUMN attachments TEXT[] DEFAULT '{}';

-- Storage policies for team-attachments bucket
-- Allow authenticated users to upload files
CREATE POLICY "Team members can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-attachments' AND
  EXISTS (
    SELECT 1 FROM public.team_memberships tm
    WHERE tm.user_id = auth.uid()
    AND tm.team_id::text = (storage.foldername(name))[1]
  )
);

-- Allow anyone to view attachments (public bucket)
CREATE POLICY "Anyone can view team attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'team-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-attachments' AND
  auth.uid()::text = (storage.foldername(name))[2]
);