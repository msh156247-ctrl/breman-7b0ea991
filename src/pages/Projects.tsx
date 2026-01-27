import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Briefcase, Clock, DollarSign, Users, Loader2, ArrowUpDown, Timer, Sparkles } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PROJECT_STATUS, ANIMAL_SKINS, type UserRole, type AnimalSkin } from '@/lib/constants';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackToTop } from '@/components/ui/BackToTop';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProjectWithClient {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  status: 'open' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  budget_min: number | null;
  budget_max: number | null;
  timeline_weeks: number | null;
  required_skills: string[] | null;
  required_roles: UserRole[] | null;
  preferred_animal_skins: AnimalSkin[] | null;
  created_at: string | null;
  deadline: string | null;
  client?: {
    name: string;
    avatar_url: string | null;
  };
  proposalCount: number;
}

function formatDeadline(deadline: string | null): { text: string; urgent: boolean; expired: boolean } | null {
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  
  if (isPast(deadlineDate)) {
    return { text: '마감됨', urgent: false, expired: true };
  }
  
  const daysLeft = differenceInDays(deadlineDate, now);
  
  if (daysLeft <= 1) {
    return { text: formatDistanceToNow(deadlineDate, { addSuffix: true, locale: ko }), urgent: true, expired: false };
  }
  
  if (daysLeft <= 3) {
    return { text: `${daysLeft}일 남음`, urgent: true, expired: false };
  }
  
  return { text: `${daysLeft}일 남음`, urgent: false, expired: false };
}

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return '협의';
  const formatNum = (n: number) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(0)}천만`;
    if (n >= 1000000) return `${(n / 1000000).toFixed(0)}백만`;
    return n.toLocaleString();
  };
  if (min && max) return `₩${formatNum(min)} ~ ${formatNum(max)}`;
  if (min) return `₩${formatNum(min)} 이상`;
  if (max) return `₩${formatNum(max)} 이하`;
  return '협의';
}

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [animalSkinFilter, setAnimalSkinFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with client data and proposal counts
      const enrichedProjects = await Promise.all(
        (projectsData || []).map(async (project) => {
          // Get client info
          let client = undefined;
          if (project.client_id) {
            const { data: clientData } = await supabase
              .from('public_profiles')
              .select('name, avatar_url')
              .eq('id', project.client_id)
              .single();
            if (clientData) {
              client = clientData;
            }
          }

          // Get proposal count
          const { count: proposalCount } = await supabase
            .from('project_proposals')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          return {
            ...project,
            status: project.status as ProjectWithClient['status'],
            required_roles: project.required_roles as UserRole[] | null,
            preferred_animal_skins: project.preferred_animal_skins as AnimalSkin[] | null,
            deadline: project.deadline,
            client,
            proposalCount: proposalCount || 0,
          };
        })
      );

      setProjects(enrichedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects
    .filter((project) => {
      const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.required_skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      
      const matchesAnimalSkin = animalSkinFilter === 'all' || 
        project.preferred_animal_skins?.includes(animalSkinFilter as AnimalSkin);
      
      return matchesSearch && matchesStatus && matchesAnimalSkin;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'budget':
          return ((b.budget_max || b.budget_min || 0) - (a.budget_max || a.budget_min || 0));
        case 'proposals':
          return b.proposalCount - a.proposalCount;
        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

      {/* Filters and Sort */}
      <ScrollReveal animation="fade-up" delay={150}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="프로젝트 또는 기술 스택 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={animalSkinFilter} onValueChange={setAnimalSkinFilter}>
            <SelectTrigger className="w-36">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="성향" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 성향</SelectItem>
              {(Object.entries(ANIMAL_SKINS) as [AnimalSkin, typeof ANIMAL_SKINS[AnimalSkin]][]).map(([key, skin]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span>{skin.icon}</span>
                    <span>{skin.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-32">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">최신순</SelectItem>
              <SelectItem value="budget">예산순</SelectItem>
              <SelectItem value="proposals">제안순</SelectItem>
            </SelectContent>
          </Select>
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
                      {/* Title & Status & Deadline */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-display font-bold text-lg">{project.title}</h3>
                        <StatusBadge 
                          status={PROJECT_STATUS[project.status]?.name || project.status} 
                          variant={getStatusVariant(project.status)}
                          size="sm"
                        />
                        {project.status === 'open' && (() => {
                          const deadlineInfo = formatDeadline(project.deadline);
                          if (!deadlineInfo) return null;
                          return (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                              deadlineInfo.expired 
                                ? 'bg-muted text-muted-foreground' 
                                : deadlineInfo.urgent 
                                  ? 'bg-destructive/10 text-destructive animate-pulse' 
                                  : 'bg-primary/10 text-primary'
                            }`}>
                              <Timer className="w-3 h-3" />
                              {deadlineInfo.text}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Description */}
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {project.description}
                        </p>
                      )}

                      {/* Skills */}
                      {project.required_skills && project.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {project.required_skills.map((skill) => (
                            <span 
                              key={skill}
                              className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Preferred animal skins */}
                      {project.preferred_animal_skins && project.preferred_animal_skins.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="text-xs text-muted-foreground">선호 성향:</span>
                          {project.preferred_animal_skins.map((skin) => {
                            const skinData = ANIMAL_SKINS[skin];
                            if (!skinData) return null;
                            return (
                              <Tooltip key={skin}>
                                <TooltipTrigger asChild>
                                  <span className="text-lg cursor-help">{skinData.icon}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{skinData.name}</p>
                                  <p className="text-xs text-muted-foreground">{skinData.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      )}

                      {/* Required roles */}
                      {project.required_roles && project.required_roles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {project.required_roles.map((role, i) => (
                            <RoleBadge key={i} role={role} size="sm" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right side - Budget, Timeline, Client */}
                    <div className="flex flex-row md:flex-col gap-4 md:gap-3 md:text-right md:min-w-[160px]">
                      <div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground md:justify-end">
                          <DollarSign className="w-4 h-4" />
                          <span>예산</span>
                        </div>
                        <p className="font-medium">{formatBudget(project.budget_min, project.budget_max)}</p>
                      </div>
                      {project.timeline_weeks && (
                        <div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground md:justify-end">
                            <Clock className="w-4 h-4" />
                            <span>기간</span>
                          </div>
                          <p className="font-medium">{project.timeline_weeks}주</p>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground md:justify-end">
                          <Users className="w-4 h-4" />
                          <span>제안</span>
                        </div>
                        <p className="font-medium">{project.proposalCount}건</p>
                      </div>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={project.client?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-muted">
                          {project.client?.name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        {project.client?.name || '익명'}
                      </span>
                    </div>
                    {project.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      {filteredProjects.length === 0 && !loading && (
        <div className="text-center py-16">
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">
            {projects.length === 0 ? '아직 프로젝트가 없습니다' : '검색 결과가 없습니다'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {projects.length === 0 ? '첫 번째 프로젝트를 등록해보세요!' : '다른 조건으로 검색해보세요'}
          </p>
          <Link to="/projects/create">
            <Button>프로젝트 등록하기</Button>
          </Link>
        </div>
      )}

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
