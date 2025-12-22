import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { SIEGE_STATUS } from '@/lib/constants';
import { 
  ArrowLeft, Calendar, Clock, Users, Trophy, Award, 
  FileText, Shield, Play, Send, ExternalLink, Crown,
  Medal, Target, Zap, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Mock data
const siegeData = {
  id: '1',
  title: '2024 Winter Algorithm Championship',
  description: '겨울을 뜨겁게 달굴 알고리즘 대회! 최고의 팀을 가리는 치열한 경쟁이 시작됩니다. 다양한 난이도의 문제를 풀어 팀의 실력을 증명하세요.',
  status: 'registering' as 'registering' | 'ongoing' | 'ended' | 'results',
  startAt: '2024-02-01T09:00:00',
  endAt: '2024-02-03T18:00:00',
  registrationDeadline: '2024-01-28T23:59:59',
  maxTeams: 64,
  currentTeams: 42,
  sponsors: ['TechCorp', 'DevStudio', 'CloudInc'],
  prizes: [
    { place: 1, reward: '₩5,000,000', badge: '🥇 챔피언' },
    { place: 2, reward: '₩3,000,000', badge: '🥈 준우승' },
    { place: 3, reward: '₩1,000,000', badge: '🥉 3위' },
    { place: 4, reward: '₩500,000', badge: '🏅 4위' },
    { place: 5, reward: '₩500,000', badge: '🏅 5위' },
  ],
  rules: `
## 대회 규칙

### 참가 자격
- 4인 1팀 (말, 개, 고양이, 닭 각 1명씩 필수)
- 팀 평균 레벨 3 이상
- 팀 리더만 등록 가능

### 진행 방식
1. **예선**: 온라인 알고리즘 문제 풀이 (3시간)
2. **본선**: 상위 16팀 토너먼트 (오프라인)
3. **결승**: 상위 4팀 최종 대결

### 채점 기준
- 정확도: 60%
- 시간 효율성: 25%
- 코드 품질: 15%

### 금지 사항
- 외부 도움 요청 금지
- AI 코드 생성 도구 사용 금지
- 다른 팀과의 코드 공유 금지

### 기타
- 모든 참가자는 대회 시작 30분 전까지 입장 필수
- 기술적 문제 발생 시 운영진에게 즉시 문의
  `,
  schedule: [
    { time: '2024-02-01 09:00', event: '대회 시작 / 문제 공개', type: 'start' },
    { time: '2024-02-01 12:00', event: '점심 휴식', type: 'break' },
    { time: '2024-02-01 13:00', event: '오후 세션 시작', type: 'session' },
    { time: '2024-02-01 18:00', event: '1일차 종료', type: 'end' },
    { time: '2024-02-02 09:00', event: '2일차 시작', type: 'start' },
    { time: '2024-02-02 18:00', event: '예선 종료', type: 'end' },
    { time: '2024-02-03 10:00', event: '본선 시작', type: 'start' },
    { time: '2024-02-03 16:00', event: '결승전', type: 'final' },
    { time: '2024-02-03 18:00', event: '시상식 및 폐회', type: 'ceremony' },
  ],
};

const leaderboardData = [
  { rank: 1, teamName: '알고리즘 마스터즈', alias: 'Team_Alpha', score: 2850, submissions: 12, lastSubmit: '5분 전' },
  { rank: 2, teamName: '코드 닌자', alias: 'Team_Beta', score: 2720, submissions: 11, lastSubmit: '12분 전' },
  { rank: 3, teamName: '버그 헌터스', alias: 'Team_Gamma', score: 2680, submissions: 10, lastSubmit: '8분 전' },
  { rank: 4, teamName: '데이터 크루', alias: 'Team_Delta', score: 2550, submissions: 9, lastSubmit: '20분 전' },
  { rank: 5, teamName: '로직 레전드', alias: 'Team_Epsilon', score: 2480, submissions: 11, lastSubmit: '3분 전' },
  { rank: 6, teamName: '풀스택 파이터스', alias: 'Team_Zeta', score: 2350, submissions: 8, lastSubmit: '15분 전' },
  { rank: 7, teamName: '디버그 드래곤즈', alias: 'Team_Eta', score: 2200, submissions: 10, lastSubmit: '25분 전' },
  { rank: 8, teamName: '클린 코더스', alias: 'Team_Theta', score: 2150, submissions: 7, lastSubmit: '30분 전' },
];

const myTeams = [
  { id: '1', name: '브래맨 올스타즈', avgLevel: 5.2 },
  { id: '2', name: '코드 크루세이더', avgLevel: 4.1 },
];

export default function SiegeDetail() {
  const { siegeId } = useParams();
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamAlias, setTeamAlias] = useState('');
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  const siege = siegeData;
  const statusInfo = SIEGE_STATUS[siege.status];
  const registrationProgress = (siege.currentTeams / siege.maxTeams) * 100;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRegister = async () => {
    if (!selectedTeam || !teamAlias.trim()) {
      toast.error('팀과 별칭을 모두 입력해주세요.');
      return;
    }

    setIsRegistering(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRegistering(false);
    setRegisterDialogOpen(false);
    toast.success('Siege 등록이 완료되었습니다! 🎉');
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-mono">{rank}</span>;
  };

  const getScheduleIcon = (type: string) => {
    switch (type) {
      case 'start': return <Play className="h-4 w-4 text-success" />;
      case 'end': return <Target className="h-4 w-4 text-destructive" />;
      case 'break': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'final': return <Zap className="h-4 w-4 text-secondary" />;
      case 'ceremony': return <Award className="h-4 w-4 text-primary" />;
      default: return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/siege">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{siege.title}</h1>
            <StatusBadge status={statusInfo.name} variant={statusInfo.color as any} />
          </div>
          <p className="text-muted-foreground">{siege.description}</p>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">시작일</p>
              <p className="font-semibold text-sm">{formatDate(siege.startAt)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">종료일</p>
              <p className="font-semibold text-sm">{formatDate(siege.endAt)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">참가 팀</p>
              <p className="font-semibold text-sm">{siege.currentTeams} / {siege.maxTeams}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Trophy className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">총 상금</p>
              <p className="font-semibold text-sm">₩10,000,000</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registration Progress */}
      {siege.status === 'registering' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="font-medium">등록 마감까지</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDate(siege.registrationDeadline)}
              </span>
            </div>
            <Progress value={registrationProgress} className="h-2 mb-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{siege.currentTeams}팀 등록 완료</span>
              <span className="text-muted-foreground">{siege.maxTeams - siege.currentTeams}자리 남음</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="schedule">일정</TabsTrigger>
          <TabsTrigger value="rules">규칙</TabsTrigger>
          <TabsTrigger value="leaderboard">리더보드</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Prizes */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-secondary" />
                  상금 및 보상
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {siege.prizes.map((prize) => (
                  <div
                    key={prize.place}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      prize.place === 1 
                        ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20' 
                        : prize.place === 2 
                        ? 'bg-gradient-to-r from-gray-300/10 to-gray-400/10 border border-gray-400/20'
                        : prize.place === 3
                        ? 'bg-gradient-to-r from-amber-600/10 to-orange-500/10 border border-amber-600/20'
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{prize.badge.split(' ')[0]}</span>
                      <span className="font-medium">{prize.place}위</span>
                    </div>
                    <span className="font-bold text-lg">{prize.reward}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Sponsors */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  스폰서
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {siege.sponsors.map((sponsor) => (
                    <div
                      key={sponsor}
                      className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center border border-border/50"
                    >
                      <span className="font-semibold text-muted-foreground">{sponsor}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registration CTA */}
          {siege.status === 'registering' && (
            <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">지금 바로 참가하세요!</h3>
                  <p className="text-muted-foreground">
                    팀을 이끌고 최고의 자리에 도전하세요. 등록 마감이 임박했습니다.
                  </p>
                </div>
                <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2 whitespace-nowrap">
                      <Shield className="h-4 w-4" />
                      팀 등록하기
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Siege 참가 등록</DialogTitle>
                      <DialogDescription>
                        참가할 팀을 선택하고 대회 중 사용할 별칭을 입력하세요.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>참가 팀 선택</Label>
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                          <SelectTrigger>
                            <SelectValue placeholder="팀을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {myTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name} (Lv. {team.avgLevel})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="alias">팀 별칭 (리더보드에 표시)</Label>
                        <Input
                          id="alias"
                          value={teamAlias}
                          onChange={(e) => setTeamAlias(e.target.value)}
                          placeholder="예: Team_Breman"
                          maxLength={20}
                        />
                        <p className="text-xs text-muted-foreground">
                          대회 진행 중에는 별칭으로만 표시되며, 결과 발표 시 실제 팀명이 공개됩니다.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>
                        취소
                      </Button>
                      <Button onClick={handleRegister} disabled={isRegistering}>
                        {isRegistering ? '등록 중...' : '등록 완료'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Participant Actions (when ongoing) */}
          {siege.status === 'ongoing' && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>참가자 영역</CardTitle>
                <CardDescription>대회 진행 중 사용할 수 있는 기능입니다.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  IDE 열기
                </Button>
                <Button variant="outline" className="gap-2">
                  <Send className="h-4 w-4" />
                  테스트 제출 (3/5)
                </Button>
                <Button className="gap-2">
                  <Send className="h-4 w-4" />
                  최종 제출
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                대회 일정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-6">
                  {siege.schedule.map((item, index) => (
                    <div key={index} className="flex gap-4 relative">
                      <div className="w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center z-10">
                        {getScheduleIcon(item.type)}
                      </div>
                      <div className="flex-1 pt-2">
                        <p className="font-medium">{item.event}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.time).toLocaleString('ko-KR', {
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                대회 규칙
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-primary" />
                      참가 자격
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>4인 1팀 (말, 개, 고양이, 닭 각 1명씩 필수)</li>
                      <li>팀 평균 레벨 3 이상</li>
                      <li>팀 리더만 등록 가능</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                      <Target className="h-5 w-5 text-secondary" />
                      진행 방식
                    </h3>
                    <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                      <li><strong>예선:</strong> 온라인 알고리즘 문제 풀이 (3시간)</li>
                      <li><strong>본선:</strong> 상위 16팀 토너먼트 (오프라인)</li>
                      <li><strong>결승:</strong> 상위 4팀 최종 대결</li>
                    </ol>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                      <Award className="h-5 w-5 text-success" />
                      채점 기준
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>정확도</span>
                        <div className="flex items-center gap-2">
                          <Progress value={60} className="w-32 h-2" />
                          <span className="text-sm font-medium w-12">60%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>시간 효율성</span>
                        <div className="flex items-center gap-2">
                          <Progress value={25} className="w-32 h-2" />
                          <span className="text-sm font-medium w-12">25%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>코드 품질</span>
                        <div className="flex items-center gap-2">
                          <Progress value={15} className="w-32 h-2" />
                          <span className="text-sm font-medium w-12">15%</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-destructive">
                      <Shield className="h-5 w-5" />
                      금지 사항
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>외부 도움 요청 금지</li>
                      <li>AI 코드 생성 도구 사용 금지</li>
                      <li>다른 팀과의 코드 공유 금지</li>
                    </ul>
                  </section>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-secondary" />
                  실시간 리더보드
                </CardTitle>
                <Badge variant="outline" className="gap-1">
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  Live
                </Badge>
              </div>
              <CardDescription>
                {siege.status === 'ongoing' 
                  ? '대회 진행 중에는 팀 별칭으로 표시됩니다.' 
                  : siege.status === 'results'
                  ? '최종 결과가 공개되었습니다.'
                  : '대회 시작 후 리더보드가 활성화됩니다.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {siege.status === 'registering' ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>대회 시작 후 리더보드가 표시됩니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboardData.map((team, index) => (
                    <div
                      key={team.rank}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                        team.rank <= 3 
                          ? 'bg-gradient-to-r from-primary/5 to-transparent border border-primary/10' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="w-8 flex items-center justify-center">
                        {getRankIcon(team.rank)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">
                          {siege.status === 'results' ? team.teamName : team.alias}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {team.submissions}회 제출 · 마지막 제출: {team.lastSubmit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{team.score.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">점</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
