-- Create email_branding table for customizable email themes
CREATE TABLE public.email_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL DEFAULT 'Lovable App',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color TEXT NOT NULL DEFAULT '#8b5cf6',
  accent_color TEXT NOT NULL DEFAULT '#f59e0b',
  text_color TEXT NOT NULL DEFAULT '#1f2937',
  background_color TEXT NOT NULL DEFAULT '#f5f5f5',
  footer_text TEXT DEFAULT '이 이메일은 알림 설정에 따라 발송되었습니다.',
  support_email TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_branding ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read branding (needed by edge functions)
CREATE POLICY "Email branding is publicly readable"
ON public.email_branding
FOR SELECT
USING (true);

-- Only admins can modify branding
CREATE POLICY "Admins can manage email branding"
ON public.email_branding
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_email_branding_updated_at
BEFORE UPDATE ON public.email_branding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default branding
INSERT INTO public.email_branding (brand_name) VALUES ('Lovable App');