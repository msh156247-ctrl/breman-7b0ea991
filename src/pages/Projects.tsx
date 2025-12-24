import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Briefcase, Clock, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PROJECT_STATUS, type UserRole } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackToTop } from '@/components/ui/BackToTop';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

// Sample data
const projectsData = [
  {
    id: '1',
    title: 'AI 기반 고객 서비스 챗봇 개발',
    description: 'OpenAI API를 활용한 지능형 고객 응대 챗봇을 개발합니다. 자연어 처리 기반의 맥락 이해와 개인화된 응답 생성이 핵심입니다.',
    client: { name: '테크스타트', avatar: null },
    status: 'open' as const,
    budgetMin: 5000000,
    budgetMax: 8000000,
    timeline: 8,
    skills: ['Python', 'OpenAI', 'React', 'FastAPI'],
    roles: ['horse', 'rooster'] as UserRole[],
    proposals: 5,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'E-commerce 플랫폼 리뉴얼',
    description: '기존 쇼핑몰의 UI/UX 개선 및 성능 최적화. 모바일 퍼스트 접근으로 전환율 향상을 목표로 합니다.',
    client: { name: '쇼핑몰코리아', avatar: null },
    status: 'matched' as const,
    budgetMin: 15000000,
    budgetMax: 20000000,
    timeline: 12,
    skills: ['React', 'Next.js', 'Figma', 'PostgreSQL'],
    roles: ['horse', 'cat', 'rooster'] as UserRole[],
    proposals: 12,
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    title: '헬스케어 앱 보안 강화',
    description: '의료정보 처리 앱의 보안 점검 및 취약점 개선. HIPAA 컴플라이언스 준수 필수.',
    client: { name: '메디테크', avatar: null },
    status: 'in_progress' as const,
    budgetMin: 8000000,
    budgetMax: 12000000,
    timeline: 6,
    skills: ['Security', 'Penetration Testing', 'AWS', 'Node.js'],
    roles: ['dog', 'horse'] as UserRole[],
    proposals: 8,
    createdAt: '2024-01-05',
  },
  {
    id: '4',
    title: '스타트업 브랜딩 및 웹사이트 구축',
    description: '신규 핀테크 스타트업의 브랜드 아이덴티티 개발 및 마케팅 웹사이트 제작.',
    client: { name: '핀테크원', avatar: null },
    status: 'open' as const,
    budgetMin: 3000000,
    budgetMax: 5000000,
    timeline: 4,
    skills: ['Figma', 'Branding', 'React', 'Tailwind'],
    roles: ['cat', 'rooster'] as UserRole[],
    proposals: 3,
    createdAt: '2024-01-18',
  },
  {
    id: '5',
    title: 'IoT 대시보드 개발',
    description: '산업용 IoT 센서 데이터를 실시간으로 모니터링하고 분석하는 대시보드 개발.',
    client: { name: '스마트팩토리', avatar: null },
    status: 'completed' as const,
    budgetMin: 10000000,
    budgetMax: 15000000,
    timeline: 10,
    skills: ['React', 'D3.js', 'MQTT', 'TimescaleDB'],
    roles: ['horse', 'rooster', 'dog'] as UserRole[],
    proposals: 15,
    createdAt: '2023-12-01',
  },
];

function formatBudget(min: number, max: number): string {
  const formatNum = (n: number) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(0)}천만`;
    if (n >= 1000000) return `${(n / 1000000).toFixed(0)}백만`;
    return n.toLocaleString();
  };
  return `₩${formatNum(min)} ~ ${formatNum(max)}`;
}

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = projectsData.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: keyof typeof PROJECT_STATUS) => {
    switch (status) {
      case 'open': return 'success';
      case 'matched': return 'primary';
      case 'in_progress': return 'secondary';
      case 'completed': return 'muted';
      case 'cancelled': return 'destructive';
      default: return 'muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">프로젝트</h1>
            <p className="text-muted-foreground mt-1">진행할 프로젝트를 찾거나 의뢰를 등록하세요</p>
          </div>
          <Link to="/projects/create">
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              프로젝트 의뢰하기
            </Button>
          </Link>
        </div>
      </ScrollReveal>

      {/* Tabs */}
      <ScrollReveal animation="fade-up" delay={100}>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" onClick={() => setStatusFilter('all')}>전체</TabsTrigger>
            <TabsTrigger value="open" onClick={() => setStatusFilter('open')}>모집중</TabsTrigger>
            <TabsTrigger value="matched" onClick={() => setStatusFilter('matched')}>매칭완료</TabsTrigger>
            <TabsTrigger value="in_progress" onClick={() => setStatusFilter('in_progress')}>진행중</TabsTrigger>
            <TabsTrigger value="completed" onClick={() => setStatusFilter('completed')}>완료</TabsTrigger>
          </TabsList>
        </Tabs>
      </ScrollReveal>

      {/* Search */}
      <ScrollReveal animation="fade-up" delay={150}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="프로젝트 또는 기술 스택 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </ScrollReveal>

      {/* Projects list */}
      <div className="space-y-4">
        {filteredProjects.map((project, index) => (
          <ScrollReveal key={project.id} animation="fade-up" delay={200 + index * 50}>
            <Link to={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      {/* Title & Status */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-display font-bold text-lg">{project.title}</h3>
                        <StatusBadge 
                          status={PROJECT_STATUS[project.status].name} 
                          variant={getStatusVariant(project.status)}
                          size="sm"
                        />
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {project.description}
                      </p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {project.skills.map((skill) => (
                          <span 
                            key={skill}
                            className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {/* Required roles */}
                      <div className="flex flex-wrap gap-1.5">
                        {project.roles.map((role, i) => (
                          <RoleBadge key={i} role={role} size="sm" />
                        ))}
                      </div>
                    </div>

                    {/* Right side - Budget, Timeline, Client */}
                    <div className="flex flex-row md:flex-col gap-4 md:gap-3 md:text-right md:min-w-[160px]">
                      <div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground md:justify-end">
                          <DollarSign className="w-4 h-4" />
                          <span>예산</span>
                        </div>
                        <p className="font-medium">{formatBudget(project.budgetMin, project.budgetMax)}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground md:justify-end">
                          <Clock className="w-4 h-4" />
                          <span>기간</span>
                        </div>
                        <p className="font-medium">{project.timeline}주</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground md:justify-end">
                          <Users className="w-4 h-4" />
                          <span>제안</span>
                        </div>
                        <p className="font-medium">{project.proposals}건</p>
                      </div>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={project.client.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-muted">
                          {project.client.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{project.client.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-16">
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
          <p className="text-muted-foreground mb-4">다른 조건으로 검색해보세요</p>
        </div>
      )}

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
