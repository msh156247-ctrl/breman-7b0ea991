-- 1. 팀 채팅 생성 시 리더와 멤버들을 conversation_participants에 자동 등록하는 함수
CREATE OR REPLACE FUNCTION public.add_team_members_to_conversation()
RETURNS trigger AS $$
DECLARE
  team_leader_id UUID;
BEGIN
  -- 팀 채팅인 경우에만 처리
  IF NEW.type = 'team' AND NEW.team_id IS NOT NULL THEN
    -- 팀 리더 ID 가져오기
    SELECT t.leader_id INTO team_leader_id
    FROM public.teams t WHERE t.id = NEW.team_id;
    
    -- 리더를 참여자로 등록
    IF team_leader_id IS NOT NULL THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (NEW.id, team_leader_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
    
    -- 팀 멤버들도 등록
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    SELECT NEW.id, tm.user_id
    FROM public.team_memberships tm
    WHERE tm.team_id = NEW.team_id AND tm.user_id IS NOT NULL
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. conversations 테이블에 INSERT 트리거 생성
DROP TRIGGER IF EXISTS on_team_conversation_created ON public.conversations;
CREATE TRIGGER on_team_conversation_created
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_team_members_to_conversation();

-- 3. 팀 멤버십 변경 시 해당 팀의 채팅방에 참여자로 자동 등록하는 함수
CREATE OR REPLACE FUNCTION public.add_member_to_team_conversations()
RETURNS trigger AS $$
BEGIN
  -- 새 멤버가 추가되면 해당 팀의 모든 팀 채팅에 참여자로 등록
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.conversations c
  WHERE c.team_id = NEW.team_id AND c.type = 'team'
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. team_memberships 테이블에 INSERT 트리거 생성
DROP TRIGGER IF EXISTS on_team_membership_created ON public.team_memberships;
CREATE TRIGGER on_team_membership_created
  AFTER INSERT ON public.team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.add_member_to_team_conversations();

-- 5. conversation_participants에 유니크 제약조건 추가 (없다면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'conversation_participants_conversation_id_user_id_key'
  ) THEN
    ALTER TABLE public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key 
    UNIQUE (conversation_id, user_id);
  END IF;
END $$;

-- 6. 기존 팀 채팅 데이터 마이그레이션 - 리더 추가
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, t.leader_id
FROM public.conversations c
JOIN public.teams t ON c.team_id = t.id
WHERE c.type = 'team' AND t.leader_id IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- 7. 기존 팀 채팅 데이터 마이그레이션 - 멤버 추가
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, tm.user_id
FROM public.conversations c
JOIN public.team_memberships tm ON c.team_id = tm.team_id
WHERE c.type = 'team' AND tm.user_id IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;