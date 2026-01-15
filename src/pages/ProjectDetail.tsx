import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, DollarSign, Calendar, Users, Star,
  CheckCircle2, Circle, AlertCircle, FileText, Send,
  MessageSquare, Paperclip, Building, Shield, Settings, Loader2, Inbox,
  XCircle, CheckCircle, Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { PROJECT_STATUS, ROLES, type UserRole } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProjectProposalManagement } from '@/components/project/ProjectProposalManagement';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Project {
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
  created_at: string | null;
  visibility: string | null;
}

interface Client {
  id: string;
  name: string;
  avatar_url: string | null;
  rating_avg: number | null;
  verified: boolean | null;
  created_at: string | null;
}

function formatBudget(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(0)}천만원`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}백만원`;
  return `${amount.toLocaleString()}원`;
}

function formatBudgetRange(min: number | null, max: number | null): string {
  if (!min && !max) return '협의';
  if (min && max) return `₩${formatBudget(min)} ~ ${formatBudget(max)}`;
  if (min) return `₩${formatBudget(min)} 이상`;
  if (max) return `₩${formatBudget(max)} 이하`;
  return '협의';
}

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

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [proposalCount, setProposalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalText, setProposalText] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [proposedTimeline, setProposedTimeline] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [userTeams, setUserTeams] = useState<{ id: string; name: string; emblem_url: string | null }[]>([]);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [userProposalId, setUserProposalId] = useState<string | null>(null);
  const [userProposalStatus, setUserProposalStatus] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [assignedTeam, setAssignedTeam] = useState<{ id: string; name: string; emblem_url: string | null; rating_avg: number | null } | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, user]);

  const fetchProjectData = async () => {
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      setProject({
        ...projectData,
        status: projectData.status as Project['status'],
        required_roles: projectData.required_roles as UserRole[] | null,
      });

      // Fetch client info
      if (projectData.client_id) {
        const { data: clientData } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('id', projectData.client_id)
          .single();
        
        if (clientData) {
          setClient(clientData as Client);
        }
      }

      // Fetch proposal count
      const { count } = await supabase
        .from('project_proposals')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
      
      setProposalCount(count || 0);

      // Check for assigned team (if project is matched/in_progress/completed)
      if (projectData.status !== 'open' && projectData.status !== 'cancelled') {
        const { data: contractData } = await supabase
          .from('contracts')
          .select(`
            team:teams!contracts_team_id_fkey(id, name, emblem_url, rating_avg)
          `)
          .eq('project_id', projectId)
          .single();

        if (contractData?.team) {
          setAssignedTeam(contractData.team as { id: string; name: string; emblem_url: string | null; rating_avg: number | null });
        }
      }

      // Check if user has already applied (if they lead a team)
      if (user) {
        const { data: leaderTeams } = await supabase
          .from('teams')
          .select('id, name, emblem_url')
          .eq('leader_id', user.id);

        if (leaderTeams && leaderTeams.length > 0) {
          setUserTeams(leaderTeams);
          setSelectedTeamId(leaderTeams[0].id);
          
          const teamIds = leaderTeams.map(t => t.id);
          const { data: existingProposals } = await supabase
            .from('project_proposals')
            .select('id, status')
            .eq('project_id', projectId)
            .in('team_id', teamIds)
            .in('status', ['pending', 'accepted']);
          
          if (existingProposals && existingProposals.length > 0) {
            setHasApplied(true);
            setUserProposalId(existingProposals[0].id);
            setUserProposalStatus(existingProposals[0].status);
          } else {
            setHasApplied(false);
            setUserProposalId(null);
            setUserProposalStatus(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: '오류',
        description: '프로젝트 정보를 불러올 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user?.id === project?.client_id;
  const isTeamLeader = userTeams.length > 0;

  const handleSubmitProposal = async () => {
    if (!proposalText || !proposedBudget || !proposedTimeline) {
      toast({
        title: '입력 필요',
        description: '모든 필드를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: '로그인 필요',
        description: '제안을 보내려면 로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTeamId) {
      toast({
        title: '팀 선택 필요',
        description: '제안을 보낼 팀을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('project_proposals')
        .insert({
          project_id: projectId,
          team_id: selectedTeamId,
          proposal_text: proposalText,
          proposed_budget: parseInt(proposedBudget),
          proposed_timeline_weeks: parseInt(proposedTimeline),
        });

      if (error) throw error;

      toast({
        title: '제안서 제출 완료',
        description: '클라이언트가 검토 후 연락드릴 예정입니다.',
      });
      setProposalDialogOpen(false);
      setProposalText('');
      setProposedBudget('');
      setProposedTimeline('');
      setHasApplied(true);
      setProposalCount(prev => prev + 1);
      // Refresh to get the new proposal ID
      fetchProjectData();
    } catch (error) {
      console.error('Error submitting proposal:', error);
      toast({
        title: '제출 실패',
        description: '제안서를 제출할 수 없습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  const handleAskQuestion = () => {
    if (!questionText) {
      toast({
        title: '질문을 입력해주세요',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: '질문 등록 완료',
      description: '클라이언트가 답변하면 알림을 보내드립니다.',
    });
    setQuestionDialogOpen(false);
    setQuestionText('');
  };

  const handleWithdrawProposal = async () => {
    if (!userProposalId) return;

    setWithdrawing(true);
    try {
      const { error } = await supabase
        .from('project_proposals')
        .update({ status: 'withdrawn' })
        .eq('id', userProposalId);

      if (error) throw error;

      toast({
        title: '제안 철회 완료',
        description: '제안서가 철회되었습니다.',
      });
      
      setHasApplied(false);
      setUserProposalId(null);
      setUserProposalStatus(null);
      setProposalCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error withdrawing proposal:', error);
      toast({
        title: '철회 실패',
        description: '제안서를 철회할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleStatusChange = async (newStatus: 'completed' | 'cancelled') => {
    if (!project) return;
    
    setStatusUpdating(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', project.id);

      if (error) throw error;

      setProject({ ...project, status: newStatus });
      toast({
        title: newStatus === 'completed' ? '프로젝트 완료' : '프로젝트 취소됨',
        description: newStatus === 'completed' 
          ? '프로젝트가 성공적으로 완료되었습니다.' 
          : '프로젝트가 취소되었습니다.',
      });
    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: '상태 변경 실패',
        description: '프로젝트 상태를 변경할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">프로젝트를 찾을 수 없습니다</h2>
        <Link to="/projects">
          <Button>프로젝트 목록으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <ScrollReveal animation="fade-up">
        <Link to="/projects" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>프로젝트 목록</span>
        </Link>
      </ScrollReveal>

      {/* Project header */}
      <ScrollReveal animation="fade-up" delay={100}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-background border">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Info */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-display font-bold">{project.title}</h1>
                  <StatusBadge 
                    status={PROJECT_STATUS[project.status]?.name || project.status} 
                    variant={getStatusVariant(project.status)}
                  />
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-success" />
                    <span className="font-medium">{formatBudgetRange(project.budget_min, project.budget_max)}</span>
                  </div>
                  {project.timeline_weeks && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{project.timeline_weeks}주</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-secondary" />
                    <span>{proposalCount}개 제안</span>
                  </div>
                  {project.created_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(project.created_at).toLocaleDateString('ko-KR')} 등록</span>
                    </div>
                  )}
                </div>

                {/* Required Roles */}
                {project.required_roles && project.required_roles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.required_roles.map((role, i) => (
                      <RoleBadge key={i} role={role} size="md" />
                    ))}
                  </div>
                )}

                {/* Skills */}
                {project.required_skills && project.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.required_skills.map((skill) => (
                      <SkillBadge key={skill} name={skill} />
                    ))}
                  </div>
                )}
              </div>

              {/* Action & Client Card */}
              <div className="lg:w-80 space-y-4">
                {/* Client Card */}
                {client && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={client.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {client.name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{client.name}</span>
                            {client.verified && (
                              <Shield className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star className="w-3 h-3 text-secondary fill-secondary" />
                            <span>{client.rating_avg || 0}</span>
                          </div>
                        </div>
                      </div>
                      {client.created_at && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          <span>{new Date(client.created_at).toLocaleDateString('ko-KR')} 가입</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Assigned Team Card */}
                {assignedTeam && (
                  <Card className="border-success/30 bg-success/5">
                    <CardContent className="p-4">
                      <div className="text-xs text-success font-medium mb-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        선정된 팀
                      </div>
                      <Link to={`/teams/${assignedTeam.id}`} className="block">
                        <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={assignedTeam.emblem_url || undefined} />
                            <AvatarFallback className="bg-success/10 text-success font-bold text-lg">
                              {assignedTeam.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{assignedTeam.name}</div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Star className="w-3 h-3 text-secondary fill-secondary" />
                              <span>{assignedTeam.rating_avg?.toFixed(1) || '0.0'}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                )}

                {isOwner ? (
                  <div className="space-y-2">
                    <Link to={`/projects/${project.id}/edit`}>
                      <Button className="w-full" variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        프로젝트 관리
                      </Button>
                    </Link>
                    
                    {/* Status Change Actions - Only for active projects */}
                    {(project.status === 'open' || project.status === 'matched' || project.status === 'in_progress') && (
                      <div className="flex gap-2">
                        {/* Complete Project */}
                        {project.status === 'in_progress' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                className="flex-1" 
                                variant="default"
                                disabled={statusUpdating}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                완료 처리
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>프로젝트 완료 처리</AlertDialogTitle>
                                <AlertDialogDescription>
                                  프로젝트를 완료 처리하시겠습니까? 완료 후에는 더 이상 변경할 수 없습니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleStatusChange('completed')}
                                  disabled={statusUpdating}
                                >
                                  {statusUpdating ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                  )}
                                  완료 처리
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {/* Cancel Project */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              className="flex-1" 
                              variant="destructive"
                              disabled={statusUpdating}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              프로젝트 취소
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>프로젝트 취소</AlertDialogTitle>
                              <AlertDialogDescription>
                                정말로 프로젝트를 취소하시겠습니까? 취소 후에는 복구할 수 없습니다.
                                {project.status !== 'open' && (
                                  <span className="block mt-2 text-destructive font-medium">
                                    ⚠️ 이미 진행 중인 프로젝트입니다. 관련 계약 및 제안에 영향을 줄 수 있습니다.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>돌아가기</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleStatusChange('cancelled')}
                                disabled={statusUpdating}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {statusUpdating ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Ban className="w-4 h-4 mr-2" />
                                )}
                                취소 확인
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}

                    {/* Status indicator for finished projects */}
                    {project.status === 'completed' && (
                      <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-success/10 text-success border border-success/20">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">완료된 프로젝트</span>
                      </div>
                    )}
                    {project.status === 'cancelled' && (
                      <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                        <XCircle className="w-5 h-5" />
                        <span className="font-medium">취소된 프로젝트</span>
                      </div>
                    )}
                  </div>
                ) : project.status === 'open' && isTeamLeader && (
                  <div className="space-y-2">
                    {hasApplied ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 text-primary border border-primary/20">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="font-medium">
                            {userProposalStatus === 'accepted' ? '제안이 수락되었습니다!' : '제안서 검토 중'}
                          </span>
                        </div>
                        {userProposalStatus === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                                disabled={withdrawing}
                              >
                                {withdrawing ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4 mr-2" />
                                )}
                                제안 철회
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>제안 철회</AlertDialogTitle>
                                <AlertDialogDescription>
                                  제출한 제안서를 철회하시겠습니까? 철회 후에는 새로운 제안을 다시 보낼 수 있습니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleWithdrawProposal}
                                  className="bg-destructive hover:bg-destructive/90"
                                  disabled={withdrawing}
                                >
                                  {withdrawing ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4 mr-2" />
                                  )}
                                  철회하기
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ) : (
                      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-gradient-primary">
                            <Send className="w-4 h-4 mr-2" />
                            제안서 보내기
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>프로젝트 제안서</DialogTitle>
                            <DialogDescription>
                              {project.title}에 대한 제안서를 작성해주세요.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            {/* Team Selection */}
                            {userTeams.length > 1 && (
                              <div>
                                <Label>제안을 보낼 팀</Label>
                                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="팀 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {userTeams.map((team) => (
                                      <SelectItem key={team.id} value={team.id}>
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-5 w-5">
                                            <AvatarImage src={team.emblem_url || undefined} />
                                            <AvatarFallback className="text-[10px]">
                                              {team.name[0]}
                                            </AvatarFallback>
                                          </Avatar>
                                          {team.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>제안 예산 (원)</Label>
                                <Input 
                                  type="number"
                                  placeholder="5000000"
                                  value={proposedBudget}
                                  onChange={(e) => setProposedBudget(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>예상 기간 (주)</Label>
                                <Input 
                                  type="number"
                                  placeholder="8"
                                  value={proposedTimeline}
                                  onChange={(e) => setProposedTimeline(e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <Label>제안 내용</Label>
                              <Textarea 
                                placeholder="팀의 경험, 접근 방식, 차별점 등을 상세히 작성해주세요..."
                                value={proposalText}
                                onChange={(e) => setProposalText(e.target.value)}
                                rows={6}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setProposalDialogOpen(false)}>
                              취소
                            </Button>
                            <Button onClick={handleSubmitProposal} className="bg-gradient-primary">
                              제안 제출
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          질문하기
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>클라이언트에게 질문</DialogTitle>
                          <DialogDescription>
                            프로젝트에 대해 궁금한 점을 질문해주세요.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          <Textarea 
                            placeholder="질문 내용을 입력하세요..."
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            rows={4}
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>
                            취소
                          </Button>
                          <Button onClick={handleAskQuestion}>
                            질문 등록
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Content */}
      <ScrollReveal animation="fade-up" delay={150}>
        <Tabs defaultValue="description" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="description">프로젝트 설명</TabsTrigger>
            {isOwner && (
              <TabsTrigger value="proposals" className="flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                제안서 ({proposalCount}건)
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="description">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">프로젝트 설명</h2>
                {project.description ? (
                  <div className="prose prose-sm max-w-none">
                    {project.description.split('\n').map((paragraph, i) => {
                      if (paragraph.startsWith('## ')) {
                        return <h3 key={i} className="text-md font-semibold mt-4 mb-2 first:mt-0">{paragraph.replace('## ', '')}</h3>;
                      }
                      if (paragraph.startsWith('- ')) {
                        return <li key={i} className="text-foreground/80 ml-4">{paragraph.replace('- ', '')}</li>;
                      }
                      if (paragraph.trim() === '') {
                        return null;
                      }
                      return <p key={i} className="text-foreground/80 mb-2">{paragraph}</p>;
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">설명이 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isOwner && (
            <TabsContent value="proposals">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-primary" />
                    들어온 제안서
                  </h2>
                  <ProjectProposalManagement 
                    projectId={project.id}
                    onProposalAccepted={fetchProjectData}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </ScrollReveal>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
