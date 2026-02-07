
-- Create direct_messages table for 쪽지 feature
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sender_deleted BOOLEAN NOT NULL DEFAULT false,
  recipient_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received (unless deleted)
CREATE POLICY "Users can view their own messages"
ON public.direct_messages FOR SELECT
USING (
  (auth.uid() = sender_id AND sender_deleted = false)
  OR (auth.uid() = recipient_id AND recipient_deleted = false)
);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.direct_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (for read status) or soft-delete their own
CREATE POLICY "Users can update their messages"
ON public.direct_messages FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Create indexes for performance
CREATE INDEX idx_direct_messages_recipient ON public.direct_messages(recipient_id, created_at DESC);
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id, created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
