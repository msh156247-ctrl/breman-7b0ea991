-- 1. team_role_slots에 선호 성향 컬럼 추가
ALTER TABLE public.team_role_slots 
ADD COLUMN IF NOT EXISTS preferred_animal_skin public.animal_skin DEFAULT NULL;

-- 2. projects에 선호 성향 배열 컬럼 추가
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS preferred_animal_skins public.animal_skin[] DEFAULT '{}';