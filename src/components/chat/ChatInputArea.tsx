import { RefObject } from 'react';
import { ChatAttachments } from './ChatAttachments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputAreaProps {
  inputRef: RefObject<HTMLInputElement>;
  newMessage: string;
  setNewMessage: (message: string) => void;
  sending: boolean;
  userId: string;
  onSendMessage: (attachmentUrls: string[]) => Promise<void>;
}

export function ChatInputArea({
  inputRef,
  newMessage,
  setNewMessage,
  sending,
  userId,
  onSendMessage,
}: ChatInputAreaProps) {
  const {
    attachments,
    uploading,
    uploadAttachments,
    AttachmentButton,
    AttachmentPreview,
  } = ChatAttachments({
    userId,
    onAttachmentsChange: () => {},
    disabled: sending,
  });

  const handleSend = async () => {
    const hasContent = newMessage.trim();
    const hasAttachments = attachments.length > 0;

    if (!hasContent && !hasAttachments) return;

    let attachmentUrls: string[] = [];
    if (hasAttachments) {
      attachmentUrls = await uploadAttachments();
      if (attachmentUrls.length === 0 && !hasContent) return;
    }

    await onSendMessage(attachmentUrls);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background">
      {AttachmentPreview}
      <div className="flex items-center gap-2 p-4">
        {AttachmentButton}
        <Input
          ref={inputRef}
          placeholder="메시지를 입력하세요..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending || uploading}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!newMessage.trim() && attachments.length === 0) || sending || uploading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
