import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { ChatInputArea } from '@/components/chat/ChatInputArea';
import { ChatSearch } from '@/components/chat/ChatSearch';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { MessageAttachments } from '@/components/chat/ChatAttachments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Send, 
  MoreVertical,
  Reply,
  X,
  Users,
  MessageCircle,
  UsersRound,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  Search
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_team_id: string | null;
  content: string;
  reply_to_id: string | null;
  attachments: string[];
  created_at: string;
  sender?: {
    name: string;
    avatar_url: string | null;
  };
  reply_to?: {
    content: string;
    sender_name: string;
  };
  read_by_count?: number;
}

interface Conversation {
  id: string;
  type: 'direct' | 'team' | 'team_to_team';
  name: string | null;
  team_id: string | null;
}

interface ConversationInfo {
  title: string;
  subtitle: string;
  avatar?: string;
  type: 'direct' | 'team' | 'team_to_team';
}

export default function ChatRoom() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showNotification, requestPermission } = useBrowserNotification();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Typing indicator
  const { typingUsers, handleInputChange, stopTyping } = useTypingIndicator({
    conversationId,
    userId: user?.id,
    userName: profile?.name,
  });

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Mark messages as read when entering the chat room
  const markAsRead = async () => {
    if (!conversationId || !user) return;

    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
  };

  useEffect(() => {
    if (conversationId && user) {
      fetchConversation();
      fetchMessages();
      markAsRead();

      // Realtime subscription for new messages
      const channel = supabase
        .channel(`chat-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          async (payload) => {
            const newMsg = payload.new as Message;
            // Fetch sender info
            const { data: sender } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single();

            setMessages(prev => [...prev, { ...newMsg, sender: sender || undefined, read_by_count: 0 }]);
            scrollToBottom();
            // Mark as read immediately when receiving new messages
            markAsRead();

            // Show browser notification for messages from others
            if (newMsg.sender_id !== user?.id) {
              showNotification({
                title: sender?.name || '새 메시지',
                body: newMsg.content.length > 50 
                  ? newMsg.content.substring(0, 50) + '...' 
                  : newMsg.content,
                icon: sender?.avatar_url || '/favicon.ico',
                tag: `chat-${conversationId}`,
                onClick: () => {
                  navigate(`/chat/${conversationId}`);
                }
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_participants',
            filter: `conversation_id=eq.${conversationId}`
          },
          () => {
            // Refresh read counts when participants update their last_read_at
            fetchReadCounts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Fetch read counts for all messages
  const fetchReadCounts = async () => {
    if (!conversationId || !user) return;

    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id, last_read_at')
      .eq('conversation_id', conversationId);

    if (!participants) return;

    setParticipantCount(participants.length);

    setMessages(prev => prev.map(msg => {
      const readCount = participants.filter(p => 
        p.user_id !== msg.sender_id && 
        p.last_read_at && 
        new Date(p.last_read_at) >= new Date(msg.created_at)
      ).length;

      return { ...msg, read_by_count: readCount };
    }));
  };

  const fetchConversation = async () => {
    if (!conversationId || !user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      navigate('/chat');
      return;
    }

    setConversation({
      ...data,
      type: data.type as 'direct' | 'team' | 'team_to_team'
    });

    // Get conversation info based on type
    if (data.type === 'direct') {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);

      if (participants && participants[0]) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', participants[0].user_id)
          .single();

        setConversationInfo({
          title: profile?.name || '사용자',
          subtitle: '1:1 채팅',
          avatar: profile?.avatar_url || undefined,
          type: 'direct'
        });
      }
    } else if (data.type === 'team' && data.team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('name, emblem_url')
        .eq('id', data.team_id)
        .single();

      // Get member count
      const { count } = await supabase
        .from('team_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', data.team_id);

      setConversationInfo({
        title: team?.name || '팀',
        subtitle: `팀 채팅 · ${(count || 0) + 1}명`,
        avatar: team?.emblem_url || undefined,
        type: 'team'
      });
    } else if (data.type === 'team_to_team') {
      setConversationInfo({
        title: data.name || '팀 간 채팅',
        subtitle: '팀 간 채팅',
        type: 'team_to_team'
      });
    }
  };

  const fetchMessages = async () => {
    if (!conversationId || !user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Get participants for read counts
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id, last_read_at')
      .eq('conversation_id', conversationId);

    setParticipantCount(participants?.length || 0);

    // Enrich with sender info and reply info
    const enrichedMessages = await Promise.all(
      (data || []).map(async (msg) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', msg.sender_id)
          .single();

        let reply_to = undefined;
        if (msg.reply_to_id) {
          const { data: replyMsg } = await supabase
            .from('messages')
            .select('content, sender_id')
            .eq('id', msg.reply_to_id)
            .single();

          if (replyMsg) {
            const { data: replySender } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', replyMsg.sender_id)
              .single();

            reply_to = {
              content: replyMsg.content,
              sender_name: replySender?.name || '사용자'
            };
          }
        }

        // Calculate read count (participants who read this message, excluding sender)
        const readCount = (participants || []).filter(p => 
          p.user_id !== msg.sender_id && 
          p.last_read_at && 
          new Date(p.last_read_at) >= new Date(msg.created_at)
        ).length;

        return {
          ...msg,
          sender: sender || undefined,
          reply_to,
          read_by_count: readCount
        };
      })
    );

    setMessages(enrichedMessages);
    setLoading(false);
  };

  const handleSendMessage = async (attachmentUrls: string[] = []) => {
    const hasContent = newMessage.trim();
    const hasAttachments = attachmentUrls.length > 0;
    
    if ((!hasContent && !hasAttachments) || !conversationId || !user || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    stopTyping();

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content || (hasAttachments ? '📎 첨부파일' : ''),
          reply_to_id: replyTo?.id || null,
          attachments: attachmentUrls.length > 0 ? attachmentUrls : null
        });

      if (error) throw error;
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMessage.id);

      if (error) throw error;

      setMessages(prev => prev.map(msg => 
        msg.id === editingMessage.id 
          ? { ...msg, content: editContent.trim() }
          : msg
      ));

      toast.success('메시지가 수정되었습니다');
      setEditingMessage(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('메시지 수정에 실패했습니다');
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteMessageId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', deleteMessageId);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== deleteMessageId));
      toast.success('메시지가 삭제되었습니다');
      setDeleteMessageId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('메시지 삭제에 실패했습니다');
    }
  };

  const startEditing = (msg: Message) => {
    setEditingMessage(msg);
    setEditContent(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  const handleSearchHighlight = useCallback((messageId: string | null, _index: number, _total: number) => {
    setHighlightedMessageId(messageId);
    if (messageId) {
      scrollToMessage(messageId);
    }
  }, []);

  const formatDateDivider = (date: Date) => {
    if (isToday(date)) return '오늘';
    if (isYesterday(date)) return '어제';
    return format(date, 'yyyy년 M월 d일 EEEE', { locale: ko });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return <MessageCircle className="h-4 w-4" />;
      case 'team':
        return <Users className="h-4 w-4" />;
      case 'team_to_team':
        return <UsersRound className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const renderMessages = () => {
    let lastDate: Date | null = null;

    return messages.map((msg, index) => {
      const msgDate = new Date(msg.created_at);
      const showDateDivider = !lastDate || !isSameDay(lastDate, msgDate);
      lastDate = msgDate;

      const isOwn = msg.sender_id === user?.id;
      const showAvatar = !isOwn && (
        index === 0 || 
        messages[index - 1].sender_id !== msg.sender_id ||
        !isSameDay(new Date(messages[index - 1].created_at), msgDate)
      );

      const isHighlighted = msg.id === highlightedMessageId;

      return (
        <div 
          key={msg.id}
          ref={(el) => {
            if (el) messageRefs.current.set(msg.id, el);
          }}
        >
          {showDateDivider && (
            <div className="flex justify-center my-4">
              <Badge variant="secondary" className="text-xs font-normal">
                {formatDateDivider(msgDate)}
              </Badge>
            </div>
          )}

          <div className={cn(
            'flex gap-2 mb-2 transition-colors duration-300',
            isOwn ? 'flex-row-reverse' : '',
            isHighlighted && 'bg-accent rounded-lg p-2 -mx-2'
          )}>
            {!isOwn && (
              <div className="w-8 shrink-0">
                {showAvatar && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.sender?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10">
                      {msg.sender?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )}

            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
              {!isOwn && showAvatar && (
                <span className="text-xs text-muted-foreground mb-1 ml-1">
                  {msg.sender?.name}
                </span>
              )}

              <div className="flex items-end gap-1">
                {isOwn && (
                  <div className="flex flex-col items-end gap-0.5">
                    {/* Read receipt */}
                    {(() => {
                      const otherParticipants = participantCount - 1;
                      const readByCount = msg.read_by_count || 0;
                      const allRead = otherParticipants > 0 && readByCount >= otherParticipants;
                      const unreadCount = otherParticipants - readByCount;
                      
                      return (
                        <span className={`text-[10px] flex items-center gap-0.5 ${
                          allRead ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {allRead ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : unreadCount > 0 ? (
                            <span className="text-amber-500">{unreadCount}</span>
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      );
                    })()}
                    <span className="text-[10px] text-muted-foreground">
                      {format(msgDate, 'a h:mm', { locale: ko })}
                    </span>
                  </div>
                )}

                <div className="group relative">
                  {msg.reply_to && (
                    <div className={`text-xs p-2 mb-1 rounded-lg ${
                      isOwn ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <span className="font-medium">{msg.reply_to.sender_name}</span>
                      <p className="text-muted-foreground truncate max-w-[200px]">
                        {msg.reply_to.content}
                      </p>
                    </div>
                  )}

                  <div className={`px-3 py-2 rounded-2xl ${
                    isOwn 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-muted rounded-tl-sm'
                  }`}>
                    {msg.content && msg.content !== '📎 첨부파일' && (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                    <MessageAttachments attachments={msg.attachments} />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-0 opacity-0 group-hover:opacity-100 h-6 w-6 ${
                          isOwn ? '-left-7' : '-right-7'
                        }`}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setReplyTo(msg)}>
                        <Reply className="h-4 w-4 mr-2" />
                        답장
                      </DropdownMenuItem>
                      {isOwn && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => startEditing(msg)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteMessageId(msg.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {!isOwn && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(msgDate, 'a h:mm', { locale: ko })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse">로딩중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate('/chat')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarImage src={conversationInfo?.avatar} />
          <AvatarFallback className="bg-primary/10">
            {conversationInfo?.title?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{conversationInfo?.title}</h2>
            {conversationInfo?.type && (
              <Badge variant="secondary" className="text-xs">
                {getTypeIcon(conversationInfo.type)}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{conversationInfo?.subtitle}</p>
        </div>

        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(!isSearchOpen)}>
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Search Bar */}
      <ChatSearch
        messages={messages}
        onHighlight={handleSearchHighlight}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {renderMessages()}
        <div ref={scrollRef} />
      </ScrollArea>

      {/* Edit Message Preview */}
      {editingMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t">
          <Pencil className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">메시지 수정</p>
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEditMessage();
                } else if (e.key === 'Escape') {
                  cancelEditing();
                }
              }}
              className="mt-1 h-8 text-sm"
              autoFocus
            />
          </div>
          <Button variant="ghost" size="icon" onClick={handleEditMessage} disabled={!editContent.trim()}>
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={cancelEditing}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Reply Preview */}
      {replyTo && !editingMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t">
          <Reply className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{replyTo.sender?.name}에게 답장</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} className="border-t" />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>메시지를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 메시지가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Input */}
      <ChatInputArea
        inputRef={inputRef}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        sending={sending}
        userId={user?.id || ''}
        onSendMessage={handleSendMessage}
        onInputChange={handleInputChange}
      />
    </div>
  );
}
