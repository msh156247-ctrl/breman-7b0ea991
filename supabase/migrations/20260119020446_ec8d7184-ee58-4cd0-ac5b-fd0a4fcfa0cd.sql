-- Add deadline column for proposal submission deadline
ALTER TABLE public.projects 
ADD COLUMN deadline TIMESTAMP WITH TIME ZONE NULL;