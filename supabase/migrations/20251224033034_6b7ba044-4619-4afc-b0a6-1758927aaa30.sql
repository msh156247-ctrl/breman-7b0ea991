-- Create report schedule settings table
CREATE TABLE public.report_schedule_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  delivery_hour INTEGER NOT NULL DEFAULT 9 CHECK (delivery_hour >= 0 AND delivery_hour <= 23),
  delivery_minute INTEGER NOT NULL DEFAULT 0 CHECK (delivery_minute >= 0 AND delivery_minute <= 59),
  weekly_day INTEGER DEFAULT 1 CHECK (weekly_day >= 0 AND weekly_day <= 6),
  monthly_day INTEGER DEFAULT 1 CHECK (monthly_day >= 1 AND monthly_day <= 28),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_schedule_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify report settings
CREATE POLICY "Admins can view report settings"
ON public.report_schedule_settings
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert report settings"
ON public.report_schedule_settings
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update report settings"
ON public.report_schedule_settings
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_report_schedule_settings_updated_at
BEFORE UPDATE ON public.report_schedule_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.report_schedule_settings (frequency, delivery_hour, delivery_minute, weekly_day, monthly_day, is_enabled)
VALUES ('daily', 9, 0, 1, 1, true);