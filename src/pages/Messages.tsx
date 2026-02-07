import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  MailOpen,
  Send,
  Trash2,
  PenSquare,
  Inbox,
  SendHorizontal,
  Loader2,
  MailPlus,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MessageComposeDialog } from '@/components/messages/MessageComposeDialog';
import { MessageDetailDialog } from '@/components/messages/MessageDetailDialog';

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  sender?: { name: string; avatar_url: string | null };
  recipient?: { name: string; avatar_url: string | null };
}

export default function Messages() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(null);
  const [replyTo, setReplyTo] = useState<{ userId: string; userName: string; subject: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, activeTab]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('direct-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          if (activeTab === 'inbox') {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeTab]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (activeTab === 'inbox') {
        const { data, error } = await supabase
          .from('direct_messages')
          .select('*')
          .eq('recipient_id', user.id)
          .eq('recipient_deleted', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch sender profiles
        const senderIds = [...new Set((data || []).map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', senderIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        setMessages((data || []).map(m => ({
          ...m,
          sender: profileMap.get(m.sender_id) || undefined,
        })));
      } else {
        const { data, error } = await supabase
          .from('direct_messages')
          .select('*')
          .eq('sender_id', user.id)
          .eq('sender_deleted', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const recipientIds = [...new Set((data || []).map(m => m.recipient_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', recipientIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        setMessages((data || []).map(m => ({
          ...m,
          recipient: profileMap.get(m.recipient_id) || undefined,
        })));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('쪽지를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    const { error } = await supabase
      .from('direct_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('recipient_id', user?.id);

    if (!error) {
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m)
      );
    }
  };

  const handleDelete = async (messageId: string) => {
    const field = activeTab === 'inbox' ? 'recipient_deleted' : 'sender_deleted';
    const { error } = await supabase
      .from('direct_messages')
      .update({ [field]: true })
      .eq('id', messageId);

    if (error) {
      toast.error('삭제에 실패했습니다');
      return;
    }

    setMessages(prev => prev.filter(m => m.id !== messageId));
    setSelectedMessage(null);
    toast.success('쪽지가 삭제되었습니다');
  };

  const handleOpenMessage = (msg: DirectMessage) => {
    setSelectedMessage(msg);
    if (activeTab === 'inbox' && !msg.is_read) {
      handleMarkAsRead(msg.id);
    }
  };

  const handleReply = (msg: DirectMessage) => {
    setSelectedMessage(null);
    setReplyTo({
      userId: msg.sender_id,
      userName: msg.sender?.name || '사용자',
      subject: msg.subject ? `Re: ${msg.subject}` : '',
    });
    setComposeOpen(true);
  };

  const unreadCount = messages.filter(m => !m.is_read && activeTab === 'inbox').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            쪽지
          </h1>
          <p className="text-sm text-muted-foreground mt-1">회원 간 개인 메시지</p>
        </div>
        <Button onClick={() => { setReplyTo(null); setComposeOpen(true); }}>
          <PenSquare className="h-4 w-4 mr-2" />
          쪽지 쓰기
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inbox' | 'sent')}>
        <TabsList className="w-full">
          <TabsTrigger value="inbox" className="flex-1 gap-2">
            <Inbox className="h-4 w-4" />
            받은 쪽지
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 gap-2">
            <SendHorizontal className="h-4 w-4" />
            보낸 쪽지
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MailPlus className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">
                {activeTab === 'inbox' ? '받은 쪽지가 없습니다' : '보낸 쪽지가 없습니다'}
              </p>
              <p className="text-sm mt-1">
                {activeTab === 'inbox' 
                  ? '다른 회원이 보낸 쪽지가 여기에 표시됩니다'
                  : '쪽지 쓰기를 눌러 메시지를 보내보세요'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => {
                const otherUser = activeTab === 'inbox' ? msg.sender : msg.recipient;
                const isUnread = activeTab === 'inbox' && !msg.is_read;

                return (
                  <Card 
                    key={msg.id}
                    className={cn(
                      'cursor-pointer hover:shadow-md transition-all',
                      isUnread && 'border-primary/50 bg-primary/5'
                    )}
                    onClick={() => handleOpenMessage(msg)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={otherUser?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            {otherUser?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm truncate', isUnread && 'font-bold')}>
                              {otherUser?.name || '알 수 없는 사용자'}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ko })}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className={cn('text-sm truncate', isUnread ? 'font-semibold' : 'text-muted-foreground')}>
                              {msg.subject}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground truncate">
                            {msg.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isUnread && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                          {activeTab === 'sent' && (
                            msg.is_read ? (
                              <MailOpen className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Compose Dialog */}
      <MessageComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        recipientId={replyTo?.userId}
        recipientName={replyTo?.userName}
        defaultSubject={replyTo?.subject}
        onSent={() => {
          fetchMessages();
          setReplyTo(null);
        }}
      />

      {/* Message Detail Dialog */}
      <MessageDetailDialog
        message={selectedMessage}
        onClose={() => setSelectedMessage(null)}
        onDelete={handleDelete}
        onReply={activeTab === 'inbox' ? handleReply : undefined}
        isInbox={activeTab === 'inbox'}
      />
    </div>
  );
}
