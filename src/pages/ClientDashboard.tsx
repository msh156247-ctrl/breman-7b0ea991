import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

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

  // 통계 계산
  const stats = {
    total: myProjects?.length || 0,
    open: myProjects?.filter(p => p.status === 'open').length || 0,
    inProgress: myProjects?.filter(p => p.status === 'in_progress').length || 0,
    completed: myProjects?.filter(p => p.status === 'completed').length || 0,
    totalSpent: myProjects?.reduce((sum, p) => {
      const contract = p.contracts?.[0];
      return sum + (contract?.total_amount || 0);
    }, 0) || 0,
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">의뢰 관리</h1>
          <p className="text-muted-foreground">프로젝트 의뢰 현황을 한눈에 확인하세요</p>
        </div>
        <Button asChild>
          <Link to="/projects/create">
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트 의뢰
          </Link>
        </Button>
      </div>

      {/* 요약 카드 */}
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
            <Button variant="ghost" size="sm" className="p-0 h-auto" asChild>
              <Link to="/projects" className="flex items-center gap-1 text-primary">
                팀 둘러보기 <ArrowRight className="w-4 h-4" />
              </Link>
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

      {/* 프로젝트 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">전체 현황</TabsTrigger>
          <TabsTrigger value="open">모집중</TabsTrigger>
          <TabsTrigger value="in_progress">진행중</TabsTrigger>
          <TabsTrigger value="completed">완료</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ProjectList projects={myProjects || []} getStatusBadge={getStatusBadge} />
        </TabsContent>

        <TabsContent value="open" className="mt-4">
          <ProjectList 
            projects={myProjects?.filter(p => p.status === 'open') || []} 
            getStatusBadge={getStatusBadge} 
          />
        </TabsContent>

        <TabsContent value="in_progress" className="mt-4">
          <ProjectList 
            projects={myProjects?.filter(p => p.status === 'in_progress') || []} 
            getStatusBadge={getStatusBadge} 
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <ProjectList 
            projects={myProjects?.filter(p => p.status === 'completed') || []} 
            getStatusBadge={getStatusBadge} 
          />
        </TabsContent>
      </Tabs>

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
