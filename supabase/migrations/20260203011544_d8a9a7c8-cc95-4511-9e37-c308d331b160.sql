-- search_path 설정 추가하여 보안 경고 해결
CREATE OR REPLACE FUNCTION public.add_team_members_to_conversation()
RETURNS TRIGGER AS $$
DECLARE
  leader_id UUID;
BEGIN
  IF NEW.type = 'team' AND NEW.team_id IS NOT NULL THEN
    -- 리더 추가
    SELECT t.leader_id INTO leader_id
    FROM public.teams t WHERE t.id = NEW.team_id;
    
    IF leader_id IS NOT NULL THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (NEW.id, leader_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
    
    -- 기존 멤버들도 추가
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    SELECT NEW.id, tm.user_id
    FROM public.team_memberships tm
    WHERE tm.team_id = NEW.team_id
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.add_member_to_team_conversation()
RETURNS TRIGGER AS $$
BEGIN
  -- 해당 팀의 채팅방에 새 멤버 추가
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.conversations c
  WHERE c.type = 'team' AND c.team_id = NEW.team_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;