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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Reply, Trash2, Mail } from 'lucide-react';
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
  sender?: { name: string; avatar_url: string | null };
  recipient?: { name: string; avatar_url: string | null };
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

  if (!message) return null;

  const otherUser = isInbox ? message.sender : message.recipient;

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
          <p className="font-medium">{isInbox ? '보낸 사람' : '받는 사람'}: {otherUser?.name || '알 수 없음'}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'yyyy년 M월 d일 a h:mm', { locale: ko })}
          </p>
        </div>
      </div>

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
