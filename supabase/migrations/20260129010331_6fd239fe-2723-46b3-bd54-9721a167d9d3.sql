-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their read status" ON public.conversation_participants;

-- Create a security definer function to check conversation access without recursion
CREATE OR REPLACE FUNCTION public.user_has_conversation_access(conv_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conv_id 
    AND cp.user_id = check_user_id
  )
  OR EXISTS (
    SELECT 1 FROM conversation_participants cp
    INNER JOIN team_memberships tm ON cp.team_id = tm.team_id
    WHERE cp.conversation_id = conv_id AND tm.user_id = check_user_id
  )
  OR EXISTS (
    SELECT 1 FROM conversation_participants cp
    INNER JOIN teams t ON cp.team_id = t.id
    WHERE cp.conversation_id = conv_id AND t.leader_id = check_user_id
  )
  OR EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN team_memberships tm ON c.team_id = tm.team_id
    WHERE c.id = conv_id AND tm.user_id = check_user_id
  )
  OR EXISTS (
    SELECT 1 FROM conversations c
    INNER JOIN teams t ON c.team_id = t.id
    WHERE c.id = conv_id AND t.leader_id = check_user_id
  )
$$;

-- Simpler SELECT policy using the security definer function
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (public.user_has_conversation_access(conversation_id, auth.uid()));

-- INSERT policy - authenticated users can add participants to conversations they can access
CREATE POLICY "Users can add participants to accessible conversations"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid()  -- Adding themselves
    OR public.user_has_conversation_access(conversation_id, auth.uid())  -- Or they have access
  )
);

-- UPDATE policy for read status
CREATE POLICY "Users can update their own participation"
ON public.conversation_participants
FOR UPDATE
USING (user_id = auth.uid());

-- DELETE policy if needed
CREATE POLICY "Users can leave conversations"
ON public.conversation_participants
FOR DELETE
USING (user_id = auth.uid());