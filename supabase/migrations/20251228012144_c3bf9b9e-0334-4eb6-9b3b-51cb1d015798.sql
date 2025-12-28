-- Add reply_to_id column to team_messages for reply/mention functionality
ALTER TABLE public.team_messages
ADD COLUMN reply_to_id uuid REFERENCES public.team_messages(id) ON DELETE SET NULL;