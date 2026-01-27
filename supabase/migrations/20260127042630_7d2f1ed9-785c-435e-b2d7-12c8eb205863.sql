-- Add foreign key relationship between team_service_offers and teams
ALTER TABLE public.team_service_offers
ADD CONSTRAINT team_service_offers_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;