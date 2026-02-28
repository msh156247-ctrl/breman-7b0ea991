
-- 기존 점수 컬럼은 유지하되 기본값 0으로 변경 (하위 호환)
ALTER TABLE public.member_evaluations
  ALTER COLUMN contribution_score SET DEFAULT 0,
  ALTER COLUMN quality_score SET DEFAULT 0,
  ALTER COLUMN punctuality_score SET DEFAULT 0;

-- 새 평가 항목 추가
ALTER TABLE public.member_evaluations
  ADD COLUMN skill_ratings jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN task_ratings jsonb DEFAULT '[]'::jsonb;

-- overall_score 계산 트리거 업데이트: skill_ratings와 task_ratings의 평균으로 계산
CREATE OR REPLACE FUNCTION public.calculate_evaluation_overall_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  skill_avg numeric := 0;
  task_avg numeric := 0;
  skill_count integer := 0;
  task_count integer := 0;
  total_avg numeric := 0;
BEGIN
  -- skill_ratings에서 평균 계산
  SELECT COALESCE(AVG((item->>'score')::numeric), 0), COUNT(*)
  INTO skill_avg, skill_count
  FROM jsonb_array_elements(COALESCE(NEW.skill_ratings, '[]'::jsonb)) AS item
  WHERE (item->>'score') IS NOT NULL;

  -- task_ratings에서 평균 계산  
  SELECT COALESCE(AVG((item->>'score')::numeric), 0), COUNT(*)
  INTO task_avg, task_count
  FROM jsonb_array_elements(COALESCE(NEW.task_ratings, '[]'::jsonb)) AS item
  WHERE (item->>'score') IS NOT NULL;

  -- 전체 평균 계산
  IF skill_count + task_count > 0 THEN
    total_avg := (skill_avg * skill_count + task_avg * task_count) / (skill_count + task_count);
  ELSE
    -- 레거시: 기존 점수가 있으면 그것으로 계산
    IF NEW.contribution_score > 0 OR NEW.quality_score > 0 OR NEW.punctuality_score > 0 THEN
      total_avg := (NEW.contribution_score + NEW.quality_score + NEW.punctuality_score)::numeric / 3;
    END IF;
  END IF;

  NEW.overall_score := ROUND(total_avg, 2);
  RETURN NEW;
END;
$$;

-- 기존 트리거 교체
DROP TRIGGER IF EXISTS calculate_overall_score_trigger ON public.member_evaluations;
CREATE TRIGGER calculate_overall_score_trigger
  BEFORE INSERT OR UPDATE ON public.member_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_evaluation_overall_score();

COMMENT ON COLUMN public.member_evaluations.skill_ratings IS '기술별 평가: [{"skill_name": "React", "score": 4, "comment": "..."}, ...]';
COMMENT ON COLUMN public.member_evaluations.task_ratings IS '작업 단위 평가: [{"task_name": "API 설계", "score": 4, "comment": "..."}, ...]';
