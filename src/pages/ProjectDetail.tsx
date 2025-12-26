import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Clock, DollarSign, Calendar, Users, Star,
  CheckCircle2, Circle, AlertCircle, FileText, Send,
  MessageSquare, Paperclip, Building, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Sample project data
const projectsData = {
  '1': {
    id: '1',
    title: 'AI 기반 고객 서비스 챗봇 개발',
    description: `OpenAI API를 활용한 지능형 고객 응대 챗봇을 개발합니다. 

## 프로젝트 개요
기존 고객 서비스 시스템의 효율성을 높이기 위해 AI 기반 챗봇을 도입하고자 합니다. 자연어 처리 기반의 맥락 이해와 개인화된 응답 생성이 핵심입니다.

## 주요 기능
- 실시간 고객 문의 응대
- 맥락 기반 대화 유지
- FAQ 자동 응답
- 상담원 연결 기능
- 대화 이력 분석 대시보드

## 기술 요구사항
- GPT-4 API 통합
- 실시간 스트리밍 응답
- 다국어 지원 (한국어, 영어)`,
    client: { 
      id: 'c1',
      name: '테크스타트', 
      avatar: null,
      rating: 4.8,
      projectsPosted: 15,
      verified: true,
      joinedAt: '2023-06-15',
    },
    status: 'open' as const,
    budgetMin: 5000000,
    budgetMax: 8000000,
    timeline: 8,
    skills: ['Python', 'OpenAI', 'React', 'FastAPI', 'PostgreSQL', 'Redis'],
    roles: ['horse', 'rooster'] as UserRole[],
    proposals: 5,
    createdAt: '2024-01-15',
    visibility: 'public',
    milestones: [
      { id: 'm1', name: '요구사항 분석 및 설계', dueWeek: 2, amount: 1500000, status: 'pending' },
      { id: 'm2', name: 'API 통합 및 백엔드 개발', dueWeek: 4, amount: 2500000, status: 'pending' },
      { id: 'm3', name: '프론트엔드 개발', dueWeek: 6, amount: 2000000, status: 'pending' },
      { id: 'm4', name: '테스트 및 배포', dueWeek: 8, amount: 2000000, status: 'pending' },
    ],
    qna: [
      { id: 'q1', question: 'API 키는 누가 제공하나요?', answer: '클라이언트 측에서 OpenAI API 키를 제공합니다.', askedAt: '2024-01-16', answeredAt: '2024-01-16' },
      { id: 'q2', question: '다국어 지원 범위는 어디까지인가요?', answer: '초기 버전은 한국어와 영어만 지원합니다. 추후 확장 가능합니다.', askedAt: '2024-01-17', answeredAt: '2024-01-17' },
    ],
  },
  '2': {
    id: '2',
    title: 'E-commerce 플랫폼 리뉴얼',
    description: `기존 쇼핑몰의 UI/UX 개선 및 성능 최적화 프로젝트입니다.

## 프로젝트 목표
모바일 퍼스트 접근으로 전환율 향상을 목표로 합니다. 현재 3%인 전환율을 5% 이상으로 개선하고자 합니다.

## 개선 영역
- 모바일 UI 전면 리뉴얼
- 결제 프로세스 간소화
- 상품 검색 및 필터링 개선
- 페이지 로딩 속도 최적화`,
    client: { 
      id: 'c2',
      name: '쇼핑몰코리아', 
      avatar: null,
      rating: 4.5,
      projectsPosted: 8,
      verified: true,
      joinedAt: '2023-03-10',
    },
    status: 'matched' as const,
    budgetMin: 15000000,
    budgetMax: 20000000,
    timeline: 12,
    skills: ['React', 'Next.js', 'Figma', 'PostgreSQL', 'Tailwind CSS'],
    roles: ['horse', 'cat', 'rooster'] as UserRole[],
    proposals: 12,
    createdAt: '2024-01-10',
    visibility: 'public',
    milestones: [
      { id: 'm1', name: 'UI/UX 디자인', dueWeek: 3, amount: 5000000, status: 'in_progress' },
      { id: 'm2', name: '프론트엔드 개발', dueWeek: 7, amount: 8000000, status: 'pending' },
      { id: 'm3', name: '백엔드 연동', dueWeek: 10, amount: 4000000, status: 'pending' },
      { id: 'm4', name: 'QA 및 배포', dueWeek: 12, amount: 3000000, status: 'pending' },
    ],
    qna: [],
  },
};

function formatBudget(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(0)}천만원`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}백만원`;
  return `${amount.toLocaleString()}원`;
}

function formatBudgetRange(min: number, max: number): string {
  return `₩${formatBudget(min)} ~ ${formatBudget(max)}`;
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

const getMilestoneIcon = (status: string) => {
  switch (status) {
    case 'approved': return <CheckCircle2 className="w-5 h-5 text-success" />;
    case 'in_progress': return <AlertCircle className="w-5 h-5 text-secondary" />;
    default: return <Circle className="w-5 h-5 text-muted-foreground" />;
  }
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalText, setProposalText] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [proposedTimeline, setProposedTimeline] = useState('');
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');

  const project = projectsData[projectId as keyof typeof projectsData];

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

  const totalBudget = project.milestones.reduce((sum, m) => sum + m.amount, 0);
  const completedMilestones = project.milestones.filter(m => m.status === 'approved').length;
  const progressPercent = (completedMilestones / project.milestones.length) * 100;

  // Mock: Check if user is a team leader (would come from auth context)
  const isTeamLeader = true;
  const hasApplied = false;

  const handleSubmitProposal = () => {
    if (!proposalText || !proposedBudget || !proposedTimeline) {
      toast({
        title: '입력 필요',
        description: '모든 필드를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: '제안서 제출 완료',
      description: '클라이언트가 검토 후 연락드릴 예정입니다.',
    });
    setProposalDialogOpen(false);
    setProposalText('');
    setProposedBudget('');
    setProposedTimeline('');
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
                  status={PROJECT_STATUS[project.status].name} 
                  variant={getStatusVariant(project.status)}
                />
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="font-medium">{formatBudgetRange(project.budgetMin, project.budgetMax)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{project.timeline}주</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-secondary" />
                  <span>{project.proposals}개 제안</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(project.createdAt).toLocaleDateString('ko-KR')} 등록</span>
                </div>
              </div>

              {/* Required Roles */}
              <div className="flex flex-wrap gap-2">
                {project.roles.map((role, i) => (
                  <RoleBadge key={i} role={role} size="md" />
                ))}
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-2">
                {project.skills.map((skill) => (
                  <SkillBadge key={skill} name={skill} />
                ))}
              </div>
            </div>

            {/* Action & Client Card */}
            <div className="lg:w-80 space-y-4">
              {/* Client Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={project.client.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {project.client.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{project.client.name}</span>
                        {project.client.verified && (
                          <Shield className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="w-3 h-3 text-secondary fill-secondary" />
                        <span>{project.client.rating}</span>
                        <span className="mx-1">·</span>
                        <span>{project.client.projectsPosted}개 프로젝트</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    <span>{new Date(project.client.joinedAt).toLocaleDateString('ko-KR')} 가입</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              {project.status === 'open' && isTeamLeader && (
                <div className="space-y-2">
                  {hasApplied ? (
                    <Button className="w-full" disabled>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      제안 완료
                    </Button>
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
                          <div>
                            <Label>첨부파일</Label>
                            <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                              <Paperclip className="w-6 h-6 mx-auto mb-2" />
                              <p>포트폴리오, 관련 자료 등을 첨부하세요</p>
                              <Button variant="outline" size="sm" className="mt-2">
                                파일 선택
                              </Button>
                            </div>
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

      {/* Content Tabs */}
      <ScrollReveal animation="fade-up" delay={150}>
        <Tabs defaultValue="description" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="description">상세 설명</TabsTrigger>
          <TabsTrigger value="milestones">마일스톤</TabsTrigger>
          <TabsTrigger value="qna">Q&A ({project.qna.length})</TabsTrigger>
        </TabsList>

        {/* Description Tab */}
        <TabsContent value="description" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none">
                {project.description.split('\n').map((paragraph, i) => {
                  if (paragraph.startsWith('## ')) {
                    return <h2 key={i} className="text-lg font-semibold mt-6 mb-3 first:mt-0">{paragraph.replace('## ', '')}</h2>;
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">프로젝트 마일스톤</h2>
            <div className="text-sm text-muted-foreground">
              총 예산: <span className="font-medium text-foreground">{formatBudget(totalBudget)}</span>
            </div>
          </div>

          {/* Progress */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">진행률</span>
                <span className="text-sm text-muted-foreground">{completedMilestones}/{project.milestones.length} 완료</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>

          {/* Milestone List */}
          <div className="space-y-3">
            {project.milestones.map((milestone, index) => (
              <Card key={milestone.id} className={milestone.status === 'in_progress' ? 'border-secondary/50 bg-secondary/5' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">
                      {getMilestoneIcon(milestone.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{milestone.name}</h3>
                        <span className="font-medium text-primary">{formatBudget(milestone.amount)}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>마일스톤 {index + 1}</span>
                        <span>·</span>
                        <span>{milestone.dueWeek}주차 마감</span>
                        {milestone.status === 'in_progress' && (
                          <>
                            <span>·</span>
                            <StatusBadge status="진행중" variant="secondary" size="sm" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Q&A Tab */}
        <TabsContent value="qna" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">질문과 답변</h2>
            <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
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

          {project.qna.length > 0 ? (
            <div className="space-y-4">
              {project.qna.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">Q</span>
                          <span className="text-xs text-muted-foreground">{item.askedAt}</span>
                        </div>
                        <p className="font-medium">{item.question}</p>
                      </div>
                      <div className="pl-4 border-l-2 border-success/30">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-success/10 text-success">A</span>
                          <span className="text-xs text-muted-foreground">{item.answeredAt}</span>
                        </div>
                        <p className="text-foreground/80">{item.answer}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">아직 등록된 질문이 없습니다</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        </Tabs>
      </ScrollReveal>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
