-- Showcase: 개인/팀 단위 협업 기록 및 포트폴리오
CREATE TABLE public.showcases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  
  -- 소유 정보 (개인 또는 팀)
  owner_user_id UUID REFERENCES public.profiles(id),
  owner_team_id UUID REFERENCES public.teams(id),
  
  -- 구조화된 내용
  goal TEXT, -- 목표
  process TEXT, -- 과정
  result TEXT, -- 결과
  retrospective TEXT, -- 회고
  
  -- 메타데이터
  started_at DATE,
  ended_at DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'team_only', 'private')),
  
  -- 미디어
  cover_image_url TEXT,
  attachments TEXT[] DEFAULT '{}',
  
  -- 통계
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- 개인 또는 팀 중 하나는 필수
  CONSTRAINT showcase_owner_check CHECK (
    (owner_user_id IS NOT NULL AND owner_team_id IS NULL) OR
    (owner_user_id IS NULL AND owner_team_id IS NOT NULL)
  )
);

-- Showcase 기여자: 역할 기반 참여 기록
CREATE TABLE public.showcase_contributors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showcase_id UUID NOT NULL REFERENCES public.showcases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- 역할 정보
  role_type role_type NOT NULL, -- backend, frontend, design 등
  role_description TEXT, -- 구체적인 역할 설명
  
  -- 기여 상세
  contribution_summary TEXT,
  
  -- XP 적립 (승인 시)
  xp_earned INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(showcase_id, user_id)
);

-- Showcase에 사용된 스킬
CREATE TABLE public.showcase_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showcase_id UUID NOT NULL REFERENCES public.showcases(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id),
  
  -- 스킬 사용 수준
  proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(showcase_id, skill_id)
);

-- Track: Showcase를 성장 경로로 묶음
CREATE TABLE public.tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- 트랙 목표
  target_role_type role_type,
  target_skills TEXT[],
  
  -- 상태
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track과 Showcase 연결
CREATE TABLE public.track_showcases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  showcase_id UUID NOT NULL REFERENCES public.showcases(id) ON DELETE CASCADE,
  
  order_index INTEGER DEFAULT 0,
  note TEXT, -- 이 Showcase가 Track에서 어떤 의미인지
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(track_id, showcase_id)
);

-- Enable RLS
ALTER TABLE public.showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_showcases ENABLE ROW LEVEL SECURITY;

-- Showcases RLS Policies
CREATE POLICY "Public showcases are viewable by everyone"
ON public.showcases FOR SELECT
USING (
  visibility = 'public' OR
  owner_user_id = auth.uid() OR
  owner_team_id IN (
    SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
    UNION
    SELECT id FROM teams WHERE leader_id = auth.uid()
  )
);

CREATE POLICY "Users can create personal showcases"
ON public.showcases FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id OR
  owner_team_id IN (
    SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
    UNION
    SELECT id FROM teams WHERE leader_id = auth.uid()
  )
);

CREATE POLICY "Owners can update showcases"
ON public.showcases FOR UPDATE
USING (
  owner_user_id = auth.uid() OR
  owner_team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid())
);

CREATE POLICY "Owners can delete showcases"
ON public.showcases FOR DELETE
USING (
  owner_user_id = auth.uid() OR
  owner_team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid())
);

-- Showcase Contributors RLS
CREATE POLICY "Contributors are viewable on visible showcases"
ON public.showcase_contributors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM showcases s
    WHERE s.id = showcase_id AND (
      s.visibility = 'public' OR
      s.owner_user_id = auth.uid() OR
      s.owner_team_id IN (
        SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
        UNION
        SELECT id FROM teams WHERE leader_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Showcase owners can manage contributors"
ON public.showcase_contributors FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM showcases s
    WHERE s.id = showcase_id AND (
      s.owner_user_id = auth.uid() OR
      s.owner_team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid())
    )
  )
);

-- Showcase Skills RLS
CREATE POLICY "Skills are viewable on visible showcases"
ON public.showcase_skills FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM showcases s
    WHERE s.id = showcase_id AND (
      s.visibility = 'public' OR
      s.owner_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Showcase owners can manage skills"
ON public.showcase_skills FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM showcases s
    WHERE s.id = showcase_id AND (
      s.owner_user_id = auth.uid() OR
      s.owner_team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid())
    )
  )
);

-- Tracks RLS
CREATE POLICY "Tracks are viewable by everyone"
ON public.tracks FOR SELECT
USING (true);

CREATE POLICY "Users can manage own tracks"
ON public.tracks FOR ALL
USING (auth.uid() = user_id);

-- Track Showcases RLS
CREATE POLICY "Track showcases are viewable by everyone"
ON public.track_showcases FOR SELECT
USING (true);

CREATE POLICY "Track owners can manage track showcases"
ON public.track_showcases FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM tracks t
    WHERE t.id = track_id AND t.user_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX idx_showcases_owner_user ON public.showcases(owner_user_id);
CREATE INDEX idx_showcases_owner_team ON public.showcases(owner_team_id);
CREATE INDEX idx_showcases_status ON public.showcases(status);
CREATE INDEX idx_showcase_contributors_user ON public.showcase_contributors(user_id);
CREATE INDEX idx_tracks_user ON public.tracks(user_id);

-- Updated at trigger
CREATE TRIGGER update_showcases_updated_at
BEFORE UPDATE ON public.showcases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at
BEFORE UPDATE ON public.tracks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();