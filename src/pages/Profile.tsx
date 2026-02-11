import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Edit, Calendar, Star, Users, Briefcase, Award, 
  ChevronRight, Trophy, Code, ClipboardList, X, RefreshCw,
  User, Activity, Medal, TrendingUp, Sparkles, Crown,
  CheckCircle2, UserPlus, UserCheck, Clock, MessageCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { ROLES, ROLE_TYPES, ANIMAL_SKINS, APPLICATION_STATUS, type RoleType, type AnimalSkin } from '@/lib/constants';
import { SkillManagement } from '@/components/profile/SkillManagement';
import { RoleTypeManagement } from '@/components/profile/RoleTypeManagement';
import { LevelBreakdownCard } from '@/components/profile/LevelBreakdownCard';
import { ProfileEditDialog } from '@/components/profile/ProfileEditDialog';
import { CertificationManagement } from '@/components/profile/CertificationManagement';
import { VerificationRequestManagement } from '@/components/profile/VerificationRequestManagement';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { useCalculatedLevel, type LevelBreakdown } from '@/hooks/useCalculatedLevel';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useFriends } from '@/hooks/useFriends';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// userTeams will be fetched from database

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
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { friends, pendingRequests, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriends();
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<{ id: string; teamName: string; isPending: boolean } | null>(null);
  const [performanceExpanded, setPerformanceExpanded] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
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

  // Fetch user team memberships
  const { data: userTeams = [] } = useQuery({
    queryKey: ['user-teams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          id, role,
          team:teams(id, name, emblem_url, status, recruitment_method)
        `)
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map((m: any) => ({
        id: m.team?.id,
        name: m.team?.name,
        emblem: m.team?.emblem_url || '🎯',
        role: m.role,
        status: m.team?.status,
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch teams I created (as leader)
  const { data: myCreatedTeams = [] } = useQuery({
    queryKey: ['my-created-teams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, emblem_url, status, rating_avg, avg_level')
        .eq('leader_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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

  // Fetch my project requests (의뢰 내역)
  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', user.id)
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
      withdrawMutation.mutate(app.id);
    } else {
      setWithdrawDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile header - 개선된 레이아웃 */}
      <ScrollReveal animation="fade-up">
        <Card className="overflow-hidden border-0 shadow-lg">
          {/* 배너 - 성향에 따른 그라데이션 */}
          <div className={`h-28 md:h-36 bg-gradient-to-br ${animalSkinData.gradient} relative`}>
            {/* 패턴 오버레이 */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBtLTIgMGEyIDIgMCAxIDAgNCAwIDIgMiAwIDEgMC00IDB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-50" />
          </div>
          
          <CardContent className="relative px-4 md:px-6 pb-6">
            {/* 아바타 - 배너에 걸치는 위치 */}
            <div className="absolute -top-14 md:-top-16 left-4 md:left-6">
              <div className="relative">
                <UserAvatar
                  userId={user?.id || ''}
                  avatarUrl={profile?.avatar_url}
                  name={profile?.name}
                  className="h-28 w-28 md:h-32 md:w-32 border-4 border-card shadow-xl"
                  fallbackClassName="text-3xl md:text-4xl"
                />
                {profile?.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-success text-success-foreground rounded-full p-1.5 border-2 border-card shadow-md">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {/* 프로필 수정 버튼 */}
            <div className="flex justify-end pt-2 mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditDialogOpen(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">프로필 수정</span>
              </Button>
            </div>

            {/* 유저 정보 영역 */}
            <div className="mt-12 md:mt-14 space-y-4">
              {/* 이름 & 레벨 */}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-bold">{profile?.name || '사용자'}</h1>
                {levelBreakdown && (
                  <LevelBadge 
                    level={levelBreakdown.level} 
                    score={levelBreakdown.calculatedLevelScore} 
                    showScore 
                    size="lg" 
                  />
                )}
              </div>

              {/* 직무 (1순위) */}
              <div className="flex flex-wrap items-center gap-2">
                {profile?.main_role_type && ROLE_TYPES[profile.main_role_type as RoleType] && (
                  <Badge 
                    variant="default" 
                    className="gap-1.5 py-1 px-3 text-sm font-semibold"
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
                          {roleData.icon} {roleData.name}
                        </Badge>
                      );
                    })}
                  </>
                )}
              </div>

              {/* 대표 스킬 (2순위) */}
              {userSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {userSkills.slice(0, 5).map((skill) => (
                    <span 
                      key={skill.id} 
                      className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent-foreground border border-accent/20 font-medium"
                    >
                      {skill.skill?.name || 'Unknown'} <span className="opacity-70">Lv.{skill.level}</span>
                    </span>
                  ))}
                  {userSkills.length > 5 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      +{userSkills.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* 소속 팀 (역할보다 위에) */}
              {(userTeams.length > 0 || myCreatedTeams.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {myCreatedTeams.map((team: any) => (
                    <Link 
                      key={`leader-${team.id}`}
                      to={`/teams/${team.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm overflow-hidden">
                        {team.emblem_url ? (
                          <img src={team.emblem_url} alt="" className="w-full h-full object-cover" />
                        ) : '🎯'}
                      </div>
                      <span className="text-sm font-medium">{team.name}</span>
                      <Crown className="w-3.5 h-3.5 text-primary" />
                      {team.rating_avg > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-secondary" />{team.rating_avg?.toFixed(1)}
                        </span>
                      )}
                    </Link>
                  ))}
                  {userTeams.map((team) => (
                    <Link 
                      key={`member-${team.id}`}
                      to={`/teams/${team.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm overflow-hidden">
                        {team.emblem && team.emblem.startsWith('http') ? (
                          <img src={team.emblem} alt="" className="w-full h-full object-cover" />
                        ) : team.emblem || '🎯'}
                      </div>
                      <span className="text-sm font-medium">{team.name}</span>
                      <RoleBadge role={team.role} size="sm" showName={false} />
                    </Link>
                  ))}
                </div>
              )}

              {/* 성향 (3순위) - 컴팩트 인라인 (수정 버튼 제거 - 프로필 수정에서 변경) */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <span className="text-3xl">{animalSkinData.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{animalSkinData.name}</span>
                    <span className="text-sm text-muted-foreground">({animalSkinData.title})</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {animalSkinData.keywords.map((keyword) => (
                      <span key={keyword} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 취미 & 관심분야 */}
              {((profile as any)?.hobbies?.length > 0 || (profile as any)?.interests?.length > 0) && (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {(profile as any)?.hobbies?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">취미</span>
                      {(profile as any).hobbies.slice(0, 5).map((hobby: string) => (
                        <span key={hobby} className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-secondary-foreground">
                          {hobby}
                        </span>
                      ))}
                      {(profile as any).hobbies.length > 5 && (
                        <span className="text-xs text-muted-foreground">+{(profile as any).hobbies.length - 5}</span>
                      )}
                    </div>
                  )}
                  {(profile as any)?.interests?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">관심</span>
                      {(profile as any).interests.slice(0, 5).map((interest: string) => (
                        <span key={interest} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {interest}
                        </span>
                      ))}
                      {(profile as any).interests.length > 5 && (
                        <span className="text-xs text-muted-foreground">+{(profile as any).interests.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 자기소개 */}
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
                {profile?.bio || '아직 소개가 없습니다. 프로필을 수정해서 자기소개를 추가해보세요!'}
              </p>

              {/* 통계 미니 바 */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>2024년 1월 가입</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-secondary" />
                  <span>{profile?.rating_avg || 0} 평점</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-accent" />
                  <span>{userTeams.length + myCreatedTeams.length}개 팀</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-tier-gold" />
                  <span>{userBadges.length}개 배지</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Stats cards - 개선된 디자인 with links */}
      <ScrollReveal animation="fade-up" delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Link to="/showcase" className="block">
            <Card className="relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
              <CardContent className="p-4 text-center relative">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <p className="text-2xl font-bold font-display">#42</p>
                <p className="text-xs text-muted-foreground mt-1">전체 랭킹</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/projects" className="block">
            <Card className="relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-secondary/20 to-transparent rounded-bl-full" />
              <CardContent className="p-4 text-center relative">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6 text-secondary" />
                </div>
                <p className="text-2xl font-bold font-display">12</p>
                <p className="text-xs text-muted-foreground mt-1">완료 프로젝트</p>
              </CardContent>
            </Card>
          </Link>
          <button onClick={() => document.querySelector('[value="skills"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))} className="block w-full text-left">
            <Card className="relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-accent/20 to-transparent rounded-bl-full" />
              <CardContent className="p-4 text-center relative">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Code className="w-6 h-6 text-accent" />
                </div>
                <p className="text-2xl font-bold font-display">{userSkills.length}</p>
                <p className="text-xs text-muted-foreground mt-1">스킬</p>
              </CardContent>
            </Card>
          </button>
          <button onClick={() => document.querySelector('[value="reputation"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))} className="block w-full text-left">
            <Card className="relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-tier-gold/20 to-transparent rounded-bl-full" />
              <CardContent className="p-4 text-center relative">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-tier-gold/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6 text-tier-gold" />
                </div>
                <p className="text-2xl font-bold font-display">4.9</p>
                <p className="text-xs text-muted-foreground mt-1">평균 평점</p>
              </CardContent>
            </Card>
          </button>
        </div>
      </ScrollReveal>

      {/* 탭 영역 - 4탭 구조 */}
      <ScrollReveal animation="fade-up" delay={200}>
        <Card className="border-0 shadow-lg">
          <Tabs defaultValue="skills" className="w-full">
            <TabsList className="w-full grid grid-cols-5 p-1 h-auto bg-muted/50 rounded-t-xl rounded-b-none">
              <TabsTrigger value="skills" className="gap-1.5 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                <Code className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">역량</span>
              </TabsTrigger>
              <TabsTrigger value="friends" className="gap-1.5 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg relative">
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">친구</span>
                {pendingRequests.filter(r => !r.isSentByMe).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                    {pendingRequests.filter(r => !r.isSentByMe).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="career" className="gap-1.5 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">경력</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">활동</span>
              </TabsTrigger>
              <TabsTrigger value="reputation" className="gap-1.5 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                <Medal className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">평판</span>
              </TabsTrigger>
            </TabsList>

            {/* 역량 Tab: 직무 + 스킬 */}
            <TabsContent value="skills" className="p-4 md:p-6 space-y-6 m-0">
              <RoleTypeManagement />
              <SkillManagement />
            </TabsContent>

            {/* 친구 Tab */}
            <TabsContent value="friends" className="p-4 md:p-6 space-y-6 m-0">
              {/* 받은 친구 요청 */}
              {pendingRequests.filter(r => !r.isSentByMe).length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    받은 친구 요청 ({pendingRequests.filter(r => !r.isSentByMe).length})
                  </h3>
                  <div className="space-y-2">
                    {pendingRequests.filter(r => !r.isSentByMe).map(req => (
                      <Card key={req.id}>
                        <div className="p-3 flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={req.avatar_url || undefined} />
                            <AvatarFallback>{req.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{req.name}</p>
                            <p className="text-xs text-muted-foreground">{req.primary_role || '사용자'}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => acceptFriendRequest(req.id)}>수락</Button>
                            <Button size="sm" variant="ghost" onClick={() => rejectFriendRequest(req.id)}>거절</Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 보낸 요청 */}
              {pendingRequests.filter(r => r.isSentByMe).length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    보낸 요청 ({pendingRequests.filter(r => r.isSentByMe).length})
                  </h3>
                  <div className="space-y-2">
                    {pendingRequests.filter(r => r.isSentByMe).map(req => (
                      <Card key={req.id} className="opacity-70">
                        <div className="p-3 flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={req.avatar_url || undefined} />
                            <AvatarFallback>{req.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{req.name}</p>
                          </div>
                          <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />대기 중</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 친구 목록 */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  내 친구 ({friends.length})
                </h3>
                {friends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>아직 친구가 없습니다</p>
                    <p className="text-sm mt-1">채팅에서 친구를 추가해보세요!</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/chat')}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      채팅으로 이동
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-2">
                    {friends.map(friend => (
                      <Card key={friend.id} className="hover:shadow-md transition-shadow">
                        <div className="p-3 flex items-center gap-3">
                          <Avatar 
                            className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => navigate(`/profile/${friend.friendId}`)}
                          >
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate cursor-pointer hover:text-primary" onClick={() => navigate(`/profile/${friend.friendId}`)}>
                              {friend.name}
                            </p>
                            {friend.primary_role && (
                              <p className="text-xs text-muted-foreground">{friend.primary_role}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeFriend(friend.id)}
                            title="친구 삭제"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 활동 Tab: 팀 (공지/구직/프로젝트) + 지원 현황 */}
            <TabsContent value="activity" className="p-4 md:p-6 space-y-6 m-0">
            {/* 내가 만든 팀 */}
            {myCreatedTeams.length > 0 && (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    내가 만든 팀
                  </CardTitle>
                  <CardDescription>
                    팀 리더로 관리 중인 팀
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {myCreatedTeams.map((team: any) => (
                    <Link 
                      key={team.id}
                      to={`/teams/${team.id}`}
                      className="block p-4 rounded-lg hover:bg-muted/50 transition-colors border border-primary/20 bg-primary/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-2xl shrink-0">
                          {team.emblem_url || '🎯'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{team.name}</p>
                            <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                              <Crown className="w-3 h-3 mr-1" />
                              리더
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            {team.rating_avg > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-secondary" />
                                {team.rating_avg?.toFixed(1)}
                              </span>
                            )}
                            <span>Lv.{team.avg_level || 1}</span>
                            {team.status === 'recruiting' && (
                              <Badge variant="secondary" className="text-xs">모집중</Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 소속 팀 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  소속 팀
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userTeams.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">소속된 팀이 없습니다</p>
                ) : (
                  userTeams.map((team) => (
                    <Link 
                      key={team.id}
                      to={`/teams/${team.id}`}
                      className="block p-4 rounded-lg hover:bg-muted/50 transition-colors border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl shrink-0">
                          {team.emblem}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{team.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <RoleBadge role={team.role} size="sm" showName={false} />
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                      {/* 팀 상태 정보 */}
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 text-xs">
                        {team.status === 'recruiting' && (
                          <Badge variant="outline" className="gap-1">
                            <span className="w-2 h-2 rounded-full bg-accent" />
                            구직중
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 지원 현황 */}
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

            {/* 의뢰 내역 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  의뢰 내역
                </CardTitle>
                <CardDescription>
                  내가 등록한 프로젝트 의뢰
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {myRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">아직 등록한 의뢰가 없습니다</p>
                    <Link to="/projects">
                      <Button variant="outline" size="sm">
                        프로젝트 마켓 가기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  myRequests.map((project: any) => (
                    <Link 
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="block p-4 rounded-lg hover:bg-muted/50 transition-colors border"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{project.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {project.description || '설명 없음'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {project.budget_min && project.budget_max && (
                              <Badge variant="secondary">
                                {(project.budget_min / 10000).toLocaleString()}~{(project.budget_max / 10000).toLocaleString()}만원
                              </Badge>
                            )}
                            <Badge variant={project.status === 'open' ? 'default' : 'outline'}>
                              {project.status === 'open' ? '모집중' : project.status === 'in_progress' ? '진행중' : project.status}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
            </TabsContent>

            {/* 평판 Tab: 배지 + 리뷰 */}
            <TabsContent value="reputation" className="p-4 md:p-6 space-y-6 m-0">
            {/* 획득한 배지 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Award className="w-5 h-5 text-tier-gold" />
                  획득한 배지
                </CardTitle>
                <CardDescription>
                  활동을 통해 획득한 업적 배지
                </CardDescription>
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

            {/* 받은 리뷰 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Star className="w-5 h-5 text-secondary" />
                  받은 리뷰
                </CardTitle>
                <CardDescription>
                  프로젝트 완료 후 클라이언트와 동료로부터 받은 피드백
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userReviews.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">아직 받은 리뷰가 없습니다</p>
                ) : (
                  userReviews.map((review) => (
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
                  ))
                )}
              </CardContent>
            </Card>
            </TabsContent>

            {/* 경력 Tab: 레벨분석 + 자격증 + 인증 + 경력 */}
            <TabsContent value="career" className="p-4 md:p-6 space-y-6 m-0">
            {/* 레벨 상세 분석 */}
            {levelBreakdown && (
              isMobile ? (
                <Collapsible open={performanceExpanded} onOpenChange={setPerformanceExpanded}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full text-left">
                          <div>
                            <CardTitle className="text-lg font-display flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-primary" />
                              레벨 분석
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Lv.{levelBreakdown.level} ({levelBreakdown.calculatedLevelScore.toFixed(1)}점)
                            </CardDescription>
                          </div>
                          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${performanceExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <LevelBreakdownCard breakdown={levelBreakdown} showDetails />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ) : (
                <LevelBreakdownCard breakdown={levelBreakdown} showDetails />
              )
            )}

            {/* 자격증 */}
            <CertificationManagement />

            {/* 인증 현황 */}
            <VerificationRequestManagement />

            {/* 경력 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  경력
                </CardTitle>
                <CardDescription>
                  이전 직장 및 프로젝트 경험
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userExperiences.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">등록된 경력이 없습니다</p>
                ) : (
                  userExperiences.map((exp) => (
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
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </Card>
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

      {/* Profile Edit Dialog */}
      <ProfileEditDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
      />

      <BackToTop />
    </div>
  );
}
