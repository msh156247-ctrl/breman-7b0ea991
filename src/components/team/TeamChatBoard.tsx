import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Pin, Trash2, MoreVertical, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TeamMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    avatar_url: string | null;
  };
}

interface TeamChatBoardProps {
  teamId: string;
  isLeader: boolean;
  isMember: boolean;
}

export function TeamChatBoard({ teamId, isLeader, isMember }: TeamChatBoardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select(`
          *,
          user:profiles!team_messages_user_id_fkey(name, avatar_url)
        `)
        .eq('team_id', teamId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMember) {
      fetchMessages();
    }
  }, [teamId, isMember]);

  // Real-time subscription
  useEffect(() => {
    if (!isMember) return;

    const channel = supabase
      .channel(`team_messages_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, isMember]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from('team_messages').insert({
        team_id: teamId,
        user_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: '전송 실패',
        description: '메시지를 전송할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTogglePin = async (messageId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('team_messages')
        .update({ is_pinned: !currentPinned })
        .eq('id', messageId);

      if (error) throw error;
      toast({
        title: currentPinned ? '고정 해제됨' : '메시지 고정됨',
        description: currentPinned ? '메시지 고정이 해제되었습니다.' : '메시지가 상단에 고정되었습니다.',
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: '실패',
        description: '작업을 완료할 수 없습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('team_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      toast({
        title: '삭제됨',
        description: '메시지가 삭제되었습니다.',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: '삭제 실패',
        description: '메시지를 삭제할 수 없습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isMember) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">팀원만 게시판을 이용할 수 있습니다</p>
          <p className="text-sm text-muted-foreground mt-1">팀에 가입하여 멤버들과 소통하세요</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pinnedMessages = messages.filter((m) => m.is_pinned);
  const regularMessages = messages.filter((m) => !m.is_pinned);

  return (
    <div className="space-y-4">
      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <ScrollReveal animation="fade-up">
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Pin className="w-4 h-4" />
              고정된 메시지
            </h3>
            {pinnedMessages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                isOwn={message.user_id === user?.id}
                isLeader={isLeader}
                onTogglePin={handleTogglePin}
                onDelete={handleDeleteMessage}
              />
            ))}
          </div>
        </ScrollReveal>
      )}

      {/* Message list */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="max-h-[400px] overflow-y-auto space-y-3 mb-4">
            {regularMessages.length === 0 && pinnedMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>아직 메시지가 없습니다</p>
                <p className="text-sm">첫 번째 메시지를 작성해보세요!</p>
              </div>
            ) : (
              regularMessages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  isOwn={message.user_id === user?.id}
                  isLeader={isLeader}
                  onTogglePin={handleTogglePin}
                  onDelete={handleDeleteMessage}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="bg-gradient-primary px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MessageCardProps {
  message: TeamMessage;
  isOwn: boolean;
  isLeader: boolean;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
}

function MessageCard({ message, isOwn, isLeader, onTogglePin, onDelete }: MessageCardProps) {
  const userName = message.user?.name || '알 수 없음';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg transition-colors ${
        message.is_pinned
          ? 'bg-primary/5 border border-primary/20'
          : 'hover:bg-muted/50'
      }`}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-sm">
          {userInitial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{userName}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'M/d HH:mm', { locale: ko })}
          </span>
          {message.is_pinned && (
            <Pin className="w-3 h-3 text-primary" />
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      {(isOwn || isLeader) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isLeader && (
              <DropdownMenuItem onClick={() => onTogglePin(message.id, message.is_pinned)}>
                {message.is_pinned ? (
                  <>
                    <PinOff className="w-4 h-4 mr-2" />
                    고정 해제
                  </>
                ) : (
                  <>
                    <Pin className="w-4 h-4 mr-2" />
                    고정하기
                  </>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(message.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
