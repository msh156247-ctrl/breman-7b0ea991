import { cn } from '@/lib/utils';

interface TypingUser {
  user_id: string;
  user_name: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].user_name}님이 입력 중...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].user_name}님, ${typingUsers[1].user_name}님이 입력 중...`;
    } else {
      return `${typingUsers[0].user_name}님 외 ${typingUsers.length - 1}명이 입력 중...`;
    }
  };

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground', className)}>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}
