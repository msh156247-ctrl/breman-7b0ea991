import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Users, 
  Briefcase, 
  Target, 
  Swords, 
  Info, 
  CheckCheck,
  Filter,
  Inbox
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Notification = Tables<'notifications'>;
type NotificationType = 'team_invite' | 'application' | 'project_match' | 'milestone' | 'siege' | 'system';

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

const notificationTypeLabels: Record<NotificationType, string> = {
  team_invite: '팀 초대',
  application: '지원',
  project_match: '프로젝트 매칭',
  milestone: '마일스톤',
  siege: 'Siege',
  system: '시스템',
};

function NotificationCard({ 
  notification, 
  onRead 
}: { 
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const Icon = notificationIcons[notification.type || 'system'] || Info;
  const colorClass = notificationColors[notification.type || 'system'] || notificationColors.system;
  const typeLabel = notificationTypeLabels[(notification.type as NotificationType) || 'system'];

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  const content = (
    <Card 
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        notification.read ? 'opacity-60' : 'border-primary/20 bg-primary/5'
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', colorClass)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    colorClass
                  )}>
                    {typeLabel}
                  </span>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <h3 className={cn(
                  'text-sm',
                  !notification.read && 'font-semibold'
                )}>
                  {notification.title}
                </h3>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {notification.created_at && format(new Date(notification.created_at), 'MM/dd HH:mm')}
              </span>
            </div>
            {notification.message && (
              <p className="text-sm text-muted-foreground mt-1">
                {notification.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true,
                locale: ko 
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
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

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (readFilter === 'unread') {
        query = query.eq('read', false);
      } else if (readFilter === 'read') {
        query = query.eq('read', true);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter as NotificationType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, readFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-page-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">알림</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount}개의 읽지 않은 알림` : '모든 알림을 확인했습니다'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="gap-2">
            <CheckCheck className="w-4 h-4" />
            모두 읽음 처리
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Tabs value={readFilter} onValueChange={(v) => setReadFilter(v as typeof readFilter)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="unread">읽지 않음</TabsTrigger>
                <TabsTrigger value="read">읽음</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="알림 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 유형</SelectItem>
                  <SelectItem value="team_invite">팀 초대</SelectItem>
                  <SelectItem value="application">지원</SelectItem>
                  <SelectItem value="project_match">프로젝트 매칭</SelectItem>
                  <SelectItem value="milestone">마일스톤</SelectItem>
                  <SelectItem value="siege">Siege</SelectItem>
                  <SelectItem value="system">시스템</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">알림을 불러오는 중...</p>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Inbox className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-1">알림이 없습니다</h3>
              <p className="text-muted-foreground text-sm">
                {readFilter !== 'all' || typeFilter !== 'all' 
                  ? '필터 조건에 맞는 알림이 없습니다' 
                  : '새로운 알림이 오면 여기에 표시됩니다'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard 
              key={notification.id} 
              notification={notification}
              onRead={markAsRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
