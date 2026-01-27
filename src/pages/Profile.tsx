import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Edit, Calendar, Star, Users, Briefcase, Award, 
  ChevronRight, Trophy, Code, Mail, ClipboardList, X, RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { ROLES, ROLE_TYPES, ANIMAL_SKINS, APPLICATION_STATUS, type RoleType, type AnimalSkin } from '@/lib/constants';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { SkillManagement } from '@/components/profile/SkillManagement';
import { RoleTypeManagement } from '@/components/profile/RoleTypeManagement';
import { AnimalSkinManagement } from '@/components/profile/AnimalSkinManagement';
import { LevelBreakdownCard } from '@/components/profile/LevelBreakdownCard';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { useCalculatedLevel, type LevelBreakdown } from '@/hooks/useCalculatedLevel';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const userTeams = [
  { id: '1', name: '스타트업 드림팀', emblem: '🚀', role: 'horse' as const, members: 4 },
  { id: '2', name: '웹개발 마스터즈', emblem: '💻', role: 'rooster' as const, members: 5 },
];

const userBadges = [
  { id: '1', name: '첫 프로젝트 완료', icon: '🎯', description: '첫 프로젝트를 성공적으로 완료했습니다', earnedAt: '2024-01-10' },
  { id: '2', name: '팀 빌더', icon: '👥', description: '첫 팀을 만들었습니다', earnedAt: '2024-01-05' },
  { id: '3', name: 'Siege 참가자', icon: '⚔️', description: 'Siege 대회에 처음 참가했습니다', earnedAt: '2024-01-15' },
  { id: '4', name: '스킬 마스터', icon: '💪', description: '첫 스킬을 골드 티어로 올렸습니다', earnedAt: '2024-01-20' },
  { id: '5', name: '완벽한 리뷰', icon: '⭐', description: '5점 만점 리뷰를 받았습니다', earnedAt: '2024-01-25' },
];

const userExperiences = [
  { 
    id: '1',
    company: '테크스타트업',
    role: '시니어 풀스택 개발자',
    period: '2022.03 - 현재',
    description: 'React/Node.js 기반 SaaS 플랫폼 개발 및 팀 리드'
  },
  { 
    id: '2',
    company: '디지털 에이전시',
    role: '프론트엔드 개발자',
    period: '2020.01 - 2022.02',
    description: '다양한 클라이언트 프로젝트 프론트엔드 개발'
  },
];

const userReviews = [
  { 
    id: '1',
    from: '테크스타트 (클라이언트)',
    project: 'AI 챗봇 개발',
    rating: 5,
    comment: '기술력과 커뮤니케이션 모두 훌륭했습니다. 일정도 완벽히 준수해주셨어요.',
    date: '2024-01-20'
  },
  { 
    id: '2',
    from: '쇼핑몰코리아 (클라이언트)',
    project: 'E-commerce 리뉴얼',
    rating: 5,
    comment: '디자인과 성능 모두 기대 이상이었습니다. 다음 프로젝트도 함께하고 싶어요.',
    date: '2024-01-15'
  },
];

export default function Profile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<{ id: string; teamName: string; isPending: boolean } | null>(null);
  
  const role = profile?.primary_role || 'horse';
  const animalSkin = (profile?.animal_skin as AnimalSkin) || 'horse';
  const animalSkinData = ANIMAL_SKINS[animalSkin];
  
  const { calculateLevel, getLevelBreakdownFromProfile, isCalculating } = useCalculatedLevel();
  const [levelBreakdown, setLevelBreakdown] = useState<LevelBreakdown | null>(null);

  // Get level breakdown from profile data
  useEffect(() => {
    if (profile) {
      const breakdown = getLevelBreakdownFromProfile(profile as any);
      setLevelBreakdown(breakdown);
    }
  }, [profile, getLevelBreakdownFromProfile]);

  // Recalculate level on demand
  const handleRecalculateLevel = async () => {
    if (user?.id) {
      const result = await calculateLevel(user.id);
      if (result) {
        setLevelBreakdown(result);
        toast({
          title: '레벨 재계산 완료',
          description: `현재 레벨: Lv.${result.level} (${result.calculatedLevelScore.toFixed(1)}점)`,
        });
      }
    }
  };

  // Fetch user skills for stats
  const { data: userSkills = [] } = useQuery({
    queryKey: ['user-skills', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_skills')
        .select('id, skill_id, level, tier, skill:skills(id, name, category)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user applications
  const { data: myApplications = [] } = useQuery({
    queryKey: ['my-applications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('team_applications')
        .select(`
          id, status, created_at, desired_role, role_type,
          team:teams(id, name, emblem_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Withdraw application mutation
  const withdrawMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('team_applications')
        .update({ status: 'withdrawn' })
        .eq('id', applicationId)
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      toast({
        title: '지원 취소 완료',
        description: '팀 지원이 취소되었습니다.',
      });
      setWithdrawDialogOpen(false);
      setSelectedApplication(null);
    },
    onError: () => {
      toast({
        title: '오류',
        description: '지원 취소에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    },
  });

  const handleWithdraw = (app: any) => {
    const isPending = app.status === 'pending';
    setSelectedApplication({
      id: app.id,
      teamName: app.team?.name || '팀',
      isPending,
    });
    
    if (isPending) {
      // 대기 상태면 바로 취소
      withdrawMutation.mutate(app.id);
    } else {
      // 면접 진행 중이면 확인 다이얼로그
      setWithdrawDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <ScrollReveal animation="fade-up">
        <Card className="overflow-hidden">
          {/* Banner */}
          <div className={`h-32 bg-gradient-to-r ${animalSkinData.gradient}`} />
          
          <CardContent className="relative pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-6">
              <Avatar className="h-32 w-32 border-4 border-card">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-4xl bg-muted">
                  {profile?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Edit button */}
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                프로필 수정
              </Button>
            </div>

            {/* User info */}
            <div className="mt-8">
              {/* Name and verified */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-2xl font-display font-bold">{profile?.name || '사용자'}</h1>
                {profile?.verified && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-success/10 text-success border border-success/20">
                    ✓ 인증됨
                  </span>
                )}
              </div>

              {/* Role Types (직무) - 1st */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {profile?.main_role_type && ROLE_TYPES[profile.main_role_type as RoleType] && (
                  <Badge 
                    variant="default" 
                    className="gap-1 font-medium"
                  >
                    {ROLE_TYPES[profile.main_role_type as RoleType].icon}
                    메인: {ROLE_TYPES[profile.main_role_type as RoleType].name}
                  </Badge>
                )}
                {profile?.sub_role_types && profile.sub_role_types.length > 0 && (
                  <>
                    {profile.sub_role_types.map((subRole) => {
                      const roleData = ROLE_TYPES[subRole as RoleType];
                      if (!roleData) return null;
                      return (
                        <Badge 
                          key={subRole}
                          variant="secondary" 
                          className="gap-1 text-xs"
                        >
                          {roleData.icon}
                          {roleData.name}
                        </Badge>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Top Skills Preview (기술) - 2nd */}
              {userSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {userSkills.slice(0, 5).map((skill) => (
                    <span 
                      key={skill.id} 
                      className="text-xs px-2 py-1 rounded-md bg-accent/10 text-accent-foreground border border-accent/20"
                    >
                      {skill.skill?.name || 'Unknown'} Lv.{skill.level}
                    </span>
                  ))}
                  {userSkills.length > 5 && (
                    <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                      +{userSkills.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Animal Skin (성향) - 3rd */}
              <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-3xl">{animalSkinData.icon}</span>
                <div>
                  <span className="font-bold text-lg">{animalSkinData.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">({animalSkinData.title})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {animalSkinData.keywords.map((keyword) => (
                      <span key={keyword} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mb-4 max-w-2xl">
                {profile?.bio || '아직 소개가 없습니다. 프로필을 수정해서 자기소개를 추가해보세요!'}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>2024년 1월 가입</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-secondary" />
                  <span>{profile?.rating_avg || 0} 평점</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{userTeams.length}개 팀</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  <span>{userBadges.length}개 배지</span>
                </div>
              </div>

              {/* Level Breakdown Card */}
              {levelBreakdown && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <LevelBadge 
                      level={levelBreakdown.level} 
                      score={levelBreakdown.calculatedLevelScore} 
                      showScore 
                      size="lg" 
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRecalculateLevel}
                      disabled={isCalculating}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${isCalculating ? 'animate-spin' : ''}`} />
                      재계산
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Level Breakdown Detail - New section */}
      {levelBreakdown && (
        <ScrollReveal animation="fade-up" delay={50}>
          <LevelBreakdownCard breakdown={levelBreakdown} showDetails />
        </ScrollReveal>
      )}

      {/* Stats cards */}
      <ScrollReveal animation="fade-up" delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">#42</p>
              <p className="text-xs text-muted-foreground">전체 랭킹</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">완료 프로젝트</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Code className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{userSkills.length}</p>
              <p className="text-xs text-muted-foreground">스킬</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-tier-gold" />
              <p className="text-2xl font-bold">4.9</p>
              <p className="text-xs text-muted-foreground">평균 평점</p>
            </CardContent>
          </Card>
        </div>
      </ScrollReveal>

      {/* Tabs */}
      <ScrollReveal animation="fade-up" delay={200}>
        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="w-full md:w-auto flex-wrap">
            <TabsTrigger value="roles">직무</TabsTrigger>
            <TabsTrigger value="skills">스킬</TabsTrigger>
            <TabsTrigger value="personality">성향</TabsTrigger>
            <TabsTrigger value="applications">지원 현황</TabsTrigger>
            <TabsTrigger value="teams">팀</TabsTrigger>
            <TabsTrigger value="badges">배지</TabsTrigger>
            <TabsTrigger value="experience">경력</TabsTrigger>
            <TabsTrigger value="reviews">리뷰</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              알림 설정
            </TabsTrigger>
          </TabsList>

        {/* Roles Tab - 직무 (1st) */}
        <TabsContent value="roles" className="mt-6">
          <RoleTypeManagement />
        </TabsContent>

        {/* Skills Tab - 스킬 (2nd) */}
        <TabsContent value="skills" className="mt-6">
          <SkillManagement />
        </TabsContent>

        {/* Personality (Animal Skin) Tab - 성향 (3rd) */}
        <TabsContent value="personality" className="mt-6">
          <AnimalSkinManagement />
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                팀 지원 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myApplications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">아직 지원한 팀이 없습니다</p>
              ) : (
                myApplications.map((app: any) => {
                  const statusInfo = APPLICATION_STATUS[app.status as keyof typeof APPLICATION_STATUS];
                  const roleTypeInfo = app.role_type ? ROLE_TYPES[app.role_type as RoleType] : null;
                  const canWithdraw = app.status === 'pending' || app.status === 'accepted';
                  const isWithdrawn = app.status === 'withdrawn';
                  const isRejected = app.status === 'rejected';
                  
                  return (
                    <div 
                      key={app.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                    >
                      <Link 
                        to={`/teams/${app.team?.id}`}
                        className="flex items-center gap-4 flex-1 min-w-0"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl shrink-0">
                          {app.team?.emblem_url || '🎯'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{app.team?.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {roleTypeInfo && (
                              <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                {roleTypeInfo.icon} {roleTypeInfo.name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(app.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge 
                          variant={app.status === 'accepted' ? 'default' : app.status === 'rejected' || app.status === 'withdrawn' ? 'destructive' : 'secondary'}
                        >
                          {statusInfo?.name || app.status}
                        </Badge>
                        {canWithdraw && !isWithdrawn && !isRejected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleWithdraw(app);
                            }}
                            disabled={withdrawMutation.isPending}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">소속 팀</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userTeams.map((team) => (
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
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">획득한 배지</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {userBadges.map((badge) => (
                  <div 
                    key={badge.id}
                    className="p-4 rounded-lg border border-border text-center hover:border-primary/30 transition-colors"
                  >
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <p className="font-medium text-sm mb-1">{badge.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{badge.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">경력</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userExperiences.map((exp) => (
                <div 
                  key={exp.id}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium">{exp.role}</p>
                      <p className="text-sm text-muted-foreground">{exp.company}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{exp.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{exp.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">받은 리뷰</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userReviews.map((review) => (
                <div 
                  key={review.id}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium">{review.project}</p>
                      <p className="text-sm text-muted-foreground">{review.from}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm">{review.comment}</p>
                  <p className="text-xs text-muted-foreground mt-2">{review.date}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <NotificationPreferences />
          </TabsContent>
        </Tabs>
      </ScrollReveal>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지원을 포기하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 <span className="font-semibold">{selectedApplication?.teamName}</span> 팀에서 면접이 진행되는 상태입니다.
              지원을 포기하시면 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedApplication && withdrawMutation.mutate(selectedApplication.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              포기하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BackToTop />
    </div>
  );
}
