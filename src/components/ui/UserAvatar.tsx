import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarWithFallback } from '@/lib/avatarUtils';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string;
  avatarUrl?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

/**
 * User avatar component with automatic random fallback
 * Uses DiceBear API when no avatar is uploaded
 */
export function UserAvatar({ 
  userId, 
  avatarUrl, 
  name, 
  className,
  fallbackClassName 
}: UserAvatarProps) {
  const avatarSrc = getAvatarWithFallback(avatarUrl, userId, 'user');
  const fallbackInitial = name?.[0]?.toUpperCase() || 'U';

  return (
    <Avatar className={cn(className)}>
      <AvatarImage src={avatarSrc} alt={name || 'User'} />
      <AvatarFallback className={cn('bg-muted', fallbackClassName)}>
        {fallbackInitial}
      </AvatarFallback>
    </Avatar>
  );
}
