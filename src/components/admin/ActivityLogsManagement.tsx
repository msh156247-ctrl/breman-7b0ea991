import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Activity, Search, RefreshCw, User, Settings, Megaphone, Shield, Download, Calendar, X, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';

interface ActivityLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_profile?: {
    name: string;
    email: string;
  } | null;
}

const PAGE_SIZE = 50;

export function ActivityLogsManagement() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    fetchLogs(true);
  }, []);

  const fetchLogs = async (reset: boolean = false) => {
    try {
      const offset = reset ? 0 : logs.length;
      
      // Get total count first (only on initial load or refresh)
      if (reset) {
        const { count } = await supabase
          .from('activity_logs')
          .select('*', { count: 'exact', head: true });
        setTotalCount(count);
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      // Check if there are more records
      setHasMore((data?.length || 0) === PAGE_SIZE);

      // Fetch admin profiles for each log
      const adminIds = [...new Set((data || []).map(log => log.admin_id).filter(Boolean))];
      
      let profiles: Record<string, { name: string; email: string }> = {};
      if (adminIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', adminIds);
        
        if (profileData) {
          profiles = profileData.reduce((acc, p) => ({
            ...acc,
            [p.id]: { name: p.name, email: p.email }
          }), {});
        }
      }

      const logsWithProfiles: ActivityLog[] = (data || []).map(log => ({
        id: log.id,
        admin_id: log.admin_id,
        action: log.action,
        target_type: log.target_type,
        target_id: log.target_id,
        details: log.details as Record<string, unknown> | null,
        created_at: log.created_at,
        admin_profile: log.admin_id ? profiles[log.admin_id] : null
      }));

      if (reset) {
        setLogs(logsWithProfiles);
      } else {
        setLogs(prev => [...prev, ...logsWithProfiles]);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error('활동 로그를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchLogs(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs(true);
    setRefreshing(false);
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('내보낼 로그가 없습니다');
      return;
    }

    const headers = ['날짜', '관리자', '이메일', '작업', '대상 유형', '대상 ID', '세부 정보'];
    
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.admin_profile?.name || '알 수 없음',
      log.admin_profile?.email || 'N/A',
      getActionLabel(log.action),
      getTargetTypeLabel(log.target_type),
      log.target_id || '',
      log.details ? JSON.stringify(log.details) : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('CSV 파일이 다운로드되었습니다');
  };

  const getActionIcon = (targetType: string) => {
    switch (targetType) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      case 'role':
        return <Shield className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) {
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
    if (action.includes('delete') || action.includes('remove')) {
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
    if (action.includes('update') || action.includes('change')) {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
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

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin_profile?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin_profile?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || log.target_type === filterType;

    const logDate = new Date(log.created_at);
    let matchesDateRange = true;
    
    if (startDate && endDate) {
      matchesDateRange = isWithinInterval(logDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate),
      });
    } else if (startDate) {
      matchesDateRange = logDate >= startOfDay(startDate);
    } else if (endDate) {
      matchesDateRange = logDate <= endOfDay(endDate);
    }
    
    return matchesSearch && matchesFilter && matchesDateRange;
  });

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            활동 로그
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              활동 로그
            </CardTitle>
            <CardDescription>
              {totalCount !== null ? (
                <>총 {totalCount.toLocaleString()}개 중 {logs.length.toLocaleString()}개 로드됨</>
              ) : (
                '관리자 활동 내역'
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredLogs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              CSV 내보내기
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="유형 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="user">사용자</SelectItem>
              <SelectItem value="announcement">공지사항</SelectItem>
              <SelectItem value="role">역할</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg border bg-muted/30">
          <div className="space-y-2">
            <Label className="text-sm">시작일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'yyyy-MM-dd') : '선택...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">종료일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'yyyy-MM-dd') : '선택...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={clearDateFilter} className="h-10">
              <X className="h-4 w-4 mr-1" />
              초기화
            </Button>
          )}
          {(startDate || endDate) && (
            <div className="text-sm text-muted-foreground ml-auto">
              {filteredLogs.length}개 결과
            </div>
          )}
        </div>

        {/* Logs List */}
        <ScrollArea className="h-[500px] pr-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>활동 로그가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getActionIcon(log.target_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getActionColor(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getTargetTypeLabel(log.target_type)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium">
                          {log.admin_profile?.name || '알 수 없는 관리자'}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          ({log.admin_profile?.email || 'N/A'})
                        </span>
                      </div>
                      {log.details && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {Object.entries(log.details).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              <span className="font-medium">{key}:</span>{' '}
                              {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(log.created_at), 'yyyy년 MM월 dd일 HH:mm:ss', { locale: ko })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Load More Button */}
              {hasMore && !searchQuery && filterType === 'all' && !startDate && !endDate && (
                <div className="pt-4 pb-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        로딩 중...
                      </>
                    ) : (
                      <>더 불러오기 ({PAGE_SIZE}개)</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
