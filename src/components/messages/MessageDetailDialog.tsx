import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Reply, Trash2, Mail, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  is_cc?: boolean;
  group_id?: string | null;
  sender?: { name: string; avatar_url: string | null };
  recipient?: { name: string; avatar_url: string | null };
}

interface GroupRecipient {
  name: string;
  avatar_url: string | null;
  is_cc: boolean;
}

interface MessageDetailDialogProps {
  message: DirectMessage | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onReply?: (msg: DirectMessage) => void;
  isInbox: boolean;
}

export function MessageDetailDialog({
  message,
  onClose,
  onDelete,
  onReply,
  isInbox,
}: MessageDetailDialogProps) {
  const isMobile = useIsMobile();
  const [groupRecipients, setGroupRecipients] = useState<GroupRecipient[]>([]);

  useEffect(() => {
    if (!message) {
      setGroupRecipients([]);
      return;
    }

    // For sent messages with group_id, fetch all recipients in the group
    if (!isInbox && message.group_id) {
      fetchGroupRecipients(message.group_id);
    } else {
      setGroupRecipients([]);
    }
  }, [message, isInbox]);

  const fetchGroupRecipients = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('recipient_id, is_cc')
        .eq('group_id', groupId);

      if (error || !data) return;

      const recipientIds = [...new Set(data.map(d => d.recipient_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', recipientIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const recipients: GroupRecipient[] = data.map(d => ({
        name: profileMap.get(d.recipient_id)?.name || '알 수 없음',
        avatar_url: profileMap.get(d.recipient_id)?.avatar_url || null,
        is_cc: d.is_cc ?? false,
      }));

      // Deduplicate by name
      const seen = new Set<string>();
      setGroupRecipients(recipients.filter(r => {
        if (seen.has(r.name)) return false;
        seen.add(r.name);
        return true;
      }));
    } catch (e) {
      console.error('Error fetching group recipients:', e);
    }
  };

  if (!message) return null;

  const otherUser = isInbox ? message.sender : message.recipient;
  const toRecipients = groupRecipients.filter(r => !r.is_cc);
  const ccRecipients = groupRecipients.filter(r => r.is_cc);

  const detailContent = (
    <div className="flex flex-col gap-4">
      {/* Sender/Recipient info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10">
            {otherUser?.name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {isInbox ? '보낸 사람' : '받는 사람'}: {otherUser?.name || '알 수 없음'}
            {isInbox && message.is_cc && (
              <Badge variant="outline" className="ml-2 text-[10px]">참조</Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'yyyy년 M월 d일 a h:mm', { locale: ko })}
          </p>
        </div>
      </div>

      {/* Group recipients (sent messages) */}
      {!isInbox && groupRecipients.length > 1 && (
        <div className="space-y-2 bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>전체 수신자 ({groupRecipients.length}명)</span>
          </div>
          {toRecipients.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-muted-foreground mr-1 self-center">받는 사람:</span>
              {toRecipients.map((r, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1 py-0.5">
                  <Avatar className="h-3.5 w-3.5">
                    <AvatarImage src={r.avatar_url || undefined} />
                    <AvatarFallback className="text-[6px]">{r.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {r.name}
                </Badge>
              ))}
            </div>
          )}
          {ccRecipients.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-muted-foreground mr-1 self-center">참조:</span>
              {ccRecipients.map((r, i) => (
                <Badge key={i} variant="outline" className="text-[10px] gap-1 py-0.5">
                  <Avatar className="h-3.5 w-3.5">
                    <AvatarImage src={r.avatar_url || undefined} />
                    <AvatarFallback className="text-[6px]">{r.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {r.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {message.subject && (
        <>
          <Separator />
          <p className="font-semibold">{message.subject}</p>
        </>
      )}

      <Separator />

      {/* Content */}
      <ScrollArea className="max-h-[300px]">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </ScrollArea>

      {/* Actions */}
      <Separator />
      <div className="flex items-center gap-2">
        {isInbox && onReply && (
          <Button variant="outline" onClick={() => onReply(message)} className="flex-1">
            <Reply className="h-4 w-4 mr-2" />
            답장
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => onDelete(message.id)}
          className="text-destructive hover:text-destructive flex-1"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          삭제
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={!!message} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              쪽지 상세
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {detailContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!message} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            쪽지 상세
          </DialogTitle>
        </DialogHeader>
        {detailContent}
      </DialogContent>
    </Dialog>
  );
}
