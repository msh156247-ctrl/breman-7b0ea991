import { Link } from 'react-router-dom';
import { 
  Users, Briefcase, Swords, Bell, Trophy, ArrowRight, 
  Calendar, TrendingUp, Star, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { XPBar } from '@/components/ui/XPBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { AnnouncementsBanner, AnnouncementsWidget } from '@/components/dashboard/AnnouncementsWidget';
import { BackToTop } from '@/components/ui/BackToTop';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

// Sample data for demo
const myTeams = [
  { id: '1', name: '스타트업 드림팀', emblem: '🚀', role: 'horse' as const, members: 4 },
  { id: '2', name: '웹개발 마스터즈', emblem: '💻', role: 'rooster' as const, members: 5 },
];

const activeProjects = [
  { id: '1', title: 'AI 기반 고객 서비스 챗봇', client: '테크스타트', status: '진행중', progress: 65 },
  { id: '2', title: 'E-commerce 리뉴얼 프로젝트', client: '쇼핑몰코리아', status: '검토중', progress: 30 },
];

const upcomingSiege = {
  title: '2024 겨울 알고리즘 챌린지',
  startsIn: '3일',
  prize: '₩5,000,000',
  participants: 128,
};

const notifications = [
  { id: '1', type: 'team_invite', message: '디자인팩토리에서 팀 초대가 왔습니다', time: '10분 전' },
  { id: '2', type: 'project', message: '새 프로젝트 제안이 도착했습니다', time: '1시간 전' },
  { id: '3', type: 'milestone', message: '마일스톤 검토가 완료되었습니다', time: '3시간 전' },
];

export default function Dashboard() {
  const { profile } = useAuth();
  
  // Calculate XP for next level (simple formula)
  const currentXP = profile?.xp || 0;
  const level = profile?.level || 1;
  const maxXP = level * 1000;

  return (
    <div className="space-y-6">
      {/* Announcement Banner */}
      <AnnouncementsBanner />
      
      {/* Welcome section */}
      <ScrollReveal animation="fade-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              안녕하세요, {profile?.name || '사용자'}님! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              오늘도 함께 성장해요.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/teams/create">
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                팀 만들기
              </Button>
            </Link>
            <Link to="/projects">
              <Button size="sm" className="bg-gradient-primary">
                <Briefcase className="w-4 h-4 mr-2" />
                프로젝트 찾기
              </Button>
            </Link>
          </div>
        </div>
      </ScrollReveal>

      {/* Stats cards */}
      <ScrollReveal animation="fade-up" delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{level}</p>
                  <p className="text-xs text-muted-foreground">레벨</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentXP.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{myTeams.length}</p>
                  <p className="text-xs text-muted-foreground">소속 팀</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">5</p>
                  <p className="text-xs text-muted-foreground">배지</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollReveal>

      {/* XP Progress */}
      <ScrollReveal animation="fade-up" delay={150}>
        <Card>
          <CardContent className="p-4">
            <XPBar current={currentXP} max={maxXP} level={level} />
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Teams & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Teams */}
          <ScrollReveal animation="fade-up" delay={200}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-display">내 팀</CardTitle>
                <Link to="/teams">
                  <Button variant="ghost" size="sm" className="text-primary">
                    전체 보기 <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {myTeams.length > 0 ? myTeams.map((team) => (
                  <Link 
                    key={team.id}
                    to={`/teams/${team.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
                      {team.emblem}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{team.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <RoleBadge role={team.role} size="sm" showName={false} />
                        <span className="text-xs text-muted-foreground">{team.members}명</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>아직 소속된 팀이 없습니다</p>
                    <Link to="/teams">
                      <Button variant="link" size="sm">팀 찾아보기</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Active Projects */}
          <ScrollReveal animation="fade-up" delay={250}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-display">진행중인 프로젝트</CardTitle>
                <Link to="/projects">
                  <Button variant="ghost" size="sm" className="text-primary">
                    전체 보기 <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeProjects.map((project) => (
                  <Link 
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium line-clamp-1">{project.title}</p>
                      <StatusBadge 
                        status={project.status} 
                        variant={project.status === '진행중' ? 'primary' : 'secondary'}
                        size="sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span>{project.client}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{project.progress}% 완료</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        {/* Right column - Siege, Notifications, Announcements */}
        <div className="space-y-6">
          {/* Upcoming Siege */}
          <ScrollReveal animation="fade-up" delay={200}>
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary to-accent p-4 text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Swords className="w-5 h-5" />
                  <span className="text-sm font-medium">다가오는 Siege</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-3">{upcomingSiege.title}</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background/20 rounded-lg p-2">
                    <p className="text-lg font-bold">{upcomingSiege.startsIn}</p>
                    <p className="text-xs opacity-80">시작까지</p>
                  </div>
                  <div className="bg-background/20 rounded-lg p-2">
                    <p className="text-lg font-bold">{upcomingSiege.prize}</p>
                    <p className="text-xs opacity-80">상금</p>
                  </div>
                  <div className="bg-background/20 rounded-lg p-2">
                    <p className="text-lg font-bold">{upcomingSiege.participants}</p>
                    <p className="text-xs opacity-80">참가팀</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <Link to="/siege">
                  <Button className="w-full">참가 신청하기</Button>
                </Link>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Notifications */}
          <ScrollReveal animation="fade-up" delay={250}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-display">알림</CardTitle>
                <Bell className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Announcements - Now using real data */}
          <ScrollReveal animation="fade-up" delay={300}>
            <AnnouncementsWidget />
          </ScrollReveal>
        </div>
      </div>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
