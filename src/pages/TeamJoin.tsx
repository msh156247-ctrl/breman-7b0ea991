import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { 
  Users, Star, Trophy, Calendar, CheckCircle, 
  UserPlus, LogIn, ArrowLeft, Crown, Briefcase
} from 'lucide-react';
import { ROLES, type UserRole } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Team {
  id: string;
  name: string;
  slogan: string | null;
  description: string | null;
  emblem_url: string | null;
  avg_level: number | null;
  rating_avg: number | null;
  status: string | null;
  leader_id: string | null;
  created_at: string | null;
}

interface Member {
  id: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  level: number;
  isLeader: boolean;
}

interface OpenSlot {
  id: string;
  role: UserRole;
  min_level: number;
}

export default function TeamJoin() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId, user]);

  const fetchTeamData = async () => {
    try {
      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Check if user is already a member
      if (user) {
        // Check if leader
        if (teamData.leader_id === user.id) {
          setAlreadyMember(true);
        } else {
          // Check memberships
          const { data: membership } = await supabase
            .from('team_memberships')
            .select('id')
            .eq('team_id', teamId)
            .eq('user_id', user.id)
            .maybeSingle();

          setAlreadyMember(!!membership);
        }
      }

      // Fetch members
      const { data: membershipsData } = await supabase
        .from('team_memberships')
        .select(`
          role,
          user:profiles!team_memberships_user_id_fkey(id, name, avatar_url, level)
        `)
        .eq('team_id', teamId);

      const membersList: Member[] = [];

      // Add leader
      if (teamData.leader_id) {
        const { data: leaderData } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, level, primary_role')
          .eq('id', teamData.leader_id)
          .single();

        if (leaderData) {
          membersList.push({
            id: leaderData.id,
            name: leaderData.name,
            avatar_url: leaderData.avatar_url,
            role: (leaderData.primary_role as UserRole) || 'horse',
            level: leaderData.level || 1,
            isLeader: true,
          });
        }
      }

      // Add other members
      if (membershipsData) {
        for (const membership of membershipsData) {
          const userData = membership.user as any;
          if (userData && userData.id !== teamData.leader_id) {
            membersList.push({
              id: userData.id,
              name: userData.name,
              avatar_url: userData.avatar_url,
              role: membership.role as UserRole,
              level: userData.level || 1,
              isLeader: false,
            });
          }
        }
      }

      setMembers(membersList);

      // Fetch open slots
      const { data: slotsData } = await supabase
        .from('team_role_slots')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_open', true);

      const slots = (slotsData || []).map(slot => ({
        id: slot.id,
        role: slot.role as UserRole,
        min_level: slot.min_level || 1,
      }));
      
      setOpenSlots(slots);
      
      // Auto-select first available role
      if (slots.length > 0 && !selectedRole) {
        setSelectedRole(slots[0].role);
      }

    } catch (error) {
      console.error('Error fetching team data:', error);
      toast({
        title: '팀을 찾을 수 없습니다',
        description: '유효하지 않은 초대 링크입니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !team || !selectedRole) {
      toast({
        title: '역할 선택 필요',
        description: '가입할 역할을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // Check minimum level requirement
    const selectedSlot = openSlots.find(s => s.role === selectedRole);
    if (selectedSlot && profile && profile.level < selectedSlot.min_level) {
      toast({
        title: '레벨 부족',
        description: `이 포지션은 최소 레벨 ${selectedSlot.min_level}이 필요합니다. 현재 레벨: ${profile.level}`,
        variant: 'destructive',
      });
      return;
    }

    setJoining(true);

    try {
      // Add membership
      const { error: membershipError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: selectedRole as UserRole,
        });

      if (membershipError) throw membershipError;

      // Close the slot
      if (selectedSlot) {
        await supabase
          .from('team_role_slots')
          .update({ is_open: false })
          .eq('id', selectedSlot.id);
      }

      toast({
        title: '팀 가입 완료!',
        description: `${team.name} 팀에 가입되었습니다.`,
      });

      navigate(`/teams/${team.id}`);
    } catch (error) {
      console.error('Error joining team:', error);
      toast({
        title: '가입 실패',
        description: '팀 가입에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-24 rounded-2xl mx-auto" />
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-destructive">팀을 찾을 수 없습니다</CardTitle>
            <CardDescription>
              초대 링크가 유효하지 않거나 팀이 삭제되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/teams">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                팀 목록으로 이동
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg overflow-hidden">
        {/* Team Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-background p-6 text-center">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-5xl shadow-lg mb-4">
              {team.emblem_url || '🎯'}
            </div>
            <h1 className="text-2xl font-bold mb-1">{team.name}</h1>
            {team.slogan && (
              <p className="text-muted-foreground">{team.slogan}</p>
            )}
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Team Stats */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              <span>{members.length}명</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>{team.rating_avg || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-primary" />
              <span>Lv.{team.avg_level || 1}</span>
            </div>
          </div>

          {/* Description */}
          {team.description && (
            <p className="text-sm text-center text-muted-foreground">
              {team.description}
            </p>
          )}

          {/* Team Members Preview */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              팀 멤버
            </h3>
            <div className="flex flex-wrap gap-2">
              {members.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.name}</span>
                  {member.isLeader && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
              ))}
              {members.length > 5 && (
                <Badge variant="secondary">+{members.length - 5}명</Badge>
              )}
            </div>
          </div>

          {/* Already Member */}
          {alreadyMember ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">이미 팀에 가입되어 있습니다</span>
              </div>
              <Button onClick={() => navigate(`/teams/${team.id}`)} className="w-full">
                팀 페이지로 이동
              </Button>
            </div>
          ) : !user ? (
            /* Not Logged In */
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                팀에 가입하려면 로그인이 필요합니다.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/auth?redirect=/teams/join/${teamId}`)}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  로그인
                </Button>
                <Button
                  className="flex-1 bg-gradient-primary"
                  onClick={() => navigate(`/auth?mode=signup&redirect=/teams/join/${teamId}`)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  회원가입
                </Button>
              </div>
            </div>
          ) : openSlots.length === 0 ? (
            /* No Open Positions */
            <div className="text-center space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <Briefcase className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  현재 모집 중인 포지션이 없습니다.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/teams')}>
                다른 팀 둘러보기
              </Button>
            </div>
          ) : (
            /* Join Form */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  가입할 포지션 선택
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="포지션을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {openSlots.map((slot) => {
                      const roleInfo = ROLES[slot.role];
                      const meetsLevel = !profile || profile.level >= slot.min_level;
                      return (
                        <SelectItem 
                          key={slot.id} 
                          value={slot.role}
                          disabled={!meetsLevel}
                        >
                          <div className="flex items-center gap-2">
                            <span>{roleInfo.icon}</span>
                            <span>{roleInfo.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              Lv.{slot.min_level}+
                            </Badge>
                            {!meetsLevel && (
                              <span className="text-xs text-destructive">(레벨 부족)</span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {profile && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                  <span className="text-muted-foreground">내 정보</span>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={profile.primary_role as UserRole || 'horse'} level={profile.level} size="sm" />
                  </div>
                </div>
              )}

              <Button 
                className="w-full bg-gradient-primary" 
                onClick={handleJoin}
                disabled={joining || !selectedRole}
              >
                {joining ? (
                  '가입 중...'
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    팀 가입하기
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Back Link */}
          <div className="text-center pt-2">
            <Link 
              to="/teams" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 팀 목록으로 돌아가기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
