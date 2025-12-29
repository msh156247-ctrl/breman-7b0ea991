
-- Create conversation type enum
CREATE TYPE conversation_type AS ENUM ('direct', 'team', 'team_to_team');

-- Conversations table (chat rooms)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type conversation_type NOT NULL,
  name TEXT, -- for team_to_team chats
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE, -- for team chats
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversation participants
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT participant_check CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR 
    (user_id IS NULL AND team_id IS NOT NULL)
  )
);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- for team_to_team
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  attachments TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_conversations_type ON public.conversations(type);
CREATE INDEX idx_conversations_team_id ON public.conversations(team_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_participants_team ON public.conversation_participants(team_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id 
    AND (cp.user_id = auth.uid() OR cp.team_id IN (
      SELECT tm.team_id FROM public.team_memberships tm WHERE tm.user_id = auth.uid()
      UNION
      SELECT t.id FROM public.teams t WHERE t.leader_id = auth.uid()
    ))
  )
  OR team_id IN (
    SELECT tm.team_id FROM public.team_memberships tm WHERE tm.user_id = auth.uid()
    UNION
    SELECT t.id FROM public.teams t WHERE t.leader_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  )
);

-- RLS Policies for participants
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_id 
    AND (cp2.user_id = auth.uid() OR cp2.team_id IN (
      SELECT tm.team_id FROM public.team_memberships tm WHERE tm.user_id = auth.uid()
      UNION
      SELECT t.id FROM public.teams t WHERE t.leader_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id 
    AND (cp.user_id = auth.uid() OR cp.team_id IN (
      SELECT tm.team_id FROM public.team_memberships tm WHERE tm.user_id = auth.uid()
      UNION
      SELECT t.id FROM public.teams t WHERE t.leader_id = auth.uid()
    ))
  )
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.team_id IN (
      SELECT tm.team_id FROM public.team_memberships tm WHERE tm.user_id = auth.uid()
      UNION
      SELECT t.id FROM public.teams t WHERE t.leader_id = auth.uid()
    )
  )
);

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id 
      AND (cp.user_id = auth.uid() OR cp.team_id IN (
        SELECT tm.team_id FROM public.team_memberships tm WHERE tm.user_id = auth.uid()
        UNION
        SELECT t.id FROM public.teams t WHERE t.leader_id = auth.uid()
      ))
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND c.team_id IN (
        SELECT tm.team_id FROM public.team_memberships tm WHERE tm.user_id = auth.uid()
        UNION
        SELECT t.id FROM public.teams t WHERE t.leader_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

-- Update trigger for conversations
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for messages
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_conversation_last_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
