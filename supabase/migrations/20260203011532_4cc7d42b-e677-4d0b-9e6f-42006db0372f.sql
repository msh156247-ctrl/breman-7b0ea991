-- 1. 기존 팀 채팅에 리더 추가 (마이그레이션)
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, t.leader_id
FROM conversations c
JOIN teams t ON c.team_id = t.id
WHERE c.type = 'team' AND t.leader_id IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- 2. 기존 팀 채팅에 멤버 추가 (마이그레이션)
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, tm.user_id
FROM conversations c
JOIN team_memberships tm ON c.team_id = tm.team_id
WHERE c.type = 'team'
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- 3. 팀 채팅 생성 시 리더와 멤버들을 자동으로 참여자에 추가하는 함수
CREATE OR REPLACE FUNCTION public.add_team_members_to_conversation()
RETURNS TRIGGER AS $$
DECLARE
  leader_id UUID;
BEGIN
  IF NEW.type = 'team' AND NEW.team_id IS NOT NULL THEN
    -- 리더 추가
    SELECT t.leader_id INTO leader_id
    FROM teams t WHERE t.id = NEW.team_id;
    
    IF leader_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (NEW.id, leader_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
    
    -- 기존 멤버들도 추가
    INSERT INTO conversation_participants (conversation_id, user_id)
    SELECT NEW.id, tm.user_id
    FROM team_memberships tm
    WHERE tm.team_id = NEW.team_id
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 팀 채팅 생성 트리거
DROP TRIGGER IF EXISTS on_team_conversation_created ON public.conversations;
CREATE TRIGGER on_team_conversation_created
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_team_members_to_conversation();

-- 5. 팀 멤버 추가 시 해당 팀 채팅에 자동으로 참여자 추가하는 함수
CREATE OR REPLACE FUNCTION public.add_member_to_team_conversation()
RETURNS TRIGGER AS $$
BEGIN
  -- 해당 팀의 채팅방에 새 멤버 추가
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM conversations c
  WHERE c.type = 'team' AND c.team_id = NEW.team_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 팀 멤버십 생성 트리거
DROP TRIGGER IF EXISTS on_team_membership_created ON public.team_memberships;
CREATE TRIGGER on_team_membership_created
  AFTER INSERT ON public.team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.add_member_to_team_conversation();