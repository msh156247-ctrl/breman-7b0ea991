import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Users, MessageCircle, UsersRound, Calendar, LogOut, Bell, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Participant {
  id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface ChatRoomInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  conversationType: 'direct' | 'team' | 'team_to_team';
  conversationName?: string | null;
  currentUserId?: string;
}

export function ChatRoomInfoSheet({
  open,
  onOpenChange,
  conversationId,
  conversationType,
  conversationName,
  currentUserId
}: ChatRoomInfoSheetProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (open) {
      fetchConversationInfo();
    }
  }, [open, conversationId]);

  const fetchConversationInfo = async () => {
    setLoading(true);
    try {
      // Fetch conversation details
      const { data: convo } = await supabase
        .from('conversations')
        .select('created_at')
        .eq('id', conversationId)
        .single();
      
      if (convo) {
        setCreatedAt(convo.created_at);
      }

      // Fetch participants with profiles
      const { data: parts, error } = await supabase
        .from('conversation_participants')
        .select('id, user_id, joined_at')
        .eq('conversation_id', conversationId);

      if (error) throw error;

      // Fetch profiles for each participant
      const enrichedParticipants = await Promise.all(
        (parts || []).map(async (p) => {
          if (!p.user_id) return { ...p, profile: undefined };
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', p.user_id)
            .single();
          
          return { ...p, profile: profile || undefined };
        })
      );

      setParticipants(enrichedParticipants.filter(p => p.profile));
    } catch (error) {
      console.error('Error fetching conversation info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = () => {
    switch (conversationType) {
      case 'direct': return '1:1 채팅';
      case 'team': return '팀 채팅';
      case 'team_to_team': return '팀 간 채팅';
      default: return '채팅';
    }
  };

  const getTypeIcon = () => {
    switch (conversationType) {
      case 'direct': return <MessageCircle className="h-5 w-5" />;
      case 'team': return <Users className="h-5 w-5" />;
      case 'team_to_team': return <UsersRound className="h-5 w-5" />;
    }
  };

  const handleLeaveChat = async () => {
    // Leave chat logic - remove from participants
    if (!currentUserId) return;
    
    try {
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUserId);
      
      onOpenChange(false);
      navigate('/chat');
    } catch (error) {
      console.error('Error leaving chat:', error);
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Conversation Type Badge */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          {getTypeIcon()}
        </div>
      </div>
      
      <div className="text-center mb-4">
        <h3 className="font-semibold text-lg">{conversationName || getTypeLabel()}</h3>
        <Badge variant="secondary" className="mt-1">{getTypeLabel()}</Badge>
      </div>

      <Separator />

      {/* Info Section */}
      <div className="py-4 px-2 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">참여자</span>
          <span className="font-medium">{participants.length}명</span>
        </div>
        {createdAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">생성일</span>
            <span className="font-medium">
              {format(new Date(createdAt), 'yyyy년 M월 d일', { locale: ko })}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Participants List */}
      <div className="flex-1 min-h-0">
        <h4 className="font-medium text-sm py-3 px-2">참여자 목록</h4>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2 px-2">
            {participants.map((p) => (
              <div 
                key={p.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => p.profile?.id && navigate(`/profile/${p.profile.id}`)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">
                    {p.profile?.name?.slice(0, 2) || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {p.profile?.name}
                    {p.user_id === currentUserId && (
                      <span className="text-muted-foreground ml-1">(나)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.joined_at), 'M월 d일 참여', { locale: ko })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Actions */}
      <div className="py-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
        >
          {notificationsEnabled ? (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              알림 끄기
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              알림 켜기
            </>
          )}
        </Button>
        {conversationType !== 'direct' && (
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleLeaveChat}
          >
            <LogOut className="h-4 w-4 mr-2" />
            채팅방 나가기
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>톡방 정보</DrawerTitle>
            <DrawerDescription>채팅방 정보 및 참여자를 확인하세요</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[340px]">
        <SheetHeader>
          <SheetTitle>톡방 정보</SheetTitle>
          <SheetDescription>채팅방 정보 및 참여자를 확인하세요</SheetDescription>
        </SheetHeader>
        <div className="mt-4 h-[calc(100vh-120px)] overflow-y-auto">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
