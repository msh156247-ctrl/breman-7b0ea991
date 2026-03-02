import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Users, 
  Star, 
  TrendingUp,
  Send,
  Inbox,
  ArrowRight,
  Clock,
  Loader2,
  SlidersHorizontal,
  FileText,
  ArrowUpDown,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BackToTop } from '@/components/ui/BackToTop';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { LevelBadge } from '@/components/ui/LevelBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Team {
  id: string;
  name: string;
  emblem_url: string | null;
  leader_id: string | null;
  rating_avg: number | null;
  avg_level: number | null;
  description: string | null;
  updated_at: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string | null;
  client_id: string | null;
  created_at: string | null;
  required_skills: string[] | null;
  timeline_weeks: number | null;
  proposalCount?: number;
}

type SortOption = 'newest' | 'budget_high' | 'budget_low' | 'deadline';

function formatBudgetShort(amount: number): string {
  if (amount >= 10000) return `${(amount / 10000).toLocaleString()}만`;
  return amount.toLocaleString();
}

function OpenProjectsList({ 
  searchQuery, 
  sortBy, 
  budgetFilter,
  skillFilter 
}: { 
  searchQuery: string; 
  sortBy: SortOption;
  budgetFilter: string;
  skillFilter: string;
}) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpenProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false });
        if (error) throw error;

        // Fetch proposal counts
        const projectIds = (data || []).map(p => p.id);
        let proposalCounts: Record<string, number> = {};
        
        if (projectIds.length > 0) {
          const { data: proposals } = await supabase
            .from('project_proposals')
            .select('project_id')
            .in('project_id', projectIds);
          
          (proposals || []).forEach(p => {
            proposalCounts[p.project_id!] = (proposalCounts[p.project_id!] || 0) + 1;
          });
        }

        const enriched = (data || []).map(p => ({
          ...p,
          proposalCount: proposalCounts[p.id] || 0,
        }));

        setProjects(enriched);
      } catch (error) {
        console.error('Error fetching open projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOpenProjects();
  }, []);

  const filtered = useMemo(() => {
    let result = projects.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Budget filter
    if (budgetFilter && budgetFilter !== 'all') {
      result = result.filter(p => {
        const max = p.budget_max || p.budget_min || 0;
        switch (budgetFilter) {
          case 'under_100': return max < 1000000;
          case '100_500': return max >= 1000000 && max <= 5000000;
          case '500_1000': return max >= 5000000 && max <= 10000000;
          case 'over_1000': return max > 10000000;
          default: return true;
        }
      });
    }

    // Skill filter
    if (skillFilter) {
      result = result.filter(p => 
        p.required_skills?.some(s => 
          s.toLowerCase().includes(skillFilter.toLowerCase())
        )
      );
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        break;
      case 'budget_high':
        result.sort((a, b) => (b.budget_max || 0) - (a.budget_max || 0));
        break;
      case 'budget_low':
        result.sort((a, b) => (a.budget_min || 0) - (b.budget_min || 0));
        break;
      case 'deadline':
        result.sort((a, b) => {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
        break;
    }

    return result;
  }, [projects, searchQuery, sortBy, budgetFilter, skillFilter]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (filtered.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <Inbox className="w-14 h-14 mx-auto mb-4 opacity-40" />
      <p className="text-lg font-medium">공개된 의뢰가 없습니다</p>
      <p className="text-sm mt-1">새로운 프로젝트가 등록되면 여기에 표시됩니다</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{filtered.length}개의 프로젝트</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project, index) => (
          <ScrollReveal key={project.id} animation="fade-up" delay={index * 40}>
            <Card
              className="hover:shadow-lg transition-all cursor-pointer group h-full border-border/60 hover:border-primary/30"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {project.title}
                  </CardTitle>
                  {project.proposalCount! > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                      <FileText className="w-3 h-3 mr-0.5" />
                      {project.proposalCount}
                    </Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2 text-xs">
                  {project.description || '설명 없음'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Skills */}
                {project.required_skills && project.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {project.required_skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                        {skill}
                      </Badge>
                    ))}
                    {project.required_skills.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal opacity-60">
                        +{project.required_skills.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Bottom info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                  <div className="flex items-center gap-3">
                    {project.budget_min || project.budget_max ? (
                      <span className="font-medium text-foreground/80">
                        {project.budget_min && project.budget_max 
                          ? `${formatBudgetShort(project.budget_min)}~${formatBudgetShort(project.budget_max)}원`
                          : project.budget_max 
                            ? `~${formatBudgetShort(project.budget_max)}원`
                            : `${formatBudgetShort(project.budget_min!)}원~`
                        }
                      </span>
                    ) : (
                      <span>예산 협의</span>
                    )}
                    {project.timeline_weeks && (
                      <span>{project.timeline_weeks}주</span>
                    )}
                  </div>
                  {project.created_at && (
                    <span>
                      {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: ko })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');
  const hasActiveFilters = budgetFilter !== 'all' || skillFilter !== '';

  // Team recommendations
  const [recommendedTeams, setRecommendedTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  useEffect(() => {
    fetchRecommendedTeams();
  }, []);

  const fetchRecommendedTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('status', 'active')
        .order('rating_avg', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setRecommendedTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setTeamsLoading(false);
    }
  };

  const filteredTeams = recommendedTeams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clearFilters = () => {
    setBudgetFilter('all');
    setSkillFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">프로젝트 마켓</h1>
            <p className="text-muted-foreground mt-1">팀을 찾고 프로젝트를 의뢰하세요</p>
          </div>
          <Button
            onClick={() => navigate(user ? '/projects/create' : '/auth')}
            className="bg-gradient-primary gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            프로젝트 의뢰
          </Button>
        </div>
      </ScrollReveal>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
          <TabsTrigger value="open" className="gap-2">
            <Inbox className="w-4 h-4" />
            <span className="hidden sm:inline">공개 의뢰</span>
            <span className="sm:hidden">공개</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">팀 추천</span>
            <span className="sm:hidden">추천</span>
          </TabsTrigger>
        </TabsList>

        {/* 공개 의뢰 목록 */}
        <TabsContent value="open" className="space-y-4">
          <ScrollReveal animation="fade-up" delay={100}>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="프로젝트 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">최신순</SelectItem>
                  <SelectItem value="budget_high">예산 높은순</SelectItem>
                  <SelectItem value="budget_low">예산 낮은순</SelectItem>
                  <SelectItem value="deadline">마감 임박순</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="relative shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">필터</h4>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={clearFilters}>
                          초기화
                        </Button>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">예산 범위</label>
                      <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="전체" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          <SelectItem value="under_100">100만원 미만</SelectItem>
                          <SelectItem value="100_500">100~500만원</SelectItem>
                          <SelectItem value="500_1000">500~1,000만원</SelectItem>
                          <SelectItem value="over_1000">1,000만원 이상</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">기술 스택</label>
                      <Input
                        placeholder="예: React, Python..."
                        value={skillFilter}
                        onChange={(e) => setSkillFilter(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Active filters display */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">활성 필터:</span>
                {budgetFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {{
                      'under_100': '100만원 미만',
                      '100_500': '100~500만원',
                      '500_1000': '500~1,000만원',
                      'over_1000': '1,000만원 이상',
                    }[budgetFilter]}
                    <button onClick={() => setBudgetFilter('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {skillFilter && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {skillFilter}
                    <button onClick={() => setSkillFilter('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </ScrollReveal>

          <OpenProjectsList 
            searchQuery={searchQuery} 
            sortBy={sortBy}
            budgetFilter={budgetFilter}
            skillFilter={skillFilter}
          />
        </TabsContent>

        {/* 팀 추천 리스트 */}
        <TabsContent value="recommendations" className="space-y-4">
          <ScrollReveal animation="fade-up" delay={100}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="팀 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </ScrollReveal>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teamsLoading ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <Users className="w-14 h-14 mx-auto mb-4 opacity-40" />
                <p className="text-lg font-medium">추천할 팀이 없습니다</p>
              </div>
            ) : (
              filteredTeams.map((team, index) => (
                <ScrollReveal key={team.id} animation="fade-up" delay={100 + index * 40}>
                  <Card 
                    className="hover:shadow-lg transition-all cursor-pointer group h-full border-border/60 hover:border-primary/30"
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
                            if (user) {
                              navigate(`/projects/create?teamId=${team.id}`);
                            } else {
                              navigate('/auth');
                            }
                          }}
                        >
                          제안하기
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <BackToTop />
    </div>
  );
}
