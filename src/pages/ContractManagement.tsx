import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, CheckCircle2, Clock, AlertTriangle, XCircle, 
  Upload, FileText, MessageSquare, Shield, DollarSign,
  Calendar, User, Users, ExternalLink, Send, Eye,
  Lock, Unlock, RefreshCw, Flag, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type MilestoneStatus = Database['public']['Enums']['milestone_status'];
type EscrowStatus = Database['public']['Enums']['escrow_status'];
type ContractStatus = Database['public']['Enums']['contract_status'];

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  amount: number | null;
  due_date: string | null;
  status: MilestoneStatus | null;
  order_index: number | null;
}

interface Submission {
  id: string;
  milestone_id: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  note: string | null;
  files: string[] | null;
  submitter?: { name: string };
}

const MILESTONE_STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '대기', color: 'muted', icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: '진행중', color: 'secondary', icon: <RefreshCw className="h-4 w-4" /> },
  review: { label: '검토중', color: 'primary', icon: <Eye className="h-4 w-4" /> },
  approved: { label: '승인됨', color: 'success', icon: <CheckCircle2 className="h-4 w-4" /> },
  rejected: { label: '반려됨', color: 'destructive', icon: <XCircle className="h-4 w-4" /> },
  dispute: { label: '분쟁중', color: 'destructive', icon: <AlertTriangle className="h-4 w-4" /> },
};

const ESCROW_STATUS_CONFIG: Record<EscrowStatus, { label: string; color: string; icon: React.ReactNode }> = {
  not_funded: { label: '미입금', color: 'muted', icon: <Lock className="h-4 w-4" /> },
  funded: { label: '입금완료', color: 'success', icon: <DollarSign className="h-4 w-4" /> },
  on_hold: { label: '보류중', color: 'secondary', icon: <Clock className="h-4 w-4" /> },
  released: { label: '지급완료', color: 'primary', icon: <Unlock className="h-4 w-4" /> },
  refunded: { label: '환불됨', color: 'destructive', icon: <RefreshCw className="h-4 w-4" /> },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
};

export default function ContractManagement() {
  const { contractId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch contract data
  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          project:projects(id, title, client_id, client:profiles!projects_client_id_fkey(id, name, email, avatar_url)),
          team:teams(id, name, leader_id, leader:profiles!teams_leader_id_fkey(id, name, avatar_url))
        `)
        .eq('id', contractId!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!contractId,
  });

  // Fetch milestones
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['milestones', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('contract_id', contractId!)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!contractId,
  });

  // Fetch submissions for each milestone
  const { data: submissions = [] } = useQuery({
    queryKey: ['milestone_submissions', contractId],
    queryFn: async () => {
      const milestoneIds = milestones.map(m => m.id);
      if (milestoneIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('milestone_submissions')
        .select(`
          *,
          submitter:profiles!milestone_submissions_submitted_by_fkey(name)
        `)
        .in('milestone_id', milestoneIds)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data as Submission[];
    },
    enabled: milestones.length > 0,
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team_members', contract?.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          *,
          user:profiles!team_memberships_user_id_fkey(id, name, avatar_url, level, primary_role)
        `)
        .eq('team_id', contract!.team_id!);
      
      if (error) throw error;
      return data;
    },
    enabled: !!contract?.team_id,
  });

  const isLoading = contractLoading || milestonesLoading;
  
  const escrowConfig = contract?.escrow_status 
    ? ESCROW_STATUS_CONFIG[contract.escrow_status]
    : ESCROW_STATUS_CONFIG.not_funded;
  
  const completedMilestones = milestones.filter(m => m.status === 'approved').length;
  const totalMilestones = milestones.length;
  const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  
  const releasedAmount = milestones
    .filter(m => m.status === 'approved')
    .reduce((sum, m) => sum + (m.amount || 0), 0);

  const totalAmount = contract?.total_amount || 0;
  
  // Determine user role in this contract
  const isClient = contract?.project?.client_id === user?.id;
  const isTeamLeader = contract?.team?.leader_id === user?.id;
  const isTeamMember = teamMembers.some(m => m.user_id === user?.id) || isTeamLeader;

  const handleSubmission = async () => {
    if (!submitNote.trim()) {
      toast.error('제출 내용을 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitDialogOpen(false);
    setSubmitNote('');
    toast.success('마일스톤 결과물이 제출되었습니다.');
  };

  const handleReview = async (approved: boolean) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setReviewDialogOpen(false);
    setReviewNote('');
    toast.success(approved ? '마일스톤이 승인되었습니다.' : '마일스톤이 반려되었습니다.');
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('분쟁 사유를 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setDisputeDialogOpen(false);
    setDisputeReason('');
    toast.success('분쟁이 접수되었습니다. 관리자가 검토 후 연락드립니다.');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-16" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">계약을 찾을 수 없습니다</h2>
        <Link to="/projects">
          <Button>프로젝트 목록으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  // Get submissions for a specific milestone
  const getMilestoneSubmissions = (milestoneId: string) => {
    return submissions.filter(s => s.milestone_id === milestoneId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">계약 관리</h1>
            <StatusBadge status={contract.status === 'active' ? '진행중' : contract.status} variant="primary" />
          </div>
          <Link to={`/projects/${contract.project_id}`} className="text-muted-foreground hover:text-primary flex items-center gap-1">
            {contract.project?.title || '프로젝트'}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 계약금</p>
                <p className="font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${escrowConfig.color}/10`}>
                {escrowConfig.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">에스크로 상태</p>
                <p className="font-bold">{escrowConfig.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">지급 완료</p>
                <p className="font-bold">{formatCurrency(releasedAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">진행률</p>
                <p className="font-bold">{completedMilestones}/{totalMilestones} 완료</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">전체 진행률</span>
            <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </CardContent>
      </Card>

      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="milestones">마일스톤</TabsTrigger>
          <TabsTrigger value="parties">계약 당사자</TabsTrigger>
          <TabsTrigger value="files">파일 & 커뮤니케이션</TabsTrigger>
        </TabsList>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          {/* Milestone Timeline */}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {milestones.map((milestone, index) => {
                const statusConfig = milestone.status ? MILESTONE_STATUS_CONFIG[milestone.status] : MILESTONE_STATUS_CONFIG.pending;
                const isActive = milestone.status === 'in_progress' || milestone.status === 'review';
                const milestoneSubmissions = getMilestoneSubmissions(milestone.id);
                
                return (
                  <Card 
                    key={milestone.id}
                    className={`relative border-border/50 transition-all ${
                      isActive ? 'border-primary/50 shadow-glow' : ''
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute -left-[25px] top-6 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center ${
                      milestone.status === 'approved' ? 'border-success bg-success' :
                      isActive ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {milestone.status === 'approved' && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">M{index + 1}</span>
                            <h3 className="font-semibold">{milestone.name}</h3>
                            <Badge 
                              variant="outline" 
                              className={`gap-1 text-${statusConfig.color}`}
                            >
                              {statusConfig.icon}
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              마감: {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString('ko-KR') : '미정'}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(milestone.amount || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {/* Team Actions */}
                          {(milestone.status === 'in_progress' || milestone.status === 'rejected') && (
                            <Dialog open={submitDialogOpen && selectedMilestone?.id === milestone.id} onOpenChange={(open) => {
                              setSubmitDialogOpen(open);
                              if (open) setSelectedMilestone(milestone);
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" className="gap-1">
                                  <Upload className="h-3 w-3" />
                                  제출
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>마일스톤 결과물 제출</DialogTitle>
                                  <DialogDescription>
                                    {milestone.name}의 결과물을 제출합니다.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>제출 설명</Label>
                                    <Textarea
                                      value={submitNote}
                                      onChange={(e) => setSubmitNote(e.target.value)}
                                      placeholder="결과물에 대한 설명을 입력하세요"
                                      rows={4}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>파일 첨부</Label>
                                    <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                      <p className="text-sm text-muted-foreground">
                                        클릭하여 파일 업로드
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        PDF, ZIP, 이미지 파일 (최대 50MB)
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
                                    취소
                                  </Button>
                                  <Button onClick={handleSubmission} disabled={isSubmitting}>
                                    {isSubmitting ? '제출 중...' : '제출하기'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}

                          {/* Client Review Actions */}
                          {milestone.status === 'review' && (
                            <Dialog open={reviewDialogOpen && selectedMilestone?.id === milestone.id} onOpenChange={(open) => {
                              setReviewDialogOpen(open);
                              if (open) setSelectedMilestone(milestone);
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1">
                                  <Eye className="h-3 w-3" />
                                  검토
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>마일스톤 검토</DialogTitle>
                                  <DialogDescription>
                                    {milestone.name}의 제출물을 검토합니다.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  {milestoneSubmissions.length > 0 && (
                                    <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                      <p className="text-sm font-medium">최근 제출</p>
                                      <p className="text-sm text-muted-foreground">
                                        {milestoneSubmissions[0].note}
                                      </p>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {(milestoneSubmissions[0].files || []).map((file) => (
                                          <Badge key={file} variant="outline" className="gap-1">
                                            <FileText className="h-3 w-3" />
                                            {file}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <Label>검토 의견 (선택)</Label>
                                    <Textarea
                                      value={reviewNote}
                                      onChange={(e) => setReviewNote(e.target.value)}
                                      placeholder="승인 또는 반려 사유를 입력하세요"
                                      rows={3}
                                    />
                                  </div>
                                </div>
                                <DialogFooter className="gap-2">
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => handleReview(false)}
                                    disabled={isSubmitting}
                                  >
                                    반려
                                  </Button>
                                  <Button 
                                    onClick={() => handleReview(true)}
                                    disabled={isSubmitting}
                                  >
                                    승인
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}

                          {/* View submissions */}
                          {milestoneSubmissions.length > 0 && (
                            <Button size="sm" variant="ghost" className="gap-1 text-xs">
                              <FileText className="h-3 w-3" />
                              {milestoneSubmissions.length}개 제출
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Submission History */}
                      {milestoneSubmissions.length > 0 && milestone.status !== 'pending' && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-2">제출 내역</p>
                          {milestoneSubmissions.map((sub) => (
                            <div key={sub.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{sub.submitter?.name || '알 수 없음'}</span>
                                <span className="text-xs text-muted-foreground">
                                  {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('ko-KR') : ''}
                                </span>
                              </div>
                              <p className="text-muted-foreground mb-2">{sub.note}</p>
                              <div className="flex flex-wrap gap-1">
                                {(sub.files || []).map((file) => (
                                  <Badge key={file} variant="outline" className="gap-1 text-xs">
                                    <FileText className="h-3 w-3" />
                                    {file}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Team */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  수행 팀
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contract.team ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-2xl">
                        🎵
                      </div>
                      <div>
                        <p className="font-bold">{contract.team.name}</p>
                        <p className="text-sm text-muted-foreground">리더: {contract.team.leader?.name || '알 수 없음'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">팀 구성</p>
                      <div className="grid grid-cols-2 gap-2">
                        {teamMembers.map((member) => (
                          <div key={member.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                            <RoleBadge role={member.role} level={member.user?.level || 1} size="sm" />
                            <span className="text-sm">{member.user?.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <Link to={`/teams/${contract.team.id}`}>
                        팀 상세보기
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground">팀 정보가 없습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* Client */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  클라이언트
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold">{contract.project?.client?.name || '알 수 없음'}</p>
                    <p className="text-sm text-muted-foreground">{contract.project?.client?.email || ''}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  메시지 보내기
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Escrow Details */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                에스크로 현황
              </CardTitle>
              <CardDescription>
                안전한 거래를 위해 계약금은 에스크로로 보호됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">총 계약금</p>
                  <p className="font-bold text-lg">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="p-4 bg-success/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">지급 완료</p>
                  <p className="font-bold text-lg text-success">{formatCurrency(releasedAmount)}</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">보관 중</p>
                  <p className="font-bold text-lg text-primary">
                    {formatCurrency(totalAmount - releasedAmount)}
                  </p>
                </div>
                <div className="p-4 bg-secondary/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">플랫폼 수수료</p>
                  <p className="font-bold text-lg text-secondary">{contract.fee_rate || 10}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files & Communication Tab */}
        <TabsContent value="files" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Files */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  프로젝트 파일
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: '계약서_v1.pdf', date: '2024-01-15', size: '2.4 MB' },
                  { name: '기획서_최종.pdf', date: '2024-01-28', size: '5.1 MB' },
                  { name: '디자인시스템.fig', date: '2024-02-13', size: '12.3 MB' },
                  { name: '와이어프레임.fig', date: '2024-01-28', size: '8.7 MB' },
                ].map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.date} · {file.size}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Chat */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  빠른 메시지
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-48 bg-muted/30 rounded-lg p-4 overflow-y-auto space-y-3">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs">클</div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">클라이언트 · 2시간 전</p>
                      <p className="text-sm bg-background rounded-lg p-2">디자인 검토 완료했습니다. 몇 가지 수정사항 전달드릴게요.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="flex-1 text-right">
                      <p className="text-xs text-muted-foreground mb-1">김팀장 · 1시간 전</p>
                      <p className="text-sm bg-primary/10 rounded-lg p-2 inline-block text-left">네, 확인했습니다. 내일까지 수정본 보내드리겠습니다.</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs">🐴</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="메시지를 입력하세요..." />
                  <Button size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dispute Section */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flag className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">문제가 있으신가요?</p>
                  <p className="text-sm text-muted-foreground">계약 진행 중 분쟁이 발생하면 신고해주세요.</p>
                </div>
              </div>
              <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    분쟁 신고
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>분쟁 신고</DialogTitle>
                    <DialogDescription>
                      분쟁 사유를 상세히 작성해주세요. 관리자가 검토 후 조치를 취합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>분쟁 사유</Label>
                      <Textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="분쟁 사유를 상세히 작성해주세요"
                        rows={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>증거 파일 (선택)</Label>
                      <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-destructive/50 transition-colors">
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">파일 업로드</p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                      취소
                    </Button>
                    <Button variant="destructive" onClick={handleDispute} disabled={isSubmitting}>
                      {isSubmitting ? '접수 중...' : '분쟁 접수'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
