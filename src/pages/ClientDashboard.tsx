import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  Headphones,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Plus,
  Search,
  Star,
  Loader2,
  Send
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Team {
  id: string;
  name: string;
  emblem_url: string | null;
  rating_avg: number | null;
  avg_level: number | null;
  description: string | null;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // 내 프로젝트 조회
  const { data: myProjects } = useQuery({
    queryKey: ['client-projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_proposals(count),
          contracts(
            id,
            status,
            total_amount,
            escrow_status
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 팀 추천 로드
  useEffect(() => {
    if (activeTab === 'teams' || activeTab === 'request') {
      fetchTeams();
    }
  }, [activeTab]);

  const fetchTeams = async () => {
    if (teams.length > 0) return;
    setTeamsLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, emblem_url, rating_avg, avg_level, description')
        .eq('status', 'active')
        .order('rating_avg', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setTeamsLoading(false);
    }
  };

  // 통계 계산
  const stats = {
    total: myProjects?.length || 0,
    open: myProjects?.filter(p => p.status === 'open').length || 0,
    inProgress: myProjects?.filter(p => p.status === 'in_progress').length || 0,
    completed: myProjects?.filter(p => p.status === 'completed').length || 0,
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      open: { label: '모집중', variant: 'default' },
      negotiating: { label: '협상중', variant: 'secondary' },
      matched: { label: '매칭완료', variant: 'secondary' },
      in_progress: { label: '진행중', variant: 'outline' },
      completed: { label: '완료', variant: 'secondary' },
      cancelled: { label: '취소됨', variant: 'destructive' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <ScrollReveal animation="fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">의뢰 관리</h1>
            <p className="text-muted-foreground">프로젝트를 의뢰하고 진행 현황을 확인하세요</p>
          </div>
          <Button asChild>
            <Link to="/projects/create">
              <Plus className="w-4 h-4 mr-2" />
              새 프로젝트 의뢰
            </Link>
          </Button>
        </div>
      </ScrollReveal>

      {/* 요약 카드 */}
      <ScrollReveal animation="fade-up" delay={50}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">전체 의뢰</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.open}</p>
                  <p className="text-xs text-muted-foreground">팀 모집중</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Clock className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">진행중</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <CheckCircle className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">완료</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollReveal>

      {/* 메인 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="my-projects" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">내 의뢰</span>
            <span className="sm:hidden">의뢰</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">팀 추천</span>
            <span className="sm:hidden">추천</span>
          </TabsTrigger>
          <TabsTrigger value="request" className="gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">의뢰하기</span>
            <span className="sm:hidden">의뢰</span>
          </TabsTrigger>
        </TabsList>

        {/* 내 의뢰 탭 */}
        <TabsContent value="my-projects" className="mt-6 space-y-4">
          {/* 서비스 기능 카드 */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">팀 추천</CardTitle>
                    <CardDescription>AI 기반 팀 매칭</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  스킬, 평점, 응답률을 분석하여 최적의 팀을 추천받으세요
                </p>
                <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={() => setActiveTab('teams')}>
                  <span className="flex items-center gap-1 text-primary">
                    팀 둘러보기 <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary group-hover:bg-secondary/80 transition-colors">
                    <CreditCard className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">에스크로 결제</CardTitle>
                    <CardDescription>안전한 거래 보장</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  마일스톤별 안전 결제로 프로젝트를 안심하고 진행하세요
                </p>
                <Badge variant="outline" className="text-xs">준비중</Badge>
              </CardContent>
            </Card>

            <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
                    <Headphones className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">전담 매니저</CardTitle>
                    <CardDescription>1:1 프로젝트 지원</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  프로젝트 상담부터 완료까지 전담 매니저가 함께합니다
                </p>
                <Badge variant="outline" className="text-xs">준비중</Badge>
              </CardContent>
            </Card>
          </div>

          {/* 프로젝트 목록 */}
          <ProjectList projects={myProjects || []} getStatusBadge={getStatusBadge} />

          {/* 수수료 안내 */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">플랫폼 수수료 안내</h3>
                  <p className="text-sm text-muted-foreground">
                    프로젝트 금액의 <span className="font-bold text-primary">10%</span>가 플랫폼 수수료로 적용됩니다.
                    이 수수료는 안전한 에스크로 결제, 분쟁 해결 지원, 전담 매니저 서비스를 포함합니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 팀 추천 탭 */}
        <TabsContent value="teams" className="mt-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="팀 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teamsLoading ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                추천할 팀이 없습니다
              </div>
            ) : (
              filteredTeams.map((team) => (
                <Card 
                  key={team.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group h-full"
                  onClick={() => navigate(`/teams/${team.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 rounded-lg">
                        <AvatarImage src={team.emblem_url || undefined} />
                        <AvatarFallback className="rounded-lg bg-primary/10">
                          {team.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                          {team.name}
                        </CardTitle>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {team.rating_avg && team.rating_avg > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {team.rating_avg.toFixed(1)}
                            </span>
                          )}
                          {team.avg_level && (
                            <LevelBadge level={team.avg_level} size="sm" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {team.description || '팀 소개가 없습니다'}
                    </p>
                    <div className="mt-4 flex justify-end">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/create?teamId=${team.id}`);
                        }}
                      >
                        제안하기
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* 의뢰하기 탭 */}
        <TabsContent value="request" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>새 프로젝트 의뢰</CardTitle>
              <CardDescription>
                프로젝트를 등록하고 팀들의 제안을 받아보세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card 
                  className="p-6 cursor-pointer hover:shadow-md transition-shadow border-dashed"
                  onClick={() => navigate('/projects/create')}
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">공개 의뢰 등록</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        마켓에 공개하고 다양한 팀의 제안을 받아보세요
                      </p>
                    </div>
                  </div>
                </Card>

                <Card 
                  className="p-6 cursor-pointer hover:shadow-md transition-shadow border-dashed"
                  onClick={() => setActiveTab('teams')}
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-4 rounded-full bg-secondary/50">
                      <Users className="w-8 h-8 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">팀에 직접 제안</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        원하는 팀을 선택해 직접 프로젝트를 제안하세요
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 프로젝트 리스트 컴포넌트
function ProjectList({ 
  projects, 
  getStatusBadge 
}: { 
  projects: any[]; 
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">등록된 프로젝트가 없습니다</p>
          <Button asChild className="mt-4">
            <Link to="/projects/create">첫 프로젝트 의뢰하기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <Card key={project.id} className="hover:shadow-md transition-shadow">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link 
                    to={`/projects/${project.id}`}
                    className="font-medium hover:text-primary truncate"
                  >
                    {project.title}
                  </Link>
                  {getStatusBadge(project.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    예산: {project.budget_min?.toLocaleString()}~{project.budget_max?.toLocaleString()}원
                  </span>
                  {project.project_proposals?.[0]?.count > 0 && (
                    <span className="text-primary">
                      제안 {project.project_proposals[0].count}건
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/projects/${project.id}`}>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
