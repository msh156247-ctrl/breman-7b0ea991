-- Fix infinite recursion in conversation_participants RLS policy
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
  -- User is a participant in this conversation
  user_id = auth.uid()
  OR 
  -- User's team is a participant
  team_id IN (
    SELECT tm.team_id FROM team_memberships tm WHERE tm.user_id = auth.uid()
    UNION
    SELECT t.id FROM teams t WHERE t.leader_id = auth.uid()
  )
  OR
  -- User is part of same conversation (via separate query to avoid recursion)
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);

-- Fix infinite recursion in conversations RLS policy  
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations 
FOR SELECT 
USING (
  -- User is a direct participant
  id IN (
    SELECT cp.conversation_id 
    FROM conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
  OR
  -- User's team is a participant
  id IN (
    SELECT cp.conversation_id 
    FROM conversation_participants cp 
    WHERE cp.team_id IN (
      SELECT tm.team_id FROM team_memberships tm WHERE tm.user_id = auth.uid()
      UNION
      SELECT t.id FROM teams t WHERE t.leader_id = auth.uid()
    )
  )
  OR
  -- Team conversation where user is a member
  team_id IN (
    SELECT tm.team_id FROM team_memberships tm WHERE tm.user_id = auth.uid()
    UNION
    SELECT t.id FROM teams t WHERE t.leader_id = auth.uid()
  )
);

-- Also fix the update policy for conversations
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

CREATE POLICY "Participants can update conversations" 
ON public.conversations 
FOR UPDATE 
USING (
  id IN (
    SELECT cp.conversation_id 
    FROM conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);