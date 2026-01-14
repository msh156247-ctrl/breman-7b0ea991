import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords, Trophy, Calendar, Users, Clock, ChevronRight, Medal, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CHALLENGE_STATUS } from '@/lib/constants';
import { BackToTop } from '@/components/ui/BackToTop';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

// Sample data
const siegeData = [
  {
    id: '1',
    title: '2024 겨울 알고리즘 챌린지',
    description: '실력을 겨루는 시간! 다양한 알고리즘 문제를 풀고 최고의 팀을 가려냅니다.',
    status: 'registering' as const,
    startAt: '2024-02-01T10:00:00',
    endAt: '2024-02-01T18:00:00',
    sponsors: ['TechCorp', 'CodeLabs', 'AlgoMaster'],
    prizes: [
      { rank: 1, prize: '₩3,000,000', label: '1위' },
      { rank: 2, prize: '₩1,500,000', label: '2위' },
      { rank: 3, prize: '₩500,000', label: '3위' },
    ],
    participants: 128,
    maxTeams: 256,
    registrationEnds: '2024-01-31T23:59:59',
  },
  {
    id: '2',
    title: '시스템 설계 마스터즈',
    description: '대규모 시스템 설계 능력을 겨루는 대회. 실제 서비스 아키텍처 설계 문제가 출제됩니다.',
    status: 'ongoing' as const,
    startAt: '2024-01-20T09:00:00',
    endAt: '2024-01-20T21:00:00',
    sponsors: ['CloudGiant', 'InfraCo'],
    prizes: [
      { rank: 1, prize: '₩5,000,000', label: '1위' },
      { rank: 2, prize: '₩2,000,000', label: '2위' },
      { rank: 3, prize: '₩1,000,000', label: '3위' },
    ],
    participants: 64,
    maxTeams: 64,
    registrationEnds: '2024-01-19T23:59:59',
  },
  {
    id: '3',
    title: '프론트엔드 챌린지 2023',
    description: 'UI/UX 구현 능력과 성능 최적화 실력을 겨루는 프론트엔드 특화 대회.',
    status: 'results' as const,
    startAt: '2023-12-15T10:00:00',
    endAt: '2023-12-15T18:00:00',
    sponsors: ['WebFront', 'DesignHub'],
    prizes: [
      { rank: 1, prize: '₩2,000,000', label: '1위' },
      { rank: 2, prize: '₩1,000,000', label: '2위' },
      { rank: 3, prize: '₩500,000', label: '3위' },
    ],
    participants: 96,
    maxTeams: 128,
    results: [
      { rank: 1, team: '프론트 마스터즈', score: 9850 },
      { rank: 2, team: 'UI 혁신단', score: 9720 },
      { rank: 3, team: '웹 전사들', score: 9580 },
    ],
  },
];

function getStatusVariant(status: keyof typeof CHALLENGE_STATUS) {
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTimeRemaining(dateStr: string): string {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  
  if (diff < 0) return '종료됨';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  return `${hours}시간 남음`;
}

export default function Challenge() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredChallenges = siegeData.filter((challenge) => {
    return statusFilter === 'all' || challenge.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
              <Swords className="w-8 h-8 text-primary" />
              챌린지
            </h1>
            <p className="text-muted-foreground mt-1">팀과 함께 대회에 참가하세요</p>
          </div>
        </div>
      </ScrollReveal>

      {/* Featured Challenge */}
      {siegeData.find(s => s.status === 'registering') && (
        <ScrollReveal animation="fade-up" delay={100}>
          <Card className="overflow-hidden border-2 border-primary/20">
            <div className="bg-gradient-to-r from-primary via-accent to-primary p-6 text-primary-foreground">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5" />
                    <span className="text-sm font-medium">참가 등록 중</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
                    {siegeData[0].title}
                  </h2>
                  <p className="text-primary-foreground/80 max-w-xl">
                    {siegeData[0].description}
                  </p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="text-4xl font-display font-bold">
                    {siegeData[0].prizes[0].prize}
                  </div>
                  <p className="text-sm text-primary-foreground/80">총 상금</p>
                  <Link to={`/challenges/${siegeData[0].id}`}>
                    <Button variant="secondary" size="lg">
                      자세히 보기
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <Calendar className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">시작 일시</p>
                  <p className="font-medium">{formatDate(siegeData[0].startAt)}</p>
                </div>
                <div>
                  <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">등록 마감</p>
                  <p className="font-medium text-destructive">
                    {getTimeRemaining(siegeData[0].registrationEnds)}
                  </p>
                </div>
                <div>
                  <Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">참가 팀</p>
                  <p className="font-medium">{siegeData[0].participants} / {siegeData[0].maxTeams}</p>
                </div>
                <div>
                  <Trophy className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">스폰서</p>
                  <p className="font-medium">{siegeData[0].sponsors.length}개 기업</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Tabs */}
      <ScrollReveal animation="fade-up" delay={150}>
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setStatusFilter('all')}>전체</TabsTrigger>
            <TabsTrigger value="registering" onClick={() => setStatusFilter('registering')}>등록중</TabsTrigger>
            <TabsTrigger value="ongoing" onClick={() => setStatusFilter('ongoing')}>진행중</TabsTrigger>
            <TabsTrigger value="results" onClick={() => setStatusFilter('results')}>결과발표</TabsTrigger>
          </TabsList>
        </Tabs>
      </ScrollReveal>

      {/* Challenge list */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredChallenges.map((challenge, index) => (
          <ScrollReveal key={challenge.id} animation="fade-up" delay={200 + index * 50}>
            <Link to={`/challenges/${challenge.id}`}>
              <Card className="h-full hover:shadow-md transition-all hover:border-primary/30 cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-display text-lg">{challenge.title}</CardTitle>
                    <StatusBadge 
                      status={CHALLENGE_STATUS[challenge.status].name}
                      variant={getStatusVariant(challenge.status)}
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {challenge.description}
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Prizes */}
                  <div className="flex gap-3 mb-4">
                    {challenge.prizes.map((prize, i) => (
                      <div 
                        key={i}
                        className={`flex-1 text-center p-3 rounded-lg ${
                          i === 0 ? 'bg-tier-gold/10' : i === 1 ? 'bg-tier-silver/10' : 'bg-tier-bronze/10'
                        }`}
                      >
                        <Medal className={`w-5 h-5 mx-auto mb-1 ${
                          i === 0 ? 'text-tier-gold' : i === 1 ? 'text-tier-silver' : 'text-tier-bronze'
                        }`} />
                        <p className="text-xs text-muted-foreground">{prize.label}</p>
                        <p className="font-bold text-sm">{prize.prize}</p>
                      </div>
                    ))}
                  </div>

                  {/* Results (if available) */}
                  {challenge.status === 'results' && challenge.results && (
                    <div className="mb-4 p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2">최종 순위</p>
                      {challenge.results.slice(0, 3).map((result, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1">
                          <span className="font-medium">{result.rank}. {result.team}</span>
                          <span className="text-muted-foreground">{result.score.toLocaleString()}점</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(challenge.startAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{challenge.participants}팀</span>
                    </div>
                  </div>

                  {/* Sponsors */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">스폰서:</span>
                    <div className="flex gap-2">
                      {challenge.sponsors.slice(0, 3).map((sponsor, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded bg-muted">{sponsor}</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      {filteredChallenges.length === 0 && (
        <div className="text-center py-16">
          <Swords className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">대회가 없습니다</h3>
          <p className="text-muted-foreground">새로운 대회가 곧 열립니다!</p>
        </div>
      )}

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
