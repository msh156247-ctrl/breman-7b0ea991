
-- Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Drop the overly permissive public access policy
DROP POLICY IF EXISTS "Chat attachments are publicly accessible" ON storage.objects;

-- Add authenticated-only access policy for reading
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');
