import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Users, 
  Star, 
  TrendingUp,
  Send,
  FileText,
  Inbox,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
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

interface Proposal {
  id: string;
  project_id: string | null;
  team_id: string | null;
  proposed_budget: number | null;
  proposed_timeline_weeks: number | null;
  proposal_text: string | null;
  status: string | null;
  created_at: string | null;
  project?: {
    id: string;
    title: string;
    client_id: string | null;
  };
  team?: {
    id: string;
    name: string;
    emblem_url: string | null;
  };
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
}

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('recommendations');
  const [searchQuery, setSearchQuery] = useState('');

  // States
  const [recommendedTeams, setRecommendedTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [myTeams, setMyTeams] = useState<{ id: string; name: string }[]>([]);
  const [myRequests, setMyRequests] = useState<Project[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [receivedProposals, setReceivedProposals] = useState<Proposal[]>([]);
  const [receivedLoading, setReceivedLoading] = useState(true);
  const [sentProposals, setSentProposals] = useState<Proposal[]>([]);
  const [sentLoading, setSentLoading] = useState(true);

  useEffect(() => {
    fetchRecommendedTeams();
    if (user?.id) {
      fetchMyTeams();
      fetchMyRequests();
      fetchReceivedProposals();
    }
  }, [user?.id]);

  useEffect(() => {
    if (myTeams.length > 0) {
      fetchSentProposals();
    }
  }, [myTeams]);

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

  const fetchMyTeams = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('leader_id', user.id);
      
      if (error) throw error;
      setMyTeams(data || []);
    } catch (error) {
      console.error('Error fetching my teams:', error);
    }
  };

  const fetchMyRequests = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMyRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchReceivedProposals = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('project_proposals')
        .select(`
          *,
          project:projects(id, title, client_id),
          team:teams(id, name, emblem_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter to only my projects
      const filtered = (data || []).filter((p: any) => p.project?.client_id === user.id);
      setReceivedProposals(filtered);
    } catch (error) {
      console.error('Error fetching received proposals:', error);
    } finally {
      setReceivedLoading(false);
    }
  };

  const fetchSentProposals = async () => {
    if (!user || myTeams.length === 0) return;
    try {
      const teamIds = myTeams.map(t => t.id);
      
      const { data, error } = await supabase
        .from('project_proposals')
        .select(`
          *,
          project:projects(id, title, client_id),
          team:teams(id, name, emblem_url)
        `)
        .in('team_id', teamIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSentProposals(data || []);
    } catch (error) {
      console.error('Error fetching sent proposals:', error);
    } finally {
      setSentLoading(false);
    }
  };

  const isTeamLeader = myTeams.length > 0;

  const filteredTeams = recommendedTeams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'accepted': return '수락됨';
      case 'rejected': return '거절됨';
      case 'pending': return '대기중';
      default: return status || '알 수 없음';
    }
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
        </div>
      </ScrollReveal>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="recommendations" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">팀 추천</span>
          </TabsTrigger>
          <TabsTrigger value="request" className="gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">의뢰하기</span>
          </TabsTrigger>
          <TabsTrigger value="my-requests" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">의뢰 내역</span>
          </TabsTrigger>
          <TabsTrigger value="proposals" className="gap-2">
            <Inbox className="w-4 h-4" />
            <span className="hidden sm:inline">제안 리스트</span>
          </TabsTrigger>
        </TabsList>

        {/* 팀 추천 리스트 */}
        <TabsContent value="recommendations" className="space-y-4">
          <ScrollReveal animation="fade-up" delay={100}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="팀 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </ScrollReveal>

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
              filteredTeams.map((team, index) => (
                <ScrollReveal key={team.id} animation="fade-up" delay={100 + index * 50}>
                  <Card 
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
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" />
                                Lv.{team.avg_level}
                              </span>
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
                </ScrollReveal>
              ))
            )}
          </div>
        </TabsContent>

        {/* 의뢰하기 */}
        <TabsContent value="request" className="space-y-4">
          <ScrollReveal animation="fade-up" delay={100}>
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
                    onClick={() => navigate('/teams')}
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
          </ScrollReveal>
        </TabsContent>

        {/* 의뢰 내역 */}
        <TabsContent value="my-requests" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">내가 등록한 의뢰</h2>
            <Button onClick={() => navigate('/projects/create')}>
              <Plus className="w-4 h-4 mr-2" />
              새 의뢰
            </Button>
          </div>

          {requestsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : myRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                아직 등록한 의뢰가 없습니다
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myRequests.map((project, index) => (
                <ScrollReveal key={project.id} animation="fade-up" delay={index * 50}>
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{project.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {project.description || '설명 없음'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {project.budget_min && project.budget_max && (
                              <Badge variant="secondary">
                                {project.budget_min.toLocaleString()}~{project.budget_max.toLocaleString()}원
                              </Badge>
                            )}
                            <Badge variant={project.status === 'open' ? 'default' : 'outline'}>
                              {project.status === 'open' ? '모집중' : project.status}
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 제안 리스트 */}
        <TabsContent value="proposals" className="space-y-6">
          {/* 받은 제안 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">받은 제안</h2>
            {receivedLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : receivedProposals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  받은 제안이 없습니다
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {receivedProposals.map((proposal, index) => (
                  <ScrollReveal key={proposal.id} animation="fade-up" delay={index * 50}>
                    <Card 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/projects/${proposal.project_id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10 rounded-lg">
                              <AvatarImage src={proposal.team?.emblem_url || undefined} />
                              <AvatarFallback className="rounded-lg">
                                {proposal.team?.name?.[0] || 'T'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {proposal.team?.name}이(가) 제안
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {proposal.project?.title}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(proposal.status)}
                            <span className="text-sm">{getStatusLabel(proposal.status)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>

          {/* 보낸 제안 (팀 리더만) */}
          {isTeamLeader && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">보낸 제안</h2>
              {sentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : sentProposals.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    보낸 제안이 없습니다
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sentProposals.map((proposal, index) => (
                    <ScrollReveal key={proposal.id} animation="fade-up" delay={index * 50}>
                      <Card 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/projects/${proposal.project_id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {proposal.project?.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {proposal.team?.name}에서 제안함
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(proposal.status)}
                              <span className="text-sm">{getStatusLabel(proposal.status)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BackToTop />
    </div>
  );
}
