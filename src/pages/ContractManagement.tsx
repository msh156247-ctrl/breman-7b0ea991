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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  Lock, Unlock, RefreshCw, Flag, ChevronRight, Plus, Pencil, Trash2, Play, Star
} from 'lucide-react';
import { ProjectReviewPrompt } from '@/components/project/ProjectReviewPrompt';
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
  contract_id: string | null;
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

  // Milestone management states
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    description: '',
    amount: '',
    due_date: '',
  });

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

  // Reset milestone form
  const resetMilestoneForm = () => {
    setMilestoneForm({ name: '', description: '', amount: '', due_date: '' });
    setEditingMilestone(null);
  };

  // Open milestone dialog for adding
  const openAddMilestoneDialog = () => {
    resetMilestoneForm();
    setMilestoneDialogOpen(true);
  };

  // Open milestone dialog for editing
  const openEditMilestoneDialog = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneForm({
      name: milestone.name,
      description: milestone.description || '',
      amount: milestone.amount?.toString() || '',
      due_date: milestone.due_date || '',
    });
    setMilestoneDialogOpen(true);
  };

  // Add milestone mutation
  const addMilestone = useMutation({
    mutationFn: async () => {
      const maxOrderIndex = milestones.reduce((max, m) => Math.max(max, m.order_index || 0), 0);
      
      const { error } = await supabase
        .from('milestones')
        .insert({
          contract_id: contractId,
          name: milestoneForm.name,
          description: milestoneForm.description || null,
          amount: milestoneForm.amount ? parseInt(milestoneForm.amount) : null,
          due_date: milestoneForm.due_date || null,
          order_index: maxOrderIndex + 1,
          status: 'pending',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', contractId] });
      setMilestoneDialogOpen(false);
      resetMilestoneForm();
      toast.success('마일스톤이 추가되었습니다.');
    },
    onError: (error) => {
      console.error('Error adding milestone:', error);
      toast.error('마일스톤 추가에 실패했습니다.');
    },
  });

  // Update milestone mutation
  const updateMilestone = useMutation({
    mutationFn: async () => {
      if (!editingMilestone) throw new Error('No milestone selected');
      
      const { error } = await supabase
        .from('milestones')
        .update({
          name: milestoneForm.name,
          description: milestoneForm.description || null,
          amount: milestoneForm.amount ? parseInt(milestoneForm.amount) : null,
          due_date: milestoneForm.due_date || null,
        })
        .eq('id', editingMilestone.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', contractId] });
      setMilestoneDialogOpen(false);
      resetMilestoneForm();
      toast.success('마일스톤이 수정되었습니다.');
    },
    onError: (error) => {
      console.error('Error updating milestone:', error);
      toast.error('마일스톤 수정에 실패했습니다.');
    },
  });

  // Delete milestone mutation
  const deleteMilestone = useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', contractId] });
      toast.success('마일스톤이 삭제되었습니다.');
    },
    onError: (error) => {
      console.error('Error deleting milestone:', error);
      toast.error('마일스톤 삭제에 실패했습니다.');
    },
  });

  // Update milestone status mutation
  const updateMilestoneStatus = useMutation({
    mutationFn: async ({ milestoneId, status }: { milestoneId: string; status: MilestoneStatus }) => {
      const { error } = await supabase
        .from('milestones')
        .update({ status })
        .eq('id', milestoneId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', contractId] });
      toast.success('마일스톤 상태가 변경되었습니다.');
    },
    onError: (error) => {
      console.error('Error updating milestone status:', error);
      toast.error('상태 변경에 실패했습니다.');
    },
  });

  // Submit milestone deliverable
  const submitMilestone = useMutation({
    mutationFn: async () => {
      if (!selectedMilestone || !user) throw new Error('Invalid state');
      
      const { error } = await supabase
        .from('milestone_submissions')
        .insert({
          milestone_id: selectedMilestone.id,
          submitted_by: user.id,
          note: submitNote,
          files: [],
        });
      
      if (error) throw error;
      
      const { error: updateError } = await supabase
        .from('milestones')
        .update({ status: 'review' })
        .eq('id', selectedMilestone.id);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', contractId] });
      queryClient.invalidateQueries({ queryKey: ['milestone_submissions', contractId] });
      setSubmitDialogOpen(false);
      setSubmitNote('');
      setSelectedMilestone(null);
      toast.success('마일스톤 결과물이 제출되었습니다.');
    },
    onError: (error) => {
      console.error('Error submitting milestone:', error);
      toast.error('제출에 실패했습니다.');
    },
  });

  // Review milestone
  const reviewMilestone = useMutation({
    mutationFn: async (approved: boolean) => {
      if (!selectedMilestone) throw new Error('No milestone selected');
      
      const { error } = await supabase
        .from('milestones')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', selectedMilestone.id);
      
      if (error) throw error;
    },
    onSuccess: (_, approved) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', contractId] });
      setReviewDialogOpen(false);
      setReviewNote('');
      setSelectedMilestone(null);
      toast.success(approved ? '마일스톤이 승인되었습니다.' : '마일스톤이 반려되었습니다.');
    },
    onError: (error) => {
      console.error('Error reviewing milestone:', error);
      toast.error('검토 처리에 실패했습니다.');
    },
  });

  // Create dispute
  const createDispute = useMutation({
    mutationFn: async () => {
      if (!user || !contractId) throw new Error('Invalid state');
      
      const { error } = await supabase
        .from('disputes')
        .insert({
          contract_id: contractId,
          milestone_id: selectedMilestone?.id || null,
          opened_by: user.id,
          reason: disputeReason,
          status: 'open',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setDisputeDialogOpen(false);
      setDisputeReason('');
      toast.success('분쟁이 접수되었습니다. 관리자가 검토 후 연락드립니다.');
    },
    onError: (error) => {
      console.error('Error creating dispute:', error);
      toast.error('분쟁 접수에 실패했습니다.');
    },
  });

  const handleSubmission = async () => {
    if (!submitNote.trim()) {
      toast.error('제출 내용을 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    await submitMilestone.mutateAsync();
    setIsSubmitting(false);
  };

  const handleReview = async (approved: boolean) => {
    setIsSubmitting(true);
    await reviewMilestone.mutateAsync(approved);
    setIsSubmitting(false);
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('분쟁 사유를 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    await createDispute.mutateAsync();
    setIsSubmitting(false);
  };

  const handleSaveMilestone = async () => {
    if (!milestoneForm.name.trim()) {
      toast.error('마일스톤 이름을 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    if (editingMilestone) {
      await updateMilestone.mutateAsync();
    } else {
      await addMilestone.mutateAsync();
    }
    setIsSubmitting(false);
  };

  const handleStartMilestone = async (milestoneId: string) => {
    await updateMilestoneStatus.mutateAsync({ milestoneId, status: 'in_progress' });
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="milestones">마일스톤</TabsTrigger>
          <TabsTrigger value="parties">계약 당사자</TabsTrigger>
          <TabsTrigger value="files">파일 & 커뮤니케이션</TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            후기
          </TabsTrigger>
        </TabsList>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          {/* Add Milestone Button - Only for clients */}
          {isClient && (
            <div className="flex justify-end">
              <Button onClick={openAddMilestoneDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                마일스톤 추가
              </Button>
            </div>
          )}

          {/* Milestone Timeline */}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {milestones.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>아직 등록된 마일스톤이 없습니다.</p>
                    {isClient && (
                      <Button onClick={openAddMilestoneDialog} variant="outline" className="mt-4 gap-2">
                        <Plus className="h-4 w-4" />
                        첫 마일스톤 추가하기
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                milestones.map((milestone, index) => {
                  const statusConfig = milestone.status ? MILESTONE_STATUS_CONFIG[milestone.status] : MILESTONE_STATUS_CONFIG.pending;
                  const isActive = milestone.status === 'in_progress' || milestone.status === 'review';
                  const milestoneSubmissions = getMilestoneSubmissions(milestone.id);
                  const canEdit = isClient && milestone.status === 'pending';
                  const canStart = isTeamMember && milestone.status === 'pending';
                  
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
                            {/* Client Management Actions */}
                            {canEdit && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="gap-1 h-8 px-2"
                                  onClick={() => openEditMilestoneDialog(milestone)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="gap-1 h-8 px-2 text-destructive hover:text-destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>마일스톤 삭제</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        "{milestone.name}" 마일스톤을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => deleteMilestone.mutate(milestone.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        삭제
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}

                            {/* Start Milestone Button - Team */}
                            {canStart && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="gap-1"
                                onClick={() => handleStartMilestone(milestone.id)}
                              >
                                <Play className="h-3 w-3" />
                                시작
                              </Button>
                            )}

                            {/* Team Submit Actions */}
                            {isTeamMember && (milestone.status === 'in_progress' || milestone.status === 'rejected') && (
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
                            {isClient && milestone.status === 'review' && (
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
                })
              )}
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                커뮤니케이션
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>커뮤니케이션 기능이 곧 제공됩니다.</p>
              </div>
            </CardContent>
          </Card>

          {/* Dispute Section */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Flag className="h-5 w-5" />
                분쟁 제기
              </CardTitle>
              <CardDescription>
                문제가 해결되지 않는 경우 분쟁을 제기할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    분쟁 제기하기
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>분쟁 제기</DialogTitle>
                    <DialogDescription>
                      분쟁 사유를 상세히 작성해주세요. 관리자가 검토 후 연락드립니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>분쟁 사유</Label>
                      <Textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="분쟁 사유를 상세히 작성해주세요"
                        rows={6}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                      취소
                    </Button>
                    <Button variant="destructive" onClick={handleDispute} disabled={isSubmitting}>
                      {isSubmitting ? '제출 중...' : '분쟁 제기'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4">
          {progressPercentage === 100 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Client Review */}
              {isClient && contract.team && (
                <ProjectReviewPrompt
                  projectId={contract.project_id || ''}
                  projectTitle={contract.project?.title || '프로젝트'}
                  reviewerId={user?.id || ''}
                  targetType="team"
                  targetId={contract.team.id}
                  targetName={contract.team.name}
                />
              )}
              
              {/* Team Review */}
              {isTeamMember && contract.project?.client && (
                <ProjectReviewPrompt
                  projectId={contract.project_id || ''}
                  projectTitle={contract.project?.title || '프로젝트'}
                  reviewerId={user?.id || ''}
                  targetType="user"
                  targetId={contract.project.client.id}
                  targetName={contract.project.client.name}
                />
              )}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-2">후기는 프로젝트 완료 후 작성할 수 있습니다</p>
                <p className="text-sm">모든 마일스톤이 승인되면 후기 작성이 가능합니다.</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Progress value={progressPercentage} className="w-48 h-2" />
                  <span className="text-xs">{Math.round(progressPercentage)}%</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onOpenChange={(open) => {
        setMilestoneDialogOpen(open);
        if (!open) resetMilestoneForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMilestone ? '마일스톤 수정' : '마일스톤 추가'}</DialogTitle>
            <DialogDescription>
              {editingMilestone ? '마일스톤 정보를 수정합니다.' : '새 마일스톤을 추가합니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>마일스톤 이름 *</Label>
              <Input
                value={milestoneForm.name}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                placeholder="예: 기획안 제출"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                placeholder="마일스톤에 대한 상세 설명"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>금액 (원)</Label>
                <Input
                  type="number"
                  value={milestoneForm.amount}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: e.target.value })}
                  placeholder="1000000"
                />
              </div>
              <div className="space-y-2">
                <Label>마감일</Label>
                <Input
                  type="date"
                  value={milestoneForm.due_date}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveMilestone} disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : (editingMilestone ? '수정' : '추가')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
