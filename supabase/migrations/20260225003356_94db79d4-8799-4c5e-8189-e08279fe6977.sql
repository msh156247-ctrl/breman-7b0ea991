
-- 팀원 평가 테이블
CREATE TABLE public.member_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL,
  evaluated_user_id UUID NOT NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  evaluation_type TEXT NOT NULL DEFAULT 'milestone' CHECK (evaluation_type IN ('milestone', 'final')),
  contribution_score INTEGER NOT NULL CHECK (contribution_score BETWEEN 1 AND 5),
  quality_score INTEGER NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  punctuality_score INTEGER NOT NULL CHECK (punctuality_score BETWEEN 1 AND 5),
  overall_score NUMERIC GENERATED ALWAYS AS (
    ROUND((contribution_score + quality_score + punctuality_score)::numeric / 3, 1)
  ) STORED,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_evaluations ENABLE ROW LEVEL SECURITY;

-- Only team leaders can create evaluations
CREATE POLICY "Leaders can create evaluations"
ON public.member_evaluations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = member_evaluations.team_id
    AND teams.leader_id = auth.uid()
  )
  AND evaluator_id = auth.uid()
);

-- Leaders can view evaluations for their teams
CREATE POLICY "Leaders can view team evaluations"
ON public.member_evaluations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = member_evaluations.team_id
    AND teams.leader_id = auth.uid()
  )
);

-- Users can view their own evaluations
CREATE POLICY "Users can view own evaluations"
ON public.member_evaluations
FOR SELECT
USING (evaluated_user_id = auth.uid());

-- Leaders can update their own evaluations
CREATE POLICY "Leaders can update own evaluations"
ON public.member_evaluations
FOR UPDATE
USING (evaluator_id = auth.uid());

-- Trigger to recalculate user level when evaluation is added
CREATE OR REPLACE FUNCTION public.trigger_recalculate_on_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.calculate_user_level(COALESCE(NEW.evaluated_user_id, OLD.evaluated_user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recalculate_level_on_evaluation
AFTER INSERT OR UPDATE ON public.member_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_on_evaluation();
