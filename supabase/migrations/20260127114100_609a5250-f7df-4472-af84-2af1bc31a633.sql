-- 1. 자격증 마스터 테이블
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  category TEXT DEFAULT 'technical', -- 'technical', 'language', 'management', 'design', 'security'
  score_bonus INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 유저 자격증 테이블
CREATE TABLE public.user_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  certification_id UUID REFERENCES public.certifications(id) ON DELETE CASCADE NOT NULL,
  acquired_date DATE,
  expiry_date DATE,
  certificate_number TEXT,
  certificate_file_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, certification_id)
);

-- 3. 인증 요청 테이블
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  verification_type TEXT NOT NULL, -- 'identity', 'career', 'education', 'team_leader', 'project_creator'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  submitted_documents TEXT[] DEFAULT '{}',
  description TEXT,
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 프로필에 인증 상태 컬럼 추가
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS career_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certification_bonus NUMERIC DEFAULT 0;

-- 5. RLS 활성화
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- 6. 자격증 RLS (전체 공개 읽기, 관리자만 관리)
CREATE POLICY "Certifications are viewable by everyone"
ON public.certifications FOR SELECT USING (true);

CREATE POLICY "Admins can manage certifications"
ON public.certifications FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 7. 유저 자격증 RLS
CREATE POLICY "Users can view own certifications"
ON public.user_certifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own certifications"
ON public.user_certifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own certifications"
ON public.user_certifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own certifications"
ON public.user_certifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all certifications"
ON public.user_certifications FOR ALL
USING (is_admin(auth.uid()));

-- 8. 인증 요청 RLS
CREATE POLICY "Users can view own verification requests"
ON public.verification_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification requests"
ON public.verification_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all verification requests"
ON public.verification_requests FOR ALL
USING (is_admin(auth.uid()));

-- 9. 레벨 계산 함수 업데이트 (자격증 보너스 추가)
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
  certification_pts numeric := 0;
  final_score numeric := 0;
  final_level integer := 1;
  skill_count integer := 0;
  project_count integer := 0;
  showcase_count integer := 0;
  avg_rating numeric := 0;
  total_xp integer := 0;
BEGIN
  -- 1. 스킬 점수 계산
  SELECT 
    COUNT(*),
    COALESCE(SUM(us.xp), 0)
  INTO skill_count, total_xp
  FROM user_skills us
  WHERE us.user_id = user_id_input;

  IF skill_count > 0 THEN
    skill_avg := LEAST(100, (total_xp::numeric / skill_count) / 10);
  END IF;

  -- 2. 경험 점수 계산
  SELECT COUNT(*) INTO project_count
  FROM contracts c
  JOIN teams t ON c.team_id = t.id
  JOIN team_memberships tm ON tm.team_id = t.id
  WHERE tm.user_id = user_id_input AND c.status = 'completed';
  
  SELECT project_count + COUNT(*) INTO project_count
  FROM contracts c
  JOIN teams t ON c.team_id = t.id
  WHERE t.leader_id = user_id_input AND c.status = 'completed';

  SELECT COUNT(*) INTO showcase_count
  FROM showcases s
  WHERE s.owner_user_id = user_id_input AND s.status = 'published';

  SELECT showcase_count + COUNT(*) INTO showcase_count
  FROM showcase_contributors sc
  WHERE sc.user_id = user_id_input AND sc.is_verified = true;

  experience_pts := LEAST(50, project_count * 10) + LEAST(50, showcase_count * 5);

  -- 3. 포트폴리오 보너스
  SELECT COALESCE(AVG(LEAST(10, s.view_count / 10)), 0) INTO portfolio_pts
  FROM showcases s
  WHERE s.owner_user_id = user_id_input AND s.status = 'published';

  -- 4. 프로젝트 보너스
  project_pts := LEAST(10, project_count * 2);

  -- 5. 팀 평가 보너스
  SELECT COALESCE(AVG(r.rating), 0) INTO avg_rating
  FROM reviews r
  WHERE r.to_user_id = user_id_input;
  
  team_rating_pts := avg_rating * 2;

  -- 6. 자격증 보너스 (NEW!)
  SELECT COALESCE(SUM(c.score_bonus), 0) INTO certification_pts
  FROM user_certifications uc
  JOIN certifications c ON uc.certification_id = c.id
  WHERE uc.user_id = user_id_input AND uc.is_verified = true;
  
  -- 최대 15점 제한
  certification_pts := LEAST(15, certification_pts);

  -- 최종 점수 계산
  final_score := (skill_avg * 0.6) + (experience_pts * 0.4) + portfolio_pts + project_pts + team_rating_pts + certification_pts;
  final_score := LEAST(100, final_score);

  -- 레벨 변환
  final_level := CASE
    WHEN final_score >= 80 THEN 5
    WHEN final_score >= 60 THEN 4
    WHEN final_score >= 40 THEN 3
    WHEN final_score >= 20 THEN 2
    ELSE 1
  END;

  -- 프로필 업데이트
  UPDATE public.profiles
  SET 
    skill_score = skill_avg,
    experience_score = experience_pts,
    calculated_level_score = final_score,
    portfolio_bonus = portfolio_pts,
    project_bonus = project_pts,
    team_rating_bonus = team_rating_pts,
    certification_bonus = certification_pts,
    level = final_level
  WHERE id = user_id_input;

  RETURN jsonb_build_object(
    'skill_score', skill_avg,
    'experience_score', experience_pts,
    'calculated_level_score', final_score,
    'portfolio_bonus', portfolio_pts,
    'project_bonus', project_pts,
    'team_rating_bonus', team_rating_pts,
    'certification_bonus', certification_pts,
    'level', final_level
  );
END;
$$;

-- 10. 자격증 검증 시 레벨 재계산 트리거
CREATE OR REPLACE FUNCTION public.trigger_recalculate_level_on_certification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.calculate_user_level(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recalculate_level_on_certification_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_certifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_level_on_certification();

-- 11. 기본 자격증 데이터 삽입
INSERT INTO public.certifications (name, issuing_organization, category, score_bonus) VALUES
-- 기술 자격증
('정보처리기사', '한국산업인력공단', 'technical', 5),
('정보처리산업기사', '한국산업인력공단', 'technical', 3),
('정보보안기사', '한국인터넷진흥원', 'security', 5),
('네트워크관리사', 'ICQA', 'technical', 3),
('리눅스마스터 1급', '한국정보통신진흥협회', 'technical', 4),
('리눅스마스터 2급', '한국정보통신진흥협회', 'technical', 2),
('SQLD (SQL개발자)', '한국데이터산업진흥원', 'technical', 3),
('SQLP (SQL전문가)', '한국데이터산업진흥원', 'technical', 5),
-- AWS
('AWS Solutions Architect Associate', 'Amazon Web Services', 'technical', 5),
('AWS Solutions Architect Professional', 'Amazon Web Services', 'technical', 7),
('AWS Developer Associate', 'Amazon Web Services', 'technical', 4),
-- GCP
('Google Cloud Associate Cloud Engineer', 'Google', 'technical', 5),
('Google Cloud Professional Cloud Architect', 'Google', 'technical', 7),
-- Azure
('Azure Fundamentals (AZ-900)', 'Microsoft', 'technical', 3),
('Azure Administrator (AZ-104)', 'Microsoft', 'technical', 5),
-- 디자인
('GTQ 1급', '한국생산성본부', 'design', 3),
('GTQ 2급', '한국생산성본부', 'design', 2),
('컬러리스트기사', '한국산업인력공단', 'design', 4),
('웹디자인기능사', '한국산업인력공단', 'design', 3),
-- PM/관리
('PMP', 'PMI', 'management', 7),
('CAPM', 'PMI', 'management', 4),
('정보시스템감리사', '한국정보화진흥원', 'management', 6),
-- 보안
('CISSP', 'ISC2', 'security', 7),
('CISA', 'ISACA', 'security', 6),
('CEH (Certified Ethical Hacker)', 'EC-Council', 'security', 5),
-- 언어
('TOEIC 900+', 'ETS', 'language', 3),
('TOEIC Speaking Lv.7+', 'ETS', 'language', 3),
('JLPT N1', '일본국제교류기금', 'language', 3),
('HSK 6급', '한반', 'language', 3);

-- 12. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_certifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_requests;