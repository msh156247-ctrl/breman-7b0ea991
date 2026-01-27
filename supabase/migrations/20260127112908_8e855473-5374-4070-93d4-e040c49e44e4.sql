-- 프로필에 취미/흥미 필드 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hobbies text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';