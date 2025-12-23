import { Link } from 'react-router-dom';
import { Bell, Users, Briefcase, Target, Swords, Info, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

const notificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  team_invite: Users,
  application: Users,
  project_match: Briefcase,
  milestone: Target,
  siege: Swords,
  system: Info,
};

const notificationColors: Record<string, string> = {
  team_invite: 'bg-primary/10 text-primary',
  application: 'bg-success/10 text-success',
  project_match: 'bg-secondary/10 text-secondary',
  milestone: 'bg-accent/10 text-accent',
  siege: 'bg-destructive/10 text-destructive',
  system: 'bg-muted text-muted-foreground',
};

function NotificationItem({ 
  notification, 
  onRead 
}: { 
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const Icon = notificationIcons[notification.type || 'system'] || Info;
  const colorClass = notificationColors[notification.type || 'system'] || notificationColors.system;

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  const content = (
    <div 
      className={cn(
        'flex gap-3 p-3 rounded-lg transition-colors cursor-pointer',
        notification.read 
          ? 'opacity-60 hover:opacity-80' 
          : 'bg-muted/50 hover:bg-muted'
      )}
      onClick={handleClick}
    >
      <div className={cn('flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center', colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm truncate',
          !notification.read && 'font-medium'
        )}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { 
            addSuffix: true,
            locale: ko 
          })}
        </p>
      </div>
      {!notification.read && (
        <div className="flex-shrink-0 w-2 h-2 mt-2 bg-primary rounded-full" />
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link to={notification.link}>
        {content}
      </Link>
    );
  }

  return content;
}

export function NotificationsDropdown() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-xs font-medium rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs gap-1"
              onClick={markAllAsRead}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              모두 읽음
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              로딩 중...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">알림이 없습니다</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification}
                  onRead={markAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
              <Link to="/notifications">모든 알림 보기</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
