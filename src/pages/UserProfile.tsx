import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, Calendar, Star, Users, Briefcase, Award, 
  Code, UserPlus, UserCheck, Crown, Loader2, CheckCircle2,
  MessageCircle, Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { ROLE_TYPES, ANIMAL_SKINS, type RoleType, type AnimalSkin } from '@/lib/constants';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useFollows } from '@/hooks/useFollows';
import { MessageComposeDialog } from '@/components/messages/MessageComposeDialog';
import { toast } from 'sonner';

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, follow, unfollow } = useFollows();
  const [dmOpen, setDmOpen] = useState(false);

  const isOwnProfile = user?.id === userId;

  // Redirect to own profile page
  if (isOwnProfile) {
    navigate('/profile', { replace: true });
    return null;
  }

  // Fetch public profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, bio, primary_role, animal_skin, main_role_type, sub_role_types, level, rating_avg, verified, created_at')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user skills
  const { data: userSkills = [] } = useQuery({
    queryKey: ['user-skills-public', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_skills')
        .select('id, level, skill:skills(id, name, category)')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user teams
  const { data: userTeams = [] } = useQuery({
    queryKey: ['user-teams-public', userId],
    queryFn: async () => {
      if (!userId) return [];
      const [{ data: memberships }, { data: ledTeams }] = await Promise.all([
        supabase.from('team_memberships').select('role, team:teams(id, name, emblem_url)').eq('user_id', userId),
        supabase.from('teams').select('id, name, emblem_url').eq('leader_id', userId),
      ]);
      const teams = [
        ...(ledTeams || []).map((t: any) => ({ ...t, role: 'leader', isLeader: true })),
        ...(memberships || []).map((m: any) => ({ ...m.team, role: m.role, isLeader: false })),
      ];
      // Deduplicate
      return Array.from(new Map(teams.map(t => [t.id, t])).values());
    },
    enabled: !!userId,
  });

  // Fetch badges
  const { data: userBadges = [] } = useQuery({
    queryKey: ['user-badges-public', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_badges')
        .select('id, earned_at, badge:badges(name, icon, description)')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []).map((ub: any) => ({
        id: ub.id,
        name: ub.badge?.name || '배지',
        icon: ub.badge?.icon || '🏅',
        description: ub.badge?.description || '',
      }));
    },
    enabled: !!userId,
  });

  // Fetch reviews
  const { data: userReviews = [] } = useQuery({
    queryKey: ['user-reviews-public', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, project:projects(title)')
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        project: r.project?.title || '프로젝트',
        rating: r.rating || 0,
        comment: r.comment || '',
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR') : '',
      }));
    },
    enabled: !!userId,
  });

  // Follow counts for this user
  const { data: followCounts } = useQuery({
    queryKey: ['follow-counts', userId],
    queryFn: async () => {
      if (!userId) return { following: 0, followers: 0 };
      const [{ count: followingCount }, { count: followersCount }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      ]);
      return { following: followingCount || 0, followers: followersCount || 0 };
    },
    enabled: !!userId,
  });

  const handleStartChat = async () => {
    if (!user || !userId) return;
    try {
      const { data: myConvos } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations(type)')
        .eq('user_id', user.id);
      const directConvoIds = (myConvos || [])
        .filter((c: any) => c.conversations?.type === 'direct')
        .map(c => c.conversation_id);
      if (directConvoIds.length > 0) {
        const { data: existing } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId)
          .in('conversation_id', directConvoIds)
          .limit(1)
          .maybeSingle();
        if (existing) {
          navigate(`/chat/${existing.conversation_id}`);
          return;
        }
      }
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({ type: 'direct' as const })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConvo.id, user_id: user.id },
        { conversation_id: newConvo.id, user_id: userId }
      ]);
      navigate(`/chat/${newConvo.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('채팅 시작에 실패했습니다');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg mb-4">사용자를 찾을 수 없습니다</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> 돌아가기
        </Button>
      </div>
    );
  }

  const animalSkin = (profile.animal_skin as AnimalSkin) || 'horse';
  const animalSkinData = ANIMAL_SKINS[animalSkin];
  const isFollowingUser = userId ? isFollowing(userId) : false;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> 돌아가기
      </Button>

      {/* Profile header */}
      <ScrollReveal animation="fade-up">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className={`h-28 md:h-36 bg-gradient-to-br ${animalSkinData.gradient} relative`}>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBtLTIgMGEyIDIgMCAxIDAgNCAwIDIgMiAwIDEgMC00IDB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-50" />
          </div>
          
          <CardContent className="relative px-4 md:px-6 pb-6">
            <div className="absolute -top-14 md:-top-16 left-4 md:left-6">
              <div className="relative">
                <UserAvatar
                  userId={userId || ''}
                  avatarUrl={profile.avatar_url}
                  name={profile.name}
                  className="h-28 w-28 md:h-32 md:w-32 border-4 border-card shadow-xl"
                  fallbackClassName="text-3xl md:text-4xl"
                />
                {profile.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-success text-success-foreground rounded-full p-1.5 border-2 border-card shadow-md">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end pt-2 mb-2 gap-2">
              {user && (
                <>
                  <Button
                    variant={isFollowingUser ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => userId && (isFollowingUser ? unfollow(userId) : follow(userId))}
                    className="gap-2"
                  >
                    {isFollowingUser ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isFollowingUser ? '팔로잉' : '팔로우'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleStartChat} className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">채팅</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDmOpen(true)} className="gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">쪽지</span>
                  </Button>
                </>
              )}
            </div>

            <div className="mt-12 md:mt-14 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-bold">{profile.name}</h1>
                {profile.level && <LevelBadge level={profile.level} size="lg" />}
              </div>

              {/* Role types */}
              <div className="flex flex-wrap items-center gap-2">
                {profile.main_role_type && ROLE_TYPES[profile.main_role_type as RoleType] && (
                  <Badge variant="default" className="gap-1.5 py-1 px-3 text-sm font-semibold">
                    {ROLE_TYPES[profile.main_role_type as RoleType].icon}
                    메인: {ROLE_TYPES[profile.main_role_type as RoleType].name}
                  </Badge>
                )}
                {profile.sub_role_types && (profile.sub_role_types as string[]).map((subRole) => {
                  const roleData = ROLE_TYPES[subRole as RoleType];
                  if (!roleData) return null;
                  return (
                    <Badge key={subRole} variant="secondary" className="gap-1 text-xs">
                      {roleData.icon} {roleData.name}
                    </Badge>
                  );
                })}
              </div>

              {/* Skills */}
              {userSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {userSkills.slice(0, 8).map((skill: any) => (
                    <span key={skill.id} className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent-foreground border border-accent/20 font-medium">
                      {skill.skill?.name} <span className="opacity-70">Lv.{skill.level}</span>
                    </span>
                  ))}
                  {userSkills.length > 8 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      +{userSkills.length - 8}
                    </span>
                  )}
                </div>
              )}

              {/* Teams */}
              {userTeams.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {userTeams.map((team: any) => (
                    <Link
                      key={team.id}
                      to={`/teams/${team.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm overflow-hidden">
                        {team.emblem_url ? <img src={team.emblem_url} alt="" className="w-full h-full object-cover" /> : '🎯'}
                      </div>
                      <span className="text-sm font-medium">{team.name}</span>
                      {team.isLeader && <Crown className="w-3.5 h-3.5 text-primary" />}
                    </Link>
                  ))}
                </div>
              )}

              {/* Animal skin */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <span className="text-3xl">{animalSkinData.icon}</span>
                <div>
                  <span className="font-bold">{animalSkinData.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">({animalSkinData.title})</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
                {profile.bio || '아직 소개가 없습니다.'}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-secondary" />
                  {profile.rating_avg || 0} 평점
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-accent" />
                  {userTeams.length}개 팀
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-primary" />
                  팔로워 {followCounts?.followers || 0}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  팔로잉 {followCounts?.following || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Tabs */}
      <ScrollReveal animation="fade-up" delay={100}>
        <Card className="border-0 shadow-lg">
          <Tabs defaultValue="badges">
            <TabsList className="w-full grid grid-cols-2 p-1 h-auto bg-muted/50 rounded-t-xl rounded-b-none">
              <TabsTrigger value="badges" className="gap-1.5 py-3">
                <Award className="w-4 h-4" />
                배지 ({userBadges.length})
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 py-3">
                <Star className="w-4 h-4" />
                리뷰 ({userReviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="badges" className="p-4 md:p-6 m-0">
              {userBadges.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">획득한 배지가 없습니다</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {userBadges.map((badge: any) => (
                    <div key={badge.id} className="p-4 rounded-lg border text-center">
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <p className="font-medium text-sm mb-1">{badge.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{badge.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="p-4 md:p-6 m-0">
              {userReviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">받은 리뷰가 없습니다</p>
              ) : (
                <div className="space-y-4">
                  {userReviews.map((review: any) => (
                    <div key={review.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium">{review.project}</p>
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
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </ScrollReveal>

      <BackToTop />

      {/* DM Dialog */}
      {userId && (
        <MessageComposeDialog
          open={dmOpen}
          onOpenChange={setDmOpen}
          recipientId={userId}
          recipientName={profile.name}
          onSent={() => {
            setDmOpen(false);
            toast.success('쪽지를 보냈습니다');
          }}
        />
      )}
    </div>
  );
}
