-- Create team service offers table
CREATE TABLE public.team_service_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  service_category TEXT NOT NULL DEFAULT 'general',
  budget_min INTEGER,
  budget_max INTEGER,
  timeline_weeks INTEGER,
  offered_skills TEXT[] DEFAULT '{}',
  offered_roles role_type[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_service_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Active offers are viewable by everyone"
ON public.team_service_offers
FOR SELECT
USING (status = 'active' OR EXISTS (
  SELECT 1 FROM teams WHERE teams.id = team_service_offers.team_id AND teams.leader_id = auth.uid()
));

CREATE POLICY "Team leaders can manage their offers"
ON public.team_service_offers
FOR ALL
USING (EXISTS (
  SELECT 1 FROM teams WHERE teams.id = team_service_offers.team_id AND teams.leader_id = auth.uid()
));

-- Create service inquiries table (clients asking about offers)
CREATE TABLE public.service_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.team_service_offers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  message TEXT NOT NULL,
  budget_proposal INTEGER,
  timeline_proposal INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inquiries
CREATE POLICY "Clients can create inquiries"
ON public.service_inquiries
FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can view own inquiries"
ON public.service_inquiries
FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Team leaders can view and manage inquiries for their offers"
ON public.service_inquiries
FOR ALL
USING (EXISTS (
  SELECT 1 FROM team_service_offers o
  JOIN teams t ON o.team_id = t.id
  WHERE o.id = service_inquiries.offer_id AND t.leader_id = auth.uid()
));

-- Add updated_at trigger
CREATE TRIGGER update_team_service_offers_updated_at
BEFORE UPDATE ON public.team_service_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_inquiries_updated_at
BEFORE UPDATE ON public.service_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();