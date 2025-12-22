import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import { 
  ArrowLeft, CheckCircle2, Clock, AlertTriangle, XCircle, 
  Upload, FileText, MessageSquare, Shield, DollarSign,
  Calendar, User, Users, ExternalLink, Send, Eye,
  Lock, Unlock, RefreshCw, Flag, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

type MilestoneStatus = 'pending' | 'in_progress' | 'review' | 'approved' | 'rejected' | 'dispute';
type EscrowStatus = 'not_funded' | 'funded' | 'on_hold' | 'released' | 'refunded';

interface Milestone {
  id: string;
  name: string;
  description: string;
  amount: number;
  dueDate: string;
  status: MilestoneStatus;
  submissions: Submission[];
}

interface Submission {
  id: string;
  submittedBy: string;
  submittedAt: string;
  note: string;
  files: string[];
}

// Mock data
const contractData = {
  id: '1',
  projectTitle: 'E-커머스 플랫폼 리뉴얼',
  projectId: 'proj-1',
  status: 'active' as const,
  escrowStatus: 'funded' as EscrowStatus,
  totalAmount: 15000000,
  feeRate: 10,
  createdAt: '2024-01-15',
  team: {
    id: 'team-1',
    name: '브래맨 올스타즈',
    leaderName: '김팀장',
    members: [
      { name: '김팀장', role: 'horse' as const, level: 5 },
      { name: '이보안', role: 'dog' as const, level: 4 },
      { name: '박디자인', role: 'cat' as const, level: 4 },
      { name: '최프론트', role: 'rooster' as const, level: 5 },
    ]
  },
  client: {
    name: '테크스타트업',
    contact: 'client@tech.com',
    avatar: null
  },
  milestones: [
    {
      id: 'm1',
      name: '기획 및 와이어프레임',
      description: '전체 서비스 기획서 및 와이어프레임 작성',
      amount: 3000000,
      dueDate: '2024-02-01',
      status: 'approved' as MilestoneStatus,
      submissions: [
        {
          id: 's1',
          submittedBy: '김팀장',
          submittedAt: '2024-01-28',
          note: '기획서 및 와이어프레임 초안입니다.',
          files: ['기획서_v1.pdf', '와이어프레임.fig']
        }
      ]
    },
    {
      id: 'm2',
      name: 'UI/UX 디자인',
      description: '전체 페이지 UI/UX 디자인 및 디자인 시스템 구축',
      amount: 4000000,
      dueDate: '2024-02-15',
      status: 'review' as MilestoneStatus,
      submissions: [
        {
          id: 's2',
          submittedBy: '박디자인',
          submittedAt: '2024-02-13',
          note: '디자인 시스템 및 주요 페이지 디자인 완료',
          files: ['디자인시스템.fig', '메인페이지.fig', '상품페이지.fig']
        }
      ]
    },
    {
      id: 'm3',
      name: '프론트엔드 개발',
      description: 'React 기반 프론트엔드 개발',
      amount: 5000000,
      dueDate: '2024-03-15',
      status: 'in_progress' as MilestoneStatus,
      submissions: []
    },
    {
      id: 'm4',
      name: '백엔드 연동 및 QA',
      description: 'API 연동 및 전체 QA 진행',
      amount: 3000000,
      dueDate: '2024-03-30',
      status: 'pending' as MilestoneStatus,
      submissions: []
    }
  ] as Milestone[]
};

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

export default function ContractManagement() {
  const { contractId } = useParams();
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contract = contractData;
  const escrowConfig = ESCROW_STATUS_CONFIG[contract.escrowStatus];
  
  const completedMilestones = contract.milestones.filter(m => m.status === 'approved').length;
  const totalMilestones = contract.milestones.length;
  const progressPercentage = (completedMilestones / totalMilestones) * 100;
  
  const releasedAmount = contract.milestones
    .filter(m => m.status === 'approved')
    .reduce((sum, m) => sum + m.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

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
            <StatusBadge status="진행중" variant="primary" />
          </div>
          <Link to={`/projects/${contract.projectId}`} className="text-muted-foreground hover:text-primary flex items-center gap-1">
            {contract.projectTitle}
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
                <p className="font-bold">{formatCurrency(contract.totalAmount)}</p>
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
              {contract.milestones.map((milestone, index) => {
                const statusConfig = MILESTONE_STATUS_CONFIG[milestone.status];
                const isActive = milestone.status === 'in_progress' || milestone.status === 'review';
                
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
                              마감: {new Date(milestone.dueDate).toLocaleDateString('ko-KR')}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(milestone.amount)}
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
                                  {milestone.submissions.length > 0 && (
                                    <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                      <p className="text-sm font-medium">최근 제출</p>
                                      <p className="text-sm text-muted-foreground">
                                        {milestone.submissions[0].note}
                                      </p>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {milestone.submissions[0].files.map((file) => (
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
                          {milestone.submissions.length > 0 && (
                            <Button size="sm" variant="ghost" className="gap-1 text-xs">
                              <FileText className="h-3 w-3" />
                              {milestone.submissions.length}개 제출
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Submission History */}
                      {milestone.submissions.length > 0 && milestone.status !== 'pending' && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-2">제출 내역</p>
                          {milestone.submissions.map((sub) => (
                            <div key={sub.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{sub.submittedBy}</span>
                                <span className="text-xs text-muted-foreground">{sub.submittedAt}</span>
                              </div>
                              <p className="text-muted-foreground mb-2">{sub.note}</p>
                              <div className="flex flex-wrap gap-1">
                                {sub.files.map((file) => (
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
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-2xl">
                    🎵
                  </div>
                  <div>
                    <p className="font-bold">{contract.team.name}</p>
                    <p className="text-sm text-muted-foreground">리더: {contract.team.leaderName}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">팀 구성</p>
                  <div className="grid grid-cols-2 gap-2">
                    {contract.team.members.map((member) => (
                      <div key={member.name} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <RoleBadge role={member.role} level={member.level} size="sm" />
                        <span className="text-sm">{member.name}</span>
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
                    <p className="font-bold">{contract.client.name}</p>
                    <p className="text-sm text-muted-foreground">{contract.client.contact}</p>
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
                  <p className="font-bold text-lg">{formatCurrency(contract.totalAmount)}</p>
                </div>
                <div className="p-4 bg-success/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">지급 완료</p>
                  <p className="font-bold text-lg text-success">{formatCurrency(releasedAmount)}</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">보관 중</p>
                  <p className="font-bold text-lg text-primary">
                    {formatCurrency(contract.totalAmount - releasedAmount)}
                  </p>
                </div>
                <div className="p-4 bg-secondary/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">플랫폼 수수료</p>
                  <p className="font-bold text-lg text-secondary">{contract.feeRate}%</p>
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
