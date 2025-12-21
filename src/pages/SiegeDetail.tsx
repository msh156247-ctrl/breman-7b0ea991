import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Swords, Trophy, Calendar, Users, Clock, 
  Medal, Target, Shield, CheckCircle2, AlertCircle,
  Play, Timer, FileText, ExternalLink, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { SIEGE_STATUS } from '@/lib/constants';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Sample siege data
const siegeDetailData = {
  '1': {
    id: '1',
    title: '2024 겨울 알고리즘 챌린지',
    description: '실력을 겨루는 시간! 다양한 알고리즘 문제를 풀고 최고의 팀을 가려냅니다.',
    fullDescription: `## 대회 소개
2024 겨울 알고리즘 챌린지에 오신 것을 환영합니다! 이번 대회는 팀 단위로 참가하며, 다양한 난이도의 알고리즘 문제를 해결하는 대회입니다.

## 대회 특징
- 팀 협업 중심의 문제 해결
- 실시간 점수 반영
- 다양한 난이도의 문제 출제
- 부분 점수 인정`,
    status: 'registering' as const,
    startAt: '2024-02-01T10:00:00',
    endAt: '2024-02-01T18:00:00',
    sponsors: ['TechCorp', 'CodeLabs', 'AlgoMaster'],
    prizes: [
      { rank: 1, prize: '₩3,000,000', label: '1위', icon: '🥇' },
      { rank: 2, prize: '₩1,500,000', label: '2위', icon: '🥈' },
      { rank: 3, prize: '₩500,000', label: '3위', icon: '🥉' },
      { rank: 4, prize: '₩100,000', label: '4-10위', icon: '🏅' },
    ],
    participants: 128,
    maxTeams: 256,
    registrationEnds: '2024-01-31T23:59:59',
    rules: [
      '팀당 최대 4명까지 참가 가능합니다.',
      '대회 시간 내 외부 도구 사용 가능 (AI 코딩 보조 도구 제외).',
      '문제별 부분 점수가 인정됩니다.',
      '동점 시 먼저 제출한 팀이 높은 순위를 받습니다.',
      '모든 코드는 대회 종료 후 공개될 수 있습니다.',
      '부정행위 적발 시 실격 처리됩니다.',
    ],
    schedule: [
      { time: '09:00', event: '참가자 체크인', description: '온라인 체크인 시작' },
      { time: '09:30', event: '대회 규칙 안내', description: '진행 방식 및 규칙 설명' },
      { time: '10:00', event: '대회 시작', description: '문제 공개 및 풀이 시작' },
      { time: '14:00', event: '중간 점검', description: '현재 순위 공개' },
      { time: '17:30', event: '마지막 제출', description: '최종 제출 마감' },
      { time: '18:00', event: '대회 종료', description: '결과 집계 시작' },
      { time: '19:00', event: '결과 발표', description: '최종 순위 및 시상' },
    ],
    leaderboard: [
      { rank: 1, team: '알고리즘 마스터즈', alias: 'Team A', score: 2450, solved: 5, lastSubmit: '10분 전' },
      { rank: 2, team: '코드 브레이커스', alias: 'Team B', score: 2380, solved: 5, lastSubmit: '25분 전' },
      { rank: 3, team: '로직 워리어즈', alias: 'Team C', score: 2100, solved: 4, lastSubmit: '45분 전' },
      { rank: 4, team: '데이터 크러셔', alias: 'Team D', score: 1950, solved: 4, lastSubmit: '1시간 전' },
      { rank: 5, team: '버그 헌터스', alias: 'Team E', score: 1800, solved: 4, lastSubmit: '1시간 전' },
      { rank: 6, team: '시스템 해커즈', alias: 'Team F', score: 1650, solved: 3, lastSubmit: '2시간 전' },
      { rank: 7, team: '풀스택 파이터즈', alias: 'Team G', score: 1500, solved: 3, lastSubmit: '2시간 전' },
      { rank: 8, team: '클라우드 레이더스', alias: 'Team H', score: 1350, solved: 3, lastSubmit: '3시간 전' },
    ],
    problems: [
      { id: 'p1', name: '배열 정렬', difficulty: 'Easy', points: 100, solvedBy: 95 },
      { id: 'p2', name: '그래프 탐색', difficulty: 'Medium', points: 250, solvedBy: 72 },
      { id: 'p3', name: '동적 프로그래밍', difficulty: 'Medium', points: 350, solvedBy: 45 },
      { id: 'p4', name: '트리 알고리즘', difficulty: 'Hard', points: 500, solvedBy: 28 },
      { id: 'p5', name: '최적화 문제', difficulty: 'Expert', points: 750, solvedBy: 12 },
    ],
  },
  '2': {
    id: '2',
    title: '시스템 설계 마스터즈',
    description: '대규모 시스템 설계 능력을 겨루는 대회. 실제 서비스 아키텍처 설계 문제가 출제됩니다.',
    fullDescription: `## 대회 소개
시스템 설계 마스터즈는 실제 대규모 시스템을 설계하는 능력을 겨루는 대회입니다.

## 평가 기준
- 확장성 (Scalability)
- 가용성 (Availability)
- 성능 (Performance)
- 비용 효율성 (Cost Efficiency)`,
    status: 'ongoing' as const,
    startAt: '2024-01-20T09:00:00',
    endAt: '2024-01-20T21:00:00',
    sponsors: ['CloudGiant', 'InfraCo'],
    prizes: [
      { rank: 1, prize: '₩5,000,000', label: '1위', icon: '🥇' },
      { rank: 2, prize: '₩2,000,000', label: '2위', icon: '🥈' },
      { rank: 3, prize: '₩1,000,000', label: '3위', icon: '🥉' },
    ],
    participants: 64,
    maxTeams: 64,
    registrationEnds: '2024-01-19T23:59:59',
    rules: [
      '팀당 최대 4명까지 참가 가능합니다.',
      '설계 문서는 지정된 템플릿을 사용해야 합니다.',
      '발표 시간은 팀당 15분입니다.',
      '심사위원 질의응답 10분이 포함됩니다.',
    ],
    schedule: [
      { time: '09:00', event: '대회 시작', description: '문제 공개' },
      { time: '15:00', event: '설계 제출 마감', description: '문서 제출' },
      { time: '16:00', event: '발표 시작', description: '팀별 발표' },
      { time: '21:00', event: '결과 발표', description: '시상식' },
    ],
    leaderboard: [
      { rank: 1, team: '아키텍트 팀', alias: 'Arch-01', score: 9200, solved: 3, lastSubmit: '진행중' },
      { rank: 2, team: '클라우드 마스터즈', alias: 'Cloud-02', score: 8900, solved: 3, lastSubmit: '진행중' },
      { rank: 3, team: '인프라 빌더스', alias: 'Infra-03', score: 8500, solved: 2, lastSubmit: '진행중' },
    ],
    problems: [],
  },
  '3': {
    id: '3',
    title: '프론트엔드 챌린지 2023',
    description: 'UI/UX 구현 능력과 성능 최적화 실력을 겨루는 프론트엔드 특화 대회.',
    fullDescription: `## 대회 소개
프론트엔드 개발자를 위한 특화 대회입니다.`,
    status: 'results' as const,
    startAt: '2023-12-15T10:00:00',
    endAt: '2023-12-15T18:00:00',
    sponsors: ['WebFront', 'DesignHub'],
    prizes: [
      { rank: 1, prize: '₩2,000,000', label: '1위', icon: '🥇' },
      { rank: 2, prize: '₩1,000,000', label: '2위', icon: '🥈' },
      { rank: 3, prize: '₩500,000', label: '3위', icon: '🥉' },
    ],
    participants: 96,
    maxTeams: 128,
    registrationEnds: '2023-12-14T23:59:59',
    rules: [],
    schedule: [],
    leaderboard: [
      { rank: 1, team: '프론트 마스터즈', alias: 'FE-Masters', score: 9850, solved: 5, lastSubmit: '완료' },
      { rank: 2, team: 'UI 혁신단', alias: 'UI-Innovators', score: 9720, solved: 5, lastSubmit: '완료' },
      { rank: 3, team: '웹 전사들', alias: 'Web-Warriors', score: 9580, solved: 5, lastSubmit: '완료' },
      { rank: 4, team: '리액트 레전드', alias: 'React-Legends', score: 9200, solved: 4, lastSubmit: '완료' },
      { rank: 5, team: 'CSS 마법사들', alias: 'CSS-Wizards', score: 8900, solved: 4, lastSubmit: '완료' },
    ],
    problems: [],
  },
};

function getStatusVariant(status: keyof typeof SIEGE_STATUS) {
  switch (status) {
    case 'registering': return 'success';
    case 'ongoing': return 'secondary';
    case 'ended': return 'muted';
    case 'results': return 'primary';
    default: return 'muted';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTimeRemaining(dateStr: string): { text: string; urgent: boolean } {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  
  if (diff < 0) return { text: '종료됨', urgent: false };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return { text: `${days}일 ${hours}시간 남음`, urgent: days < 2 };
  if (hours > 0) return { text: `${hours}시간 ${minutes}분 남음`, urgent: hours < 6 };
  return { text: `${minutes}분 남음`, urgent: true };
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy': return 'text-success';
    case 'Medium': return 'text-secondary';
    case 'Hard': return 'text-destructive';
    case 'Expert': return 'text-primary';
    default: return 'text-muted-foreground';
  }
}

export default function SiegeDetail() {
  const { siegeId } = useParams();
  const { toast } = useToast();
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamAlias, setTeamAlias] = useState('');
  const [showRealNames, setShowRealNames] = useState(false);

  const siege = siegeDetailData[siegeId as keyof typeof siegeDetailData];

  // Simulate live updates for ongoing siege
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    if (siege?.status === 'ongoing') {
      const interval = setInterval(() => setLiveTime(new Date()), 60000);
      return () => clearInterval(interval);
    }
  }, [siege?.status]);

  if (!siege) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">대회를 찾을 수 없습니다</h2>
        <Link to="/siege">
          <Button>대회 목록으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  // Mock user's teams
  const userTeams = [
    { id: 't1', name: '스타트업 드림팀' },
    { id: 't2', name: '알고리즘 스터디' },
  ];
  const isRegistered = false;
  const registrationTimeLeft = getTimeRemaining(siege.registrationEnds);

  const handleRegister = () => {
    if (!selectedTeam || !teamAlias) {
      toast({
        title: '입력 필요',
        description: '팀과 대회용 별명을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: '등록 완료!',
      description: `${siege.title}에 성공적으로 등록되었습니다.`,
    });
    setRegisterDialogOpen(false);
    setSelectedTeam('');
    setTeamAlias('');
  };

  const totalPrize = siege.prizes.reduce((sum, p) => {
    const amount = parseInt(p.prize.replace(/[^\d]/g, ''));
    return sum + amount;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/siege" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>대회 목록</span>
      </Link>

      {/* Siege header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-accent/80 to-primary border">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative p-6 md:p-8 text-primary-foreground">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Swords className="w-8 h-8" />
                <StatusBadge 
                  status={SIEGE_STATUS[siege.status].name} 
                  variant={getStatusVariant(siege.status)}
                />
              </div>
              <h1 className="text-2xl md:text-4xl font-display font-bold">{siege.title}</h1>
              <p className="text-primary-foreground/80 text-lg max-w-2xl">{siege.description}</p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-foreground/70" />
                  <span>{formatDate(siege.startAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-foreground/70" />
                  <span>{formatTime(siege.startAt)} - {formatTime(siege.endAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-foreground/70" />
                  <span>{siege.participants} / {siege.maxTeams} 팀</span>
                </div>
              </div>
            </div>

            {/* Prize & Action */}
            <div className="lg:w-72 space-y-4">
              <div className="text-center lg:text-right">
                <p className="text-primary-foreground/70 text-sm mb-1">총 상금</p>
                <p className="text-4xl font-display font-bold">₩{totalPrize.toLocaleString()}</p>
              </div>

              {siege.status === 'registering' && (
                <div className="space-y-2">
                  {isRegistered ? (
                    <Button variant="secondary" className="w-full" disabled>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      등록 완료
                    </Button>
                  ) : (
                    <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="lg" className="w-full">
                          <Target className="w-5 h-5 mr-2" />
                          참가 등록
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>대회 참가 등록</DialogTitle>
                          <DialogDescription>
                            {siege.title}에 참가할 팀을 선택해주세요.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>참가 팀 선택</Label>
                            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                              <SelectTrigger>
                                <SelectValue placeholder="팀 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {userTeams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>대회용 별명 (Alias)</Label>
                            <Input 
                              placeholder="예: Team Alpha"
                              value={teamAlias}
                              onChange={(e) => setTeamAlias(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              대회 진행 중 리더보드에 표시될 이름입니다.
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>
                            취소
                          </Button>
                          <Button onClick={handleRegister} className="bg-gradient-primary">
                            등록하기
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <div className={`text-center text-sm ${registrationTimeLeft.urgent ? 'text-destructive font-medium' : 'text-primary-foreground/70'}`}>
                    <Timer className="w-4 h-4 inline mr-1" />
                    등록 마감: {registrationTimeLeft.text}
                  </div>
                </div>
              )}

              {siege.status === 'ongoing' && (
                <Button variant="secondary" size="lg" className="w-full">
                  <Play className="w-5 h-5 mr-2" />
                  대회장 입장
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prizes Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {siege.prizes.map((prize, i) => (
          <Card key={i} className={i === 0 ? 'border-tier-gold/50 bg-tier-gold/5' : ''}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">{prize.icon}</div>
              <p className="text-sm text-muted-foreground">{prize.label}</p>
              <p className="text-xl font-bold">{prize.prize}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue={siege.status === 'ongoing' || siege.status === 'results' ? 'leaderboard' : 'info'} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="info">대회 정보</TabsTrigger>
          <TabsTrigger value="schedule">일정</TabsTrigger>
          <TabsTrigger value="rules">규칙</TabsTrigger>
          <TabsTrigger value="leaderboard">
            리더보드
            {siege.status === 'ongoing' && (
              <span className="ml-2 w-2 h-2 rounded-full bg-success animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none">
                {siege.fullDescription.split('\n').map((paragraph, i) => {
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

          {/* Sponsors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                스폰서
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {siege.sponsors.map((sponsor, i) => (
                  <div 
                    key={i} 
                    className="px-6 py-4 rounded-lg bg-muted/50 border font-medium"
                  >
                    {sponsor}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                대회 일정
              </CardTitle>
            </CardHeader>
            <CardContent>
              {siege.schedule.length > 0 ? (
                <div className="space-y-4">
                  {siege.schedule.map((item, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-16 text-right font-mono font-bold text-primary">
                        {item.time}
                      </div>
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-primary mt-1.5" />
                        {i < siege.schedule.length - 1 && (
                          <div className="absolute top-4 left-1 w-0.5 h-12 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <h4 className="font-semibold">{item.event}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">일정이 등록되지 않았습니다.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                대회 규칙
              </CardTitle>
            </CardHeader>
            <CardContent>
              {siege.rules.length > 0 ? (
                <ol className="space-y-3">
                  {siege.rules.map((rule, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-foreground/80">{rule}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-center text-muted-foreground py-8">규칙이 등록되지 않았습니다.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          {siege.status === 'ongoing' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                실시간 업데이트 중
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowRealNames(!showRealNames)}
              >
                {showRealNames ? '별명 표시' : '실제 팀명 표시'}
              </Button>
            </div>
          )}

          {siege.status === 'results' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Trophy className="w-4 h-4 text-secondary" />
              최종 결과
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-4 font-medium">순위</th>
                      <th className="text-left p-4 font-medium">팀</th>
                      <th className="text-right p-4 font-medium">점수</th>
                      <th className="text-right p-4 font-medium hidden sm:table-cell">해결</th>
                      <th className="text-right p-4 font-medium hidden md:table-cell">최근 제출</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siege.leaderboard.map((entry, i) => (
                      <tr 
                        key={i} 
                        className={`border-b last:border-0 transition-colors hover:bg-muted/20 ${
                          entry.rank <= 3 ? 'bg-tier-gold/5' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {entry.rank === 1 && <Crown className="w-5 h-5 text-tier-gold" />}
                            {entry.rank === 2 && <Medal className="w-5 h-5 text-tier-silver" />}
                            {entry.rank === 3 && <Medal className="w-5 h-5 text-tier-bronze" />}
                            {entry.rank > 3 && <span className="w-5 text-center text-muted-foreground">{entry.rank}</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-semibold">
                              {siege.status === 'ongoing' && !showRealNames ? entry.alias : entry.team}
                            </p>
                            {siege.status === 'ongoing' && showRealNames && (
                              <p className="text-xs text-muted-foreground">{entry.alias}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-bold text-primary">{entry.score.toLocaleString()}</span>
                        </td>
                        <td className="p-4 text-right hidden sm:table-cell">
                          <span className="text-muted-foreground">{entry.solved}문제</span>
                        </td>
                        <td className="p-4 text-right hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">{entry.lastSubmit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Problems (if available) */}
          {siege.problems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  문제 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {siege.problems.map((problem, i) => (
                    <div key={problem.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">#{i + 1}</span>
                        <span className="font-medium">{problem.name}</span>
                        <span className={`text-sm ${getDifficultyColor(problem.difficulty)}`}>
                          {problem.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">{problem.solvedBy}팀 해결</span>
                        <span className="font-bold text-primary">{problem.points}점</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
