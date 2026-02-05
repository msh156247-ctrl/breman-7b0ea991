-- conversation_participants 테이블에 이전 대화 숨기기 설정 컬럼 추가
ALTER TABLE public.conversation_participants 
ADD COLUMN IF NOT EXISTS hide_messages_before_join boolean DEFAULT false;

-- 코멘트 추가
COMMENT ON COLUMN public.conversation_participants.hide_messages_before_join IS '참여 이전 메시지 숨기기 여부';