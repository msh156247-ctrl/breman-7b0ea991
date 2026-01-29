-- Create chat_events table for conversation schedules
CREATE TABLE public.chat_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_events ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view events in conversations they participate in
CREATE POLICY "Users can view events in their conversations" 
ON public.chat_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = chat_events.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Create policy: Users can create events in conversations they participate in
CREATE POLICY "Users can create events in their conversations" 
ON public.chat_events 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = chat_events.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Create policy: Users can update their own events
CREATE POLICY "Users can update their own events" 
ON public.chat_events 
FOR UPDATE 
USING (created_by = auth.uid());

-- Create policy: Users can delete their own events
CREATE POLICY "Users can delete their own events" 
ON public.chat_events 
FOR DELETE 
USING (created_by = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_chat_events_conversation ON public.chat_events(conversation_id);
CREATE INDEX idx_chat_events_date ON public.chat_events(event_date);