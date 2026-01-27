-- Add 'negotiating' to project_status enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'negotiating' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_status')) THEN
    ALTER TYPE project_status ADD VALUE 'negotiating' AFTER 'matched';
  END IF;
END $$;

-- Create function to notify teams when their proposal is rejected
CREATE OR REPLACE FUNCTION public.notify_rejected_proposals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_title TEXT;
  team_leader_id UUID;
BEGIN
  -- Only trigger when status changes to 'rejected'
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Get project title
    SELECT title INTO project_title
    FROM public.projects
    WHERE id = NEW.project_id;
    
    -- Get team leader id
    SELECT leader_id INTO team_leader_id
    FROM public.teams
    WHERE id = NEW.team_id;
    
    -- Create notification for the team leader
    IF team_leader_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        team_leader_id,
        'project',
        '제안이 선택되지 않았습니다',
        '"' || project_title || '" 프로젝트에 다른 팀이 선택되었습니다.',
        '/projects/' || NEW.project_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for proposal rejection notifications
DROP TRIGGER IF EXISTS on_proposal_rejected ON public.project_proposals;
CREATE TRIGGER on_proposal_rejected
  AFTER UPDATE ON public.project_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rejected_proposals();

-- Create function to create negotiation conversation when proposal is accepted
CREATE OR REPLACE FUNCTION public.create_negotiation_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_title TEXT;
  client_id UUID;
  team_leader_id UUID;
  new_conversation_id UUID;
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get project info
    SELECT p.title, p.client_id INTO project_title, client_id
    FROM public.projects p
    WHERE p.id = NEW.project_id;
    
    -- Get team leader
    SELECT leader_id INTO team_leader_id
    FROM public.teams
    WHERE id = NEW.team_id;
    
    -- Create negotiation conversation
    INSERT INTO public.conversations (type, name)
    VALUES ('direct', '협상: ' || project_title)
    RETURNING id INTO new_conversation_id;
    
    -- Add client as participant
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (new_conversation_id, client_id);
    
    -- Add team leader as participant
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (new_conversation_id, team_leader_id);
    
    -- Notify team leader about acceptance
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      team_leader_id,
      'project',
      '🎉 제안이 수락되었습니다!',
      '"' || project_title || '" 프로젝트의 제안이 수락되었습니다. 협상을 시작하세요.',
      '/chat'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for accepted proposals
DROP TRIGGER IF EXISTS on_proposal_accepted ON public.project_proposals;
CREATE TRIGGER on_proposal_accepted
  AFTER UPDATE ON public.project_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_negotiation_conversation();

-- Add review_requested column to contracts for tracking review prompts
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS client_reviewed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS team_reviewed BOOLEAN DEFAULT false;