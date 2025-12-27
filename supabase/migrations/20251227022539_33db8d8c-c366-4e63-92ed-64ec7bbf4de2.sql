-- Create team_messages table for team chat/bulletin board
CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view messages from their teams
CREATE POLICY "Team members can view team messages"
ON public.team_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_memberships.team_id = team_messages.team_id
    AND team_memberships.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_messages.team_id
    AND teams.leader_id = auth.uid()
  )
);

-- Policy: Team members can insert messages
CREATE POLICY "Team members can create team messages"
ON public.team_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_memberships.team_id = team_messages.team_id
      AND team_memberships.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_messages.team_id
      AND teams.leader_id = auth.uid()
    )
  )
);

-- Policy: Users can update their own messages
CREATE POLICY "Users can update their own team messages"
ON public.team_messages
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own messages, leaders can delete any
CREATE POLICY "Users can delete their own team messages"
ON public.team_messages
FOR DELETE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_messages.team_id
    AND teams.leader_id = auth.uid()
  )
);

-- Enable realtime for team messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;

-- Create trigger for updated_at
CREATE TRIGGER update_team_messages_updated_at
BEFORE UPDATE ON public.team_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();