
-- Add is_cc flag to direct_messages for CC recipients
ALTER TABLE public.direct_messages ADD COLUMN is_cc boolean NOT NULL DEFAULT false;

-- Add group_id to link messages sent together (same message to multiple recipients)
ALTER TABLE public.direct_messages ADD COLUMN group_id uuid DEFAULT NULL;
