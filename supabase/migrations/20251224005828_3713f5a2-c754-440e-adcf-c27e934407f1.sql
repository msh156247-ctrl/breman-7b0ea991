-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to call the send-notification-email edge function
CREATE OR REPLACE FUNCTION public.notify_email_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
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

-- Create the trigger on the notifications table
DROP TRIGGER IF EXISTS on_notification_insert_send_email ON public.notifications;

CREATE TRIGGER on_notification_insert_send_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_email_on_insert();