import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Pin, Trash2, MoreVertical, PinOff, Paperclip, X, FileIcon, ImageIcon, FileText, Download, Search, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TeamMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  attachments: string[] | null;
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter((file) => {
      if (file.size > maxFileSize) {
        toast({
          title: '파일 크기 초과',
          description: `${file.name}의 크기가 10MB를 초과합니다.`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 5));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (selectedFiles.length === 0 || !user) return [];

    const uploadedUrls: string[] = [];
    setIsUploading(true);

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${teamId}/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('team-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('team-attachments')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: '업로드 실패',
        description: '파일을 업로드할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }

    return uploadedUrls;
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !user) return;

    setIsSending(true);
    try {
      const attachmentUrls = await uploadFiles();

      const { error } = await supabase.from('team_messages').insert({
        team_id: teamId,
        user_id: user.id,
        content: newMessage.trim(),
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
      });

      if (error) throw error;
      setNewMessage('');
      setSelectedFiles([]);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isMember) {
    return (
      <Card className="bg-muted/30 border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">팀원만 채팅을 이용할 수 있습니다</p>
          <p className="text-sm text-muted-foreground mt-1">팀에 가입하여 멤버들과 소통하세요</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter messages based on search query
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.content.toLowerCase().includes(query) ||
      m.user?.name.toLowerCase().includes(query)
    );
  });

  const pinnedMessages = filteredMessages.filter((m) => m.is_pinned);

  // Group messages by date
  const groupMessagesByDate = (msgs: TeamMessage[]) => {
    const groups: { date: string; messages: TeamMessage[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      let dateLabel: string;

      if (isToday(msgDate)) {
        dateLabel = '오늘';
      } else if (isYesterday(msgDate)) {
        dateLabel = '어제';
      } else {
        dateLabel = format(msgDate, 'yyyy년 M월 d일', { locale: ko });
      }

      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        groups.push({ date: dateLabel, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(filteredMessages);

  return (
    <div className="flex flex-col h-[600px] bg-gradient-to-b from-background to-muted/20 rounded-2xl overflow-hidden border shadow-lg">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">팀 채팅</h3>
            <p className="text-xs text-muted-foreground">{messages.length}개의 메시지</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isSearchOpen ? (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
              <Input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-40 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 bg-primary/5 border-b flex items-center gap-2 text-sm">
          <Pin className="w-4 h-4 text-primary" />
          <span className="font-medium text-primary">{pinnedMessages.length}개의 고정 메시지</span>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messageGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">아직 메시지가 없습니다</p>
            <p className="text-xs">첫 번째 메시지를 보내보세요!</p>
          </div>
        ) : (
          messageGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-3">
              {/* Date Divider */}
              <div className="flex items-center justify-center">
                <span className="px-3 py-1 text-xs text-muted-foreground bg-muted/50 rounded-full">
                  {group.date}
                </span>
              </div>
              {/* Messages */}
              {group.messages.map((message, msgIdx) => {
                const isOwn = message.user_id === user?.id;
                const showAvatar = msgIdx === 0 ||
                  group.messages[msgIdx - 1]?.user_id !== message.user_id;

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    isLeader={isLeader}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDeleteMessage}
                  />
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2 border-t bg-background/50">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-xs"
              >
                <FileIcon className="w-3 h-3" />
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button
                  onClick={() => removeSelectedFile(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 bg-background/80 backdrop-blur-sm border-t">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={selectedFiles.length >= 5 || isSending}
            className="h-10 w-10 rounded-full flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder="메시지 입력..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-full pr-12 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending || isUploading}
            size="icon"
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: TeamMessage;
  isOwn: boolean;
  showAvatar: boolean;
  isLeader: boolean;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
}

function getFileIcon(url: string) {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4" />;
  }
  if (['pdf'].includes(ext)) {
    return <FileText className="w-4 h-4" />;
  }
  return <FileIcon className="w-4 h-4" />;
}

function getFileName(url: string) {
  const parts = url.split('/');
  const fullName = parts[parts.length - 1];
  const nameParts = fullName.split('_');
  if (nameParts.length > 2) {
    return nameParts.slice(2).join('_');
  }
  return fullName;
}

function isImageFile(url: string) {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}

function MessageBubble({ message, isOwn, showAvatar, isLeader, onTogglePin, onDelete }: MessageBubbleProps) {
  const userName = message.user?.name || '알 수 없음';
  const userInitial = userName.charAt(0).toUpperCase();
  const timeStr = format(new Date(message.created_at), 'HH:mm');

  return (
    <div className={cn(
      'flex gap-2 group',
      isOwn ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className="w-8 flex-shrink-0">
        {!isOwn && showAvatar && (
          <Avatar className="w-8 h-8">
            {message.user?.avatar_url ? (
              <AvatarImage src={message.user.avatar_url} alt={userName} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-xs font-medium">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex flex-col max-w-[70%]',
        isOwn ? 'items-end' : 'items-start'
      )}>
        {/* Name (only for others) */}
        {!isOwn && showAvatar && (
          <span className="text-xs text-muted-foreground mb-1 ml-1">{userName}</span>
        )}

        <div className={cn(
          'flex items-end gap-1.5',
          isOwn ? 'flex-row-reverse' : 'flex-row'
        )}>
          {/* Bubble */}
          <div className={cn(
            'relative px-3 py-2 rounded-2xl text-sm',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm',
            message.is_pinned && 'ring-2 ring-primary/50'
          )}>
            {message.is_pinned && (
              <Pin className="absolute -top-1 -right-1 w-3 h-3 text-primary" />
            )}
            {message.content && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.filter(isImageFile).map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={url}
                      alt="첨부 이미지"
                      className="max-w-[200px] max-h-[150px] rounded-lg object-cover hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
                {message.attachments.filter((url) => !isImageFile(url)).map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity',
                      isOwn ? 'bg-primary-foreground/20' : 'bg-background/50'
                    )}
                  >
                    {getFileIcon(url)}
                    <span className="max-w-[120px] truncate">{getFileName(url)}</span>
                    <Download className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Time & Actions */}
          <div className={cn(
            'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}>
            <span className="text-[10px] text-muted-foreground">{timeStr}</span>
            {(isOwn || isLeader) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-32">
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
                          고정
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
        </div>

        {/* Read indicator (for own messages) */}
        {isOwn && (
          <div className="flex items-center gap-0.5 mt-0.5 mr-1">
            <CheckCheck className="w-3 h-3 text-primary/70" />
          </div>
        )}
      </div>
    </div>
  );
}
