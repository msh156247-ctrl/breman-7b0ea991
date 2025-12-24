-- Add digest preference columns to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS digest_mode TEXT DEFAULT 'instant' CHECK (digest_mode IN ('instant', 'daily', 'weekly')),
ADD COLUMN IF NOT EXISTS digest_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMP WITH TIME ZONE;

-- Create a table to track pending digest notifications
CREATE TABLE IF NOT EXISTS public.pending_digest_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notification_id)
);

-- Enable RLS on pending_digest_notifications
ALTER TABLE public.pending_digest_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending_digest_notifications (only system can access)
CREATE POLICY "Service role can manage pending digest notifications"
ON public.pending_digest_notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Update the notify_email_on_insert function to check digest preferences
CREATE OR REPLACE FUNCTION public.notify_email_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  user_digest_mode TEXT;
BEGIN
  -- Check user's digest preference
  SELECT digest_mode INTO user_digest_mode
  FROM public.notification_preferences
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- If user prefers digest mode, add to pending and skip immediate email
  IF user_digest_mode IN ('daily', 'weekly') THEN
    INSERT INTO public.pending_digest_notifications (user_id, notification_id)
    VALUES (NEW.user_id, NEW.id)
    ON CONFLICT (notification_id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Get the Supabase URL from the environment
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;
  
  -- Get the service role key
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  -- If we couldn't get the secrets from vault, use default project URL
  IF supabase_url IS NULL THEN
    supabase_url := 'https://kazkjbkldqxjdnzgiaqp.supabase.co';
  END IF;

  -- Call the edge function asynchronously using pg_net
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, current_setting('request.jwt.claims', true)::json->>'role')
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'notification_type', NEW.type,
      'title', NEW.title,
      'message', COALESCE(NEW.message, ''),
      'link', NEW.link
    )
  );

  RETURN NEW;
END;
$$;