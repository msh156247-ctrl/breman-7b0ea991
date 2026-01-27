-- Add columns for level calculation scores
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS skill_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS experience_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS calculated_level_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS portfolio_bonus numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS project_bonus numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS team_rating_bonus numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.skill_score IS '기술 숙련도 점수 (0-100)';
COMMENT ON COLUMN public.profiles.experience_score IS '경험 점수 (0-100)';
COMMENT ON COLUMN public.profiles.calculated_level_score IS '최종 계산 점수 (기술 60% + 경험 40%)';
COMMENT ON COLUMN public.profiles.portfolio_bonus IS '포트폴리오 기반 보정 점수';
COMMENT ON COLUMN public.profiles.project_bonus IS '프로젝트 기록 기반 보정 점수';
COMMENT ON COLUMN public.profiles.team_rating_bonus IS '팀 평가 기반 보정 점수';

-- Create function to calculate user level
CREATE OR REPLACE FUNCTION public.calculate_user_level(user_id_input uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  skill_avg numeric := 0;
  experience_pts numeric := 0;
  portfolio_pts numeric := 0;
  project_pts numeric := 0;
  team_rating_pts numeric := 0;
  final_score numeric := 0;
  final_level integer := 1;
  skill_count integer := 0;
  project_count integer := 0;
  showcase_count integer := 0;
  avg_rating numeric := 0;
  total_xp integer := 0;
BEGIN
  -- 1. Calculate skill score (average of all user skills XP, normalized to 0-100)
  SELECT 
    COUNT(*),
    COALESCE(SUM(us.xp), 0)
  INTO skill_count, total_xp
  FROM user_skills us
  WHERE us.user_id = user_id_input;

  IF skill_count > 0 THEN
    -- Normalize XP to 0-100 (assuming max XP per skill is ~1000)
    skill_avg := LEAST(100, (total_xp::numeric / skill_count) / 10);
  END IF;

  -- 2. Calculate experience score based on:
  -- - Project participation (completed contracts)
  -- - Showcases created
  SELECT COUNT(*) INTO project_count
  FROM contracts c
  JOIN teams t ON c.team_id = t.id
  JOIN team_memberships tm ON tm.team_id = t.id
  WHERE tm.user_id = user_id_input AND c.status = 'completed';
  
  -- Also count projects where user is team leader
  SELECT project_count + COUNT(*) INTO project_count
  FROM contracts c
  JOIN teams t ON c.team_id = t.id
  WHERE t.leader_id = user_id_input AND c.status = 'completed';

  SELECT COUNT(*) INTO showcase_count
  FROM showcases s
  WHERE s.owner_user_id = user_id_input AND s.status = 'published';

  -- Also count showcases where user is contributor
  SELECT showcase_count + COUNT(*) INTO showcase_count
  FROM showcase_contributors sc
  WHERE sc.user_id = user_id_input AND sc.is_verified = true;

  -- Experience score: projects (max 50) + showcases (max 50)
  experience_pts := LEAST(50, project_count * 10) + LEAST(50, showcase_count * 5);

  -- 3. Portfolio bonus (showcases with good view counts)
  SELECT COALESCE(AVG(LEAST(10, s.view_count / 10)), 0) INTO portfolio_pts
  FROM showcases s
  WHERE s.owner_user_id = user_id_input AND s.status = 'published';

  -- 4. Project bonus (completed projects)
  project_pts := LEAST(10, project_count * 2);

  -- 5. Team rating bonus
  SELECT COALESCE(AVG(r.rating), 0) INTO avg_rating
  FROM reviews r
  WHERE r.to_user_id = user_id_input;
  
  team_rating_pts := avg_rating * 2; -- Max 10 points (5 stars * 2)

  -- Calculate final score: skill 60% + experience 40% + bonuses
  final_score := (skill_avg * 0.6) + (experience_pts * 0.4) + portfolio_pts + project_pts + team_rating_pts;
  
  -- Normalize to 0-100
  final_score := LEAST(100, final_score);

  -- Convert to level (1-5)
  final_level := CASE
    WHEN final_score >= 80 THEN 5
    WHEN final_score >= 60 THEN 4
    WHEN final_score >= 40 THEN 3
    WHEN final_score >= 20 THEN 2
    ELSE 1
  END;

  -- Update profile with calculated scores
  UPDATE public.profiles
  SET 
    skill_score = skill_avg,
    experience_score = experience_pts,
    calculated_level_score = final_score,
    portfolio_bonus = portfolio_pts,
    project_bonus = project_pts,
    team_rating_bonus = team_rating_pts,
    level = final_level
  WHERE id = user_id_input;

  RETURN jsonb_build_object(
    'skill_score', skill_avg,
    'experience_score', experience_pts,
    'calculated_level_score', final_score,
    'portfolio_bonus', portfolio_pts,
    'project_bonus', project_pts,
    'team_rating_bonus', team_rating_pts,
    'level', final_level
  );
END;
$$;

-- Create trigger to recalculate level when related data changes
CREATE OR REPLACE FUNCTION public.trigger_recalculate_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Determine user_id based on the table
  IF TG_TABLE_NAME = 'user_skills' THEN
    PERFORM public.calculate_user_level(COALESCE(NEW.user_id, OLD.user_id));
  ELSIF TG_TABLE_NAME = 'showcases' THEN
    PERFORM public.calculate_user_level(COALESCE(NEW.owner_user_id, OLD.owner_user_id));
  ELSIF TG_TABLE_NAME = 'showcase_contributors' THEN
    PERFORM public.calculate_user_level(COALESCE(NEW.user_id, OLD.user_id));
  ELSIF TG_TABLE_NAME = 'reviews' THEN
    PERFORM public.calculate_user_level(COALESCE(NEW.to_user_id, OLD.to_user_id));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for automatic recalculation
DROP TRIGGER IF EXISTS recalc_level_on_skill_change ON public.user_skills;
CREATE TRIGGER recalc_level_on_skill_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_skills
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_level();

DROP TRIGGER IF EXISTS recalc_level_on_showcase_change ON public.showcases;
CREATE TRIGGER recalc_level_on_showcase_change
  AFTER INSERT OR UPDATE OR DELETE ON public.showcases
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_level();

DROP TRIGGER IF EXISTS recalc_level_on_contributor_change ON public.showcase_contributors;
CREATE TRIGGER recalc_level_on_contributor_change
  AFTER INSERT OR UPDATE OR DELETE ON public.showcase_contributors
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_level();

DROP TRIGGER IF EXISTS recalc_level_on_review_change ON public.reviews;
CREATE TRIGGER recalc_level_on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_level();