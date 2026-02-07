import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Search, Send, Loader2, X, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MessageComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId?: string;
  recipientName?: string;
  defaultSubject?: string;
  onSent?: () => void;
}

interface UserResult {
  id: string;
  name: string;
  avatar_url: string | null;
  email: string;
}

export function MessageComposeDialog({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  defaultSubject,
  onSent,
}: MessageComposeDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [recipient, setRecipient] = useState<UserResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  // Set recipient if provided
  useEffect(() => {
    if (open && recipientId && recipientName) {
      setRecipient({ id: recipientId, name: recipientName, avatar_url: null, email: '' });
      setShowSearch(false);
    } else if (open && !recipientId) {
      setShowSearch(true);
      setRecipient(null);
    }
    if (open && defaultSubject) {
      setSubject(defaultSubject);
    }
  }, [open, recipientId, recipientName, defaultSubject]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setRecipient(null);
      setSearchQuery('');
      setSearchResults([]);
      setSubject('');
      setContent('');
      setShowSearch(false);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, email')
        .neq('id', user.id)
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectRecipient = (u: UserResult) => {
    setRecipient(u);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!recipient || !content.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipient.id,
          subject: subject.trim(),
          content: content.trim(),
        });

      if (error) throw error;

      toast.success('쪽지를 보냈습니다');
      onSent?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('쪽지 전송에 실패했습니다');
    } finally {
      setSending(false);
    }
  };

  const formContent = (
    <div className="flex flex-col gap-4">
      {/* Recipient */}
      <div className="space-y-2">
        <Label>받는 사람</Label>
        {recipient && !showSearch ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
            <Avatar className="h-8 w-8">
              <AvatarImage src={recipient.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-sm">
                {recipient.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium flex-1">{recipient.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => { setRecipient(null); setShowSearch(true); }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="이름 또는 이메일로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                autoFocus
              />
              <Button size="icon" onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-1">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleSelectRecipient(u)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-sm">
                          {u.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : searchQuery && !searching ? (
              <p className="text-sm text-muted-foreground text-center py-2">검색 결과가 없습니다</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label>제목 (선택)</Label>
        <Input
          placeholder="제목을 입력하세요"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label>내용</Label>
        <Textarea
          placeholder="쪽지 내용을 입력하세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
        />
      </div>

      {/* Send button */}
      <Button
        onClick={handleSend}
        disabled={!recipient || !content.trim() || sending}
        className="w-full"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        보내기
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              쪽지 쓰기
            </DrawerTitle>
            <DrawerDescription>
              회원에게 개인 메시지를 보냅니다
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            쪽지 쓰기
          </DialogTitle>
          <DialogDescription>
            회원에게 개인 메시지를 보냅니다
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
