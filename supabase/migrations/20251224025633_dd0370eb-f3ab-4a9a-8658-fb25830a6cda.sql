-- Enable realtime for activity_logs table
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;