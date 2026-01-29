import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getTeamEmblem } from '@/lib/avatarUtils';
import { cn } from '@/lib/utils';

interface TeamAvatarProps {
  teamId: string;
  emblemUrl?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Team avatar component with automatic random fallback
 * Supports: uploaded images, emojis, or auto-generated random avatars
 */
export function TeamAvatar({ 
  teamId, 
  emblemUrl, 
  name, 
  className,
  fallbackClassName 
}: TeamAvatarProps) {
  const emblem = getTeamEmblem(emblemUrl, teamId);
  const fallbackInitial = name?.[0]?.toUpperCase() || 'T';

  return (
    <Avatar className={cn(className)}>
      {emblem.type === 'image' || emblem.type === 'random' ? (
        <AvatarImage src={emblem.value} alt={name || 'Team'} />
      ) : null}
      <AvatarFallback className={cn('bg-muted text-lg', fallbackClassName)}>
        {emblem.type === 'emoji' ? emblem.value : fallbackInitial}
      </AvatarFallback>
    </Avatar>
  );
}
