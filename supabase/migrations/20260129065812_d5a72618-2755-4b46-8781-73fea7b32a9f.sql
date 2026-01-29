-- 1. team_role_slots에 질문 컬럼 추가 (포지션별 최대 5개 질문)
ALTER TABLE public.team_role_slots
ADD COLUMN IF NOT EXISTS questions jsonb DEFAULT '[]'::jsonb;

-- 질문 형식: [{"id": "uuid", "question": "질문 내용", "required": true}]

COMMENT ON COLUMN public.team_role_slots.questions IS '포지션별 질문 목록 (최대 5개)';

-- 2. team_applications에 질문 답변 저장 (answers_json 이미 존재하므로 확인)
-- answers_json은 이미 존재함

-- 3. 지원 승인시 채팅방 생성 함수
CREATE OR REPLACE FUNCTION public.create_application_chat_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  team_name TEXT;
  team_leader_id UUID;
  applicant_name TEXT;
  new_conversation_id UUID;
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get team info
    SELECT t.name, t.leader_id INTO team_name, team_leader_id
    FROM public.teams t
    WHERE t.id = NEW.team_id;
    
    -- Get applicant name
    SELECT name INTO applicant_name
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Create direct conversation between team leader and new member
    INSERT INTO public.conversations (type, name)
    VALUES ('direct', '환영합니다! - ' || team_name)
    RETURNING id INTO new_conversation_id;
    
    -- Add team leader as participant
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (new_conversation_id, team_leader_id);
    
    -- Add new member as participant
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (new_conversation_id, NEW.user_id);
    
    -- Create welcome notification for the new member
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'team',
      '🎉 팀 가입이 승인되었습니다!',
      '"' || team_name || '" 팀에 가입되었습니다. 팀 리더와 채팅을 시작해보세요.',
      '/chat/' || new_conversation_id
    );
    
    -- Notify team leader about new member joining
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      team_leader_id,
      'team',
      '새 멤버가 합류했습니다!',
      applicant_name || '님이 "' || team_name || '" 팀에 합류했습니다.',
      '/teams/' || NEW.team_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. 트리거 생성 (이미 존재하면 교체)
DROP TRIGGER IF EXISTS on_application_accepted ON public.team_applications;

CREATE TRIGGER on_application_accepted
AFTER UPDATE ON public.team_applications
FOR EACH ROW
EXECUTE FUNCTION public.create_application_chat_on_accept();