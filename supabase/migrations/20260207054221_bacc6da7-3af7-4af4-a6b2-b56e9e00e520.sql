-- Make chat-attachments bucket public so images can be displayed
UPDATE storage.buckets SET public = true WHERE id = 'chat-attachments';

-- Add a simple public SELECT policy for chat-attachments
CREATE POLICY "Chat attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');