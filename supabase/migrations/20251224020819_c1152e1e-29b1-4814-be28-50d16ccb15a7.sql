-- Add digest_day column to notification_preferences table (0 = Sunday, 1 = Monday, ... 6 = Saturday)
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS digest_day INTEGER DEFAULT 1 CHECK (digest_day >= 0 AND digest_day <= 6);