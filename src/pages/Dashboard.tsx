import { Link } from 'react-router-dom';
import { 
  Users, Briefcase, Trophy, ArrowRight, 
  TrendingUp, Star, Loader2, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCalculatedLevel } from '@/hooks/useCalculatedLevel';
import { AnnouncementsBanner } from '@/components/dashboard/AnnouncementsWidget';
import { BackToTop } from '@/components/ui/BackToTop';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { PROJECT_STATUS } from '@/lib/constants';

export default function Dashboard() {
  const { profile } = useAuth();
  const { myTeams, activeProjects, stats, loading } = useDashboardData();
  const { getLevelBreakdownFromProfile } = useCalculatedLevel();
  
  // Get level breakdown from profile
  const levelBreakdown = profile ? getLevelBreakdownFromProfile(profile as any) : null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'success';
      case 'matched': return 'primary';
      case 'in_progress': return 'secondary';
      case 'completed': return 'muted';
      default: return 'muted';
    }
  };

  const getStatusLabel = (status: string) => {
    return PROJECT_STATUS[status as keyof typeof PROJECT_STATUS]?.name || status;
  };

  return (
    <div className="space-y-6">
      {/* Announcement Banner */}
      <AnnouncementsBanner />
      
      {/* Welcome section */}
      <ScrollReveal animation="fade-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            안녕하세요, {profile?.name || '사용자'}님! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            오늘도 함께 성장해요.
          </p>
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
                  {levelBreakdown ? (
                    <LevelBadge level={levelBreakdown.level} size="sm" />
                  ) : (
                    <p className="text-2xl font-bold">{profile?.level || 1}</p>
                  )}
                  <p className="text-xs text-muted-foreground">직무 레벨</p>
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
                  <p className="text-2xl font-bold">{levelBreakdown?.calculatedLevelScore.toFixed(0) || 0}</p>
                  <p className="text-xs text-muted-foreground">점수</p>
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
                  <p className="text-2xl font-bold">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.teamCount}
                  </p>
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
                  <p className="text-2xl font-bold">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.badgeCount}
                  </p>
                  <p className="text-xs text-muted-foreground">배지</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollReveal>

      {/* Level Progress Card - Replaces old XP Bar */}
      {levelBreakdown && (
        <ScrollReveal animation="fade-up" delay={150}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <LevelBadge level={levelBreakdown.level} score={levelBreakdown.calculatedLevelScore} showScore />
                  <div className="text-sm text-muted-foreground">
                    <span>기술: {levelBreakdown.skillScore.toFixed(0)}점</span>
                    <span className="mx-2">·</span>
                    <span>경험: {levelBreakdown.experienceScore.toFixed(0)}점</span>
                  </div>
                </div>
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    상세보기 <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Main grid - Full width now */}
      <div className="grid lg:grid-cols-2 gap-6">
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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : myTeams.length > 0 ? (
                myTeams.slice(0, 3).map((team) => (
                  <Link 
                    key={team.id}
                    to={`/teams/${team.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl overflow-hidden">
                      {team.emblem_url ? (
                        <img src={team.emblem_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        '🚀'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{team.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <RoleBadge role={team.role} size="sm" showName={false} />
                        <span className="text-xs text-muted-foreground">{team.memberCount}명</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))
              ) : (
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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeProjects.length > 0 ? (
                activeProjects.map((project) => (
                  <Link 
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium line-clamp-1">{project.title}</p>
                      <StatusBadge 
                        status={getStatusLabel(project.status)} 
                        variant={getStatusVariant(project.status)}
                        size="sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span>{project.clientName}</span>
                      {project.totalMilestones > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {project.completedMilestones}/{project.totalMilestones} 마일스톤
                          </span>
                        </>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{project.progress}% 완료</p>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>진행중인 프로젝트가 없습니다</p>
                  <Link to="/projects">
                    <Button variant="link" size="sm">프로젝트 찾아보기</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
