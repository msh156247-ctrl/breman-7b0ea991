import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Activity, Users, Megaphone, Shield, TrendingUp, Crown, Wifi, Mail, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ActionStats {
  total: number;
  byType: Record<string, number>;
  byAction: Record<string, number>;
}

interface AdminStats {
  admin_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  action_count: number;
}

interface DailyActivity {
  date: string;
  count: number;
}

const ACTION_COLORS: Record<string, string> = {
  user: '#3b82f6',
  announcement: '#f59e0b',
  role: '#ef4444',
  settings: '#8b5cf6',
};

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899'];

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [sendingReport, setSendingReport] = useState<'daily' | 'weekly' | null>(null);
  const [actionStats, setActionStats] = useState<ActionStats>({ total: 0, byType: {}, byAction: {} });
  const [topAdmins, setTopAdmins] = useState<AdminStats[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [recentActions, setRecentActions] = useState<{ action: string; target_type: string; created_at: string }[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    // Set up realtime subscription for dashboard updates
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          const newLog = payload.new as {
            action: string;
            target_type: string;
            created_at: string;
            admin_id: string | null;
          };

          // Update stats
          setActionStats(prev => ({
            total: prev.total + 1,
            byType: {
              ...prev.byType,
              [newLog.target_type]: (prev.byType[newLog.target_type] || 0) + 1,
            },
            byAction: {
              ...prev.byAction,
              [newLog.action]: (prev.byAction[newLog.action] || 0) + 1,
            },
          }));

          // Update recent actions
          setRecentActions(prev => [
            { action: newLog.action, target_type: newLog.target_type, created_at: newLog.created_at },
            ...prev.slice(0, 4),
          ]);

          // Update daily activity for today
          const today = format(new Date(), 'MM/dd', { locale: ko });
          setDailyActivity(prev => 
            prev.map(day => 
              day.date === today ? { ...day, count: day.count + 1 } : day
            )
          );
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all activity logs
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate action stats
      const byType: Record<string, number> = {};
      const byAction: Record<string, number> = {};
      
      (logs || []).forEach(log => {
        byType[log.target_type] = (byType[log.target_type] || 0) + 1;
        byAction[log.action] = (byAction[log.action] || 0) + 1;
      });

      setActionStats({
        total: logs?.length || 0,
        byType,
        byAction,
      });

      // Calculate top admins
      const adminCounts: Record<string, number> = {};
      (logs || []).forEach(log => {
        if (log.admin_id) {
          adminCounts[log.admin_id] = (adminCounts[log.admin_id] || 0) + 1;
        }
      });

      const adminIds = Object.keys(adminCounts);
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .in('id', adminIds);

        const adminsWithStats: AdminStats[] = (profiles || []).map(profile => ({
          admin_id: profile.id,
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          action_count: adminCounts[profile.id] || 0,
        }));

        adminsWithStats.sort((a, b) => b.action_count - a.action_count);
        setTopAdmins(adminsWithStats.slice(0, 5));
      }

      // Calculate daily activity for last 7 days
      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      const dailyCounts: Record<string, number> = {};
      last7Days.forEach(day => {
        dailyCounts[format(day, 'yyyy-MM-dd')] = 0;
      });

      (logs || []).forEach(log => {
        const dateKey = format(new Date(log.created_at), 'yyyy-MM-dd');
        if (dailyCounts[dateKey] !== undefined) {
          dailyCounts[dateKey]++;
        }
      });

      const dailyData = last7Days.map(day => ({
        date: format(day, 'MM/dd', { locale: ko }),
        count: dailyCounts[format(day, 'yyyy-MM-dd')] || 0,
      }));

      setDailyActivity(dailyData);

      // Recent actions (last 5)
      setRecentActions((logs || []).slice(0, 5).map(log => ({
        action: log.action,
        target_type: log.target_type,
        created_at: log.created_at,
      })));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('대시보드 데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'role_change': '역할 변경',
      'verify_user': '사용자 인증',
      'unverify_user': '인증 해제',
      'create_announcement': '공지 생성',
      'update_announcement': '공지 수정',
      'delete_announcement': '공지 삭제',
      'toggle_announcement': '공지 상태 변경',
    };
    return labels[action] || action;
  };

  const getTargetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'user': '사용자',
      'announcement': '공지사항',
      'role': '역할',
    };
    return labels[type] || type;
  };

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      case 'role':
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const handleSendReport = async (reportType: 'daily' | 'weekly') => {
    setSendingReport(reportType);
    try {
      const { error } = await supabase.functions.invoke('send-activity-report', {
        body: { report_type: reportType },
      });

      if (error) throw error;
      toast.success(`${reportType === 'daily' ? '일일' : '주간'} 보고서가 모든 관리자에게 발송되었습니다`);
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error('보고서 발송에 실패했습니다');
    } finally {
      setSendingReport(null);
    }
  };

  const pieData = Object.entries(actionStats.byType).map(([name, value]) => ({
    name: getTargetTypeLabel(name),
    value,
  }));

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRealtimeConnected && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              <Wifi className="h-3 w-3 mr-1" />
              실시간 연결됨
            </Badge>
          )}
          {isRealtimeConnected && (
            <span className="text-sm text-muted-foreground">대시보드가 자동으로 업데이트됩니다</span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={sendingReport !== null}>
              {sendingReport ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              보고서 발송
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSendReport('daily')} disabled={sendingReport !== null}>
              일일 보고서 발송
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSendReport('weekly')} disabled={sendingReport !== null}>
              주간 보고서 발송
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 활동</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionStats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">전체 관리자 활동 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용자 관련</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(actionStats.byType['user'] || 0) + (actionStats.byType['role'] || 0)}</div>
            <p className="text-xs text-muted-foreground">사용자 및 역할 변경</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">공지사항</CardTitle>
            <Megaphone className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionStats.byType['announcement'] || 0}</div>
            <p className="text-xs text-muted-foreground">공지사항 관리 작업</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 관리자</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topAdmins.length}</div>
            <p className="text-xs text-muted-foreground">활동 기록이 있는 관리자</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              최근 7일 활동 추이
            </CardTitle>
            <CardDescription>일별 관리자 활동 수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActivity}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}건`, '활동']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Action Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              활동 유형 분포
            </CardTitle>
            <CardDescription>대상 유형별 활동 비율</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}건`, '활동']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Admins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              가장 활발한 관리자
            </CardTitle>
            <CardDescription>활동 수 기준 상위 5명</CardDescription>
          </CardHeader>
          <CardContent>
            {topAdmins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                활동 기록이 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {topAdmins.map((admin, index) => (
                  <div key={admin.admin_id} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-6 text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={admin.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {admin.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{admin.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
                    </div>
                    <Badge variant="secondary">{admin.action_count}건</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              최근 활동
            </CardTitle>
            <CardDescription>가장 최근 5개 활동</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                활동 기록이 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {recentActions.map((action, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getTargetTypeIcon(action.target_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{getActionLabel(action.action)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(action.created_at), 'MM월 dd일 HH:mm', { locale: ko })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getTargetTypeLabel(action.target_type)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
