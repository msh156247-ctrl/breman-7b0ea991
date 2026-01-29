import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string | null;
}

interface TeamNotificationsWidgetProps {
  teamId: string;
}

export function TeamNotificationsWidget({ teamId }: TeamNotificationsWidgetProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeamNotifications();
    }
  }, [user, teamId]);

  const fetchTeamNotifications = async () => {
    if (!user) return;
    
    try {
      // Fetch notifications that are related to this team (by link pattern)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .or(`link.ilike.%/teams/${teamId}%,link.ilike.%team_id=${teamId}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching team notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bell className="w-4 h-4" />
            팀 알림
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded-lg" />
            <div className="h-12 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Bell className="w-4 h-4" />
          팀 알림
          {unreadCount > 0 && (
            <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </CardTitle>
        <Link to="/notifications">
          <Button variant="ghost" size="sm" className="text-xs">
            전체 보기 <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <Link
              key={notif.id}
              to={notif.link || '/notifications'}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className={`w-2 h-2 rounded-full mt-2 ${notif.read ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-1">{notif.title}</p>
                {notif.message && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{notif.message}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {notif.created_at && new Date(notif.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            팀 관련 알림이 없습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
}
