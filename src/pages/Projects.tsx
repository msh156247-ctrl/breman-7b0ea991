import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Briefcase, Clock, DollarSign, Users, Loader2, ArrowUpDown, Timer, Sparkles, Wallet, Eye, Star, Package } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleBadge, RoleTypeBadge } from '@/components/ui/RoleBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PROJECT_STATUS, ANIMAL_SKINS, ROLE_TYPES, type UserRole, type AnimalSkin, type RoleType } from '@/lib/constants';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackToTop } from '@/components/ui/BackToTop';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
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

interface ServiceOffer {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  service_category: string;
  budget_min: number | null;
  budget_max: number | null;
  timeline_weeks: number | null;
  offered_skills: string[];
  offered_roles: RoleType[];
  status: string;
  view_count: number;
  created_at: string;
  team: {
    id: string;
    name: string;
    emblem_url: string | null;
    leader_id: string;
    rating_avg: number | null;
  };
}

const SERVICE_CATEGORIES = {
  development: { name: '개발', icon: '💻' },
  design: { name: '디자인', icon: '🎨' },
  marketing: { name: '마케팅', icon: '📢' },
  content: { name: '콘텐츠', icon: '✍️' },
  consulting: { name: '컨설팅', icon: '💡' },
  general: { name: '기타', icon: '📦' },
};

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

function formatOfferBudget(min: number | null, max: number | null): string {
  if (!min && !max) return '협의';
  if (min && max) {
    return `${(min / 10000).toLocaleString()}만 ~ ${(max / 10000).toLocaleString()}만원`;
  }
  if (min) return `${(min / 10000).toLocaleString()}만원~`;
  if (max) return `~${(max / 10000).toLocaleString()}만원`;
  return '협의';
}

export default function Projects() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('projects');
  
  // Project states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [animalSkinFilter, setAnimalSkinFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Service offer states
  const [offerSearchQuery, setOfferSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [offerSortBy, setOfferSortBy] = useState<string>('newest');
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [myTeams, setMyTeams] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchOffers();
    if (user?.id) {
      fetchMyTeams();
    }
  }, [user?.id]);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedProjects = await Promise.all(
        (projectsData || []).map(async (project) => {
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
      setLoadingProjects(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_service_offers')
        .select(`
          *,
          team:teams(id, name, emblem_url, leader_id, rating_avg)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers((data || []) as unknown as ServiceOffer[]);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('서비스 오퍼를 불러오는데 실패했습니다');
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchMyTeams = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('leader_id', user.id);

      if (error) throw error;
      setMyTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
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

  const filteredOffers = offers
    .filter(offer => {
      if (offerSearchQuery) {
        const query = offerSearchQuery.toLowerCase();
        if (
          !offer.title.toLowerCase().includes(query) &&
          !offer.description?.toLowerCase().includes(query) &&
          !offer.team.name.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (categoryFilter !== 'all' && offer.service_category !== categoryFilter) {
        return false;
      }
      if (roleFilter !== 'all' && !offer.offered_roles.includes(roleFilter as RoleType)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (offerSortBy) {
        case 'budget':
          return (b.budget_max || 0) - (a.budget_max || 0);
        case 'views':
          return (b.view_count || 0) - (a.view_count || 0);
        case 'rating':
          return (b.team.rating_avg || 0) - (a.team.rating_avg || 0);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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

  const isTeamLeader = myTeams.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">프로젝트 마켓</h1>
            <p className="text-muted-foreground mt-1">프로젝트 의뢰 또는 팀 서비스를 찾아보세요</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'projects' ? (
              <Link to="/projects/create">
                <Button className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  프로젝트 의뢰하기
                </Button>
              </Link>
            ) : isTeamLeader ? (
              <Link to="/service-offers/create">
                <Button className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  서비스 등록하기
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </ScrollReveal>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            프로젝트
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            서비스 오퍼
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6 mt-6">
          {/* Project Status Tabs */}
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

          {/* Project Filters */}
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

          {/* Project Results */}
          <div className="text-sm text-muted-foreground">
            {filteredProjects.length}개의 프로젝트
          </div>

          {loadingProjects ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project, index) => (
                <ScrollReveal key={project.id} animation="fade-up" delay={200 + index * 50}>
                  <Link to={`/projects/${project.id}`}>
                    <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="flex-1 min-w-0">
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

                            {project.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {project.description}
                              </p>
                            )}

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

                            {project.required_roles && project.required_roles.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {project.required_roles.map((role, i) => (
                                  <RoleBadge key={i} role={role} size="sm" />
                                ))}
                              </div>
                            )}
                          </div>

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

              {filteredProjects.length === 0 && (
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
            </div>
          )}
        </TabsContent>

        {/* Service Offers Tab */}
        <TabsContent value="services" className="space-y-6 mt-6">
          {/* Service Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="서비스, 팀명으로 검색..."
                    value={offerSearchQuery}
                    onChange={(e) => setOfferSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 카테고리</SelectItem>
                    {Object.entries(SERVICE_CATEGORIES).map(([key, { name, icon }]) => (
                      <SelectItem key={key} value={key}>
                        {icon} {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="역할" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 역할</SelectItem>
                    {Object.entries(ROLE_TYPES).map(([key, { name, icon }]) => (
                      <SelectItem key={key} value={key}>
                        {icon} {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={offerSortBy} onValueChange={setOfferSortBy}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="정렬" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">최신순</SelectItem>
                    <SelectItem value="budget">예산순</SelectItem>
                    <SelectItem value="views">조회순</SelectItem>
                    <SelectItem value="rating">평점순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Service Results */}
          <div className="text-sm text-muted-foreground">
            {filteredOffers.length}개의 서비스 오퍼
          </div>

          {loadingOffers ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredOffers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-2">서비스 오퍼가 없습니다</h3>
                <p className="text-muted-foreground">
                  {isTeamLeader 
                    ? '첫 번째 서비스를 등록해보세요!' 
                    : '아직 등록된 서비스가 없습니다.'}
                </p>
                {isTeamLeader && (
                  <Button asChild className="mt-4">
                    <Link to="/service-offers/create">
                      <Plus className="h-4 w-4 mr-2" />
                      서비스 등록
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOffers.map((offer) => {
                const category = SERVICE_CATEGORIES[offer.service_category as keyof typeof SERVICE_CATEGORIES] || SERVICE_CATEGORIES.general;
                
                return (
                  <Link key={offer.id} to={`/service-offers/${offer.id}`}>
                    <Card className="h-full hover:shadow-md transition-all hover:border-primary/30 cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="outline" className="shrink-0">
                            {category.icon} {category.name}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            {offer.view_count}
                          </div>
                        </div>
                        <CardTitle className="text-lg line-clamp-2 mt-2">
                          {offer.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {offer.description || '설명 없음'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={offer.team.emblem_url || undefined} />
                            <AvatarFallback>{offer.team.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{offer.team.name}</p>
                            {offer.team.rating_avg && offer.team.rating_avg > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {offer.team.rating_avg.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </div>

                        {offer.offered_roles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {offer.offered_roles.slice(0, 3).map((role) => (
                              <RoleTypeBadge key={role} roleType={role} size="sm" />
                            ))}
                            {offer.offered_roles.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{offer.offered_roles.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
                          <div className="flex items-center gap-1">
                            <Wallet className="h-4 w-4" />
                            <span>{formatOfferBudget(offer.budget_min, offer.budget_max)}</span>
                          </div>
                          {offer.timeline_weeks && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{offer.timeline_weeks}주</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BackToTop />
    </div>
  );
}