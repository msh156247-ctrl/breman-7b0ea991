-- Add max_count column to team_role_slots for recruiting multiple people per slot
ALTER TABLE public.team_role_slots 
ADD COLUMN max_count integer NOT NULL DEFAULT 1;

-- Add current_count column to track how many people are already in this slot
ALTER TABLE public.team_role_slots 
ADD COLUMN current_count integer NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.team_role_slots.max_count IS 'Maximum number of people to recruit for this position';
COMMENT ON COLUMN public.team_role_slots.current_count IS 'Current number of filled positions';