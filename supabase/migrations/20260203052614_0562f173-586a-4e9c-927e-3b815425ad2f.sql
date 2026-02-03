-- ============================================
-- SECURITY FIX: Chat Attachments Storage Bucket
-- Make chat-attachments bucket private and require authentication
-- ============================================

-- 1. Set bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-attachments';

-- 2. Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;

-- 3. Create restricted SELECT policy - only conversation participants can view
CREATE POLICY "Conversation participants can view chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  EXISTS (
    SELECT 1 
    FROM public.conversation_participants cp
    JOIN public.messages m ON m.conversation_id = cp.conversation_id
    WHERE cp.user_id = auth.uid()
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
);

-- Also allow viewing attachments of messages in conversations user participates in
CREATE POLICY "Users can view attachments in their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  EXISTS (
    SELECT 1 
    FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
  )
);

-- ============================================
-- SECURITY FIX: Tracks Table - Restrict visibility
-- User career development plans should be private by default
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Tracks are viewable by everyone" ON public.tracks;

-- Create a more restrictive policy - only owner or team members can view tracks
CREATE POLICY "Tracks are viewable by owner only"
ON public.tracks FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.team_memberships tm
    WHERE tm.user_id = tracks.user_id
    AND tm.team_id IN (
      SELECT tm2.team_id FROM public.team_memberships tm2
      WHERE tm2.user_id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.leader_id = tracks.user_id
    AND t.id IN (
      SELECT tm.team_id FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
    )
  )
);