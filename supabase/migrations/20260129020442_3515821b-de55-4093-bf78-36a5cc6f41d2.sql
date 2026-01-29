-- Drop existing complex messages policies
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

-- Simple SELECT policy using security definer function
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (public.user_has_conversation_access(conversation_id, auth.uid()));

-- Simple INSERT policy - user can send if they have access to conversation
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND public.user_has_conversation_access(conversation_id, auth.uid())
);

-- Simple UPDATE policy - only own messages
CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = sender_id);

-- Simple DELETE policy - only own messages
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Create trigger function for chat message notifications
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  participant RECORD;
  conv_name TEXT;
  conv_type TEXT;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Get conversation info
  SELECT name, type INTO conv_name, conv_type
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  -- Notify all participants except sender
  FOR participant IN
    SELECT cp.user_id 
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id IS NOT NULL
    AND cp.user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link
    ) VALUES (
      participant.user_id,
      'system',
      COALESCE(sender_name, '알 수 없음') || '님이 메시지를 보냈습니다',
      CASE 
        WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
        ELSE NEW.content
      END,
      '/chat/' || NEW.conversation_id
    );
  END LOOP;

  -- Also notify team members for team conversations
  IF conv_type = 'team' THEN
    FOR participant IN
      SELECT tm.user_id 
      FROM public.conversations c
      JOIN public.team_memberships tm ON c.team_id = tm.team_id
      WHERE c.id = NEW.conversation_id
      AND tm.user_id != NEW.sender_id
      AND NOT EXISTS (
        SELECT 1 FROM public.conversation_participants cp 
        WHERE cp.conversation_id = NEW.conversation_id 
        AND cp.user_id = tm.user_id
      )
    LOOP
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link
      ) VALUES (
        participant.user_id,
        'system',
        COALESCE(sender_name, '알 수 없음') || '님이 팀 채팅에 메시지를 보냈습니다',
        CASE 
          WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
          ELSE NEW.content
        END,
        '/chat/' || NEW.conversation_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new chat messages
DROP TRIGGER IF EXISTS on_new_chat_message ON public.messages;
CREATE TRIGGER on_new_chat_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();