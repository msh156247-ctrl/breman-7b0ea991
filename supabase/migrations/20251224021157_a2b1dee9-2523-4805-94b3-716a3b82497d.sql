-- Add timezone column to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Seoul';