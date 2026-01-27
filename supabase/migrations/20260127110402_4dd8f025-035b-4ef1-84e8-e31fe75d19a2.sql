-- 1. 스킬 타입 enum 추가
CREATE TYPE public.skill_type AS ENUM ('language', 'framework', 'tool', 'library', 'methodology');

-- 2. skills 테이블에 type 컬럼 추가
ALTER TABLE public.skills
ADD COLUMN type public.skill_type DEFAULT 'tool';

-- 3. user_skills 테이블 변경 - 자기 평가 레벨 제거, 검증 시스템 추가
ALTER TABLE public.user_skills
ADD COLUMN is_verified boolean DEFAULT false,
ADD COLUMN verified_by uuid REFERENCES public.profiles(id),
ADD COLUMN verified_at timestamp with time zone,
ADD COLUMN verification_note text,
ADD COLUMN years_of_experience integer DEFAULT 0;

-- 4. 팀 지원 시 스킬 검증 기록 테이블
CREATE TABLE public.skill_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_skill_id uuid REFERENCES public.user_skills(id) ON DELETE CASCADE NOT NULL,
  verifier_id uuid REFERENCES public.profiles(id) NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  verified_level integer CHECK (verified_level >= 1 AND verified_level <= 10),
  note text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. RLS for skill_verifications
ALTER TABLE public.skill_verifications ENABLE ROW LEVEL SECURITY;

-- 팀 리더만 검증 가능
CREATE POLICY "Team leaders can create verifications"
ON public.skill_verifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = skill_verifications.team_id 
    AND leader_id = auth.uid()
  )
);

-- 검증 기록은 본인과 팀 리더가 볼 수 있음
CREATE POLICY "Users can view their verifications"
ON public.skill_verifications
FOR SELECT
USING (
  verifier_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_skills us 
    WHERE us.id = skill_verifications.user_skill_id 
    AND us.user_id = auth.uid()
  )
);

-- 6. user_skills 에서 level 컬럼의 역할 변경 (자기 설정 → 검증된 평균)
-- 기존 level은 유지하되, 검증된 레벨의 평균으로 자동 계산되도록 트리거 추가

-- 검증 시 평균 레벨 업데이트 함수
CREATE OR REPLACE FUNCTION public.update_skill_verified_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_level numeric;
  skill_user_id uuid;
BEGIN
  -- 해당 user_skill의 user_id 가져오기
  SELECT user_id INTO skill_user_id
  FROM public.user_skills
  WHERE id = COALESCE(NEW.user_skill_id, OLD.user_skill_id);

  -- 평균 검증 레벨 계산
  SELECT COALESCE(AVG(verified_level), 0) INTO avg_level
  FROM public.skill_verifications
  WHERE user_skill_id = COALESCE(NEW.user_skill_id, OLD.user_skill_id);

  -- user_skills 업데이트
  UPDATE public.user_skills
  SET 
    level = ROUND(avg_level),
    is_verified = (avg_level > 0),
    verified_at = CASE WHEN avg_level > 0 THEN now() ELSE NULL END
  WHERE id = COALESCE(NEW.user_skill_id, OLD.user_skill_id);

  -- 사용자 레벨 재계산
  IF skill_user_id IS NOT NULL THEN
    PERFORM public.calculate_user_level(skill_user_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 검증 추가/수정/삭제 시 트리거
CREATE TRIGGER on_skill_verification_change
AFTER INSERT OR UPDATE OR DELETE ON public.skill_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_skill_verified_level();

-- 7. 기존 스킬들에 타입 분류 업데이트 (예시)
UPDATE public.skills SET type = 'language' WHERE name IN ('JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin');
UPDATE public.skills SET type = 'framework' WHERE name IN ('React', 'Vue', 'Angular', 'Next.js', 'Svelte', 'Django', 'FastAPI', 'Spring', 'Express', 'NestJS', 'Rails', 'Laravel');
UPDATE public.skills SET type = 'tool' WHERE name IN ('Docker', 'Kubernetes', 'Git', 'Jenkins', 'Terraform', 'AWS', 'GCP', 'Azure', 'Figma', 'Sketch');
UPDATE public.skills SET type = 'library' WHERE name IN ('Redux', 'TanStack Query', 'Tailwind', 'Bootstrap', 'Material UI', 'Prisma', 'TypeORM');