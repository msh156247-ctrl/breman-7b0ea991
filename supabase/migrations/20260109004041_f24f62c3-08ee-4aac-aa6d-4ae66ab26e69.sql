-- 1. Create role_type enum
CREATE TYPE public.role_type AS ENUM (
  'backend', 'frontend', 'design', 'pm', 'data', 'qa', 'devops', 'marketing', 'mobile', 'security'
);

-- 2. Create animal_skin enum
CREATE TYPE public.animal_skin AS ENUM (
  'horse', 'dog', 'cat', 'rooster'
);

-- 3. Add new columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS animal_skin public.animal_skin DEFAULT 'horse',
ADD COLUMN IF NOT EXISTS main_role_type public.role_type DEFAULT 'backend',
ADD COLUMN IF NOT EXISTS sub_role_types public.role_type[] DEFAULT '{}';

-- 4. Add role_type column to team_role_slots (keep existing role for migration)
ALTER TABLE public.team_role_slots 
ADD COLUMN IF NOT EXISTS role_type public.role_type,
ADD COLUMN IF NOT EXISTS required_skill_levels jsonb DEFAULT '[]';

-- 5. Create skill_experiences table for XP tracking
CREATE TABLE IF NOT EXISTS public.skill_experiences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES public.skills(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  xp_earned integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on skill_experiences
ALTER TABLE public.skill_experiences ENABLE ROW LEVEL SECURITY;

-- RLS policies for skill_experiences
CREATE POLICY "Users can view own experiences" ON public.skill_experiences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own experiences" ON public.skill_experiences
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own experiences" ON public.skill_experiences
FOR DELETE USING (auth.uid() = user_id);

-- 6. Add role_type to team_applications
ALTER TABLE public.team_applications 
ADD COLUMN IF NOT EXISTS role_type public.role_type;

-- 7. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_skill_experiences_user_skill 
ON public.skill_experiences(user_id, skill_id);

CREATE INDEX IF NOT EXISTS idx_team_role_slots_role_type 
ON public.team_role_slots(role_type);