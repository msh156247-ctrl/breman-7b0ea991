import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, Users, Star, Loader2, Briefcase, Trophy, Clock, Crown, ArrowUpDown, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { ROLES, ROLE_TYPES, ANIMAL_SKINS, type UserRole, type RoleType, type AnimalSkin } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BackToTop } from '@/components/ui/BackToTop';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTeams } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SlotInfo {
  role: UserRole;
  roleType: RoleType | null;
  preferredAnimalSkin: AnimalSkin | null;
  currentCount: number;
  maxCount: number;
  isOpen: boolean;
}

interface LeaderInfo {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface TeamWithSlots {
  id: string;
  name: string;
  slogan: string | null;
  description: string | null;
  emblem_url: string | null;
  avg_level: number | null;
  rating_avg: number | null;
  status: 'active' | 'inactive' | 'recruiting' | null;
  recruitment_method: 'public' | 'invite' | 'auto' | null;
  memberCount: number;
  slots: SlotInfo[];
  updated_at: string | null;
  leader: LeaderInfo | null;
}

export default function Teams() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [roleTypeFilter, setRoleTypeFilter] = useState<string>('all');
  const [animalSkinFilter, setAnimalSkinFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [teams, setTeams] = useState<TeamWithSlots[]>([]);
  const [appliedTeamIds, setAppliedTeamIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasUpdates, setHasUpdates] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      // Fetch teams with leader info from public_profiles
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          leader:public_profiles!teams_leader_id_fkey(id, name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      // Fetch role slots and memberships for each team
      const enrichedTeams = await Promise.all(
        (teamsData || []).map(async (team) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('team_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          // Get role slots with role_type, max_count, current_count, preferred_animal_skin
          const { data: slots } = await supabase
            .from('team_role_slots')
            .select('role, role_type, preferred_animal_skin, is_open, max_count, current_count')
            .eq('team_id', team.id);

          const slotInfos: SlotInfo[] = (slots || []).map(slot => ({
            role: slot.role as UserRole,
            roleType: slot.role_type as RoleType | null,
            preferredAnimalSkin: slot.preferred_animal_skin as AnimalSkin | null,
            currentCount: slot.current_count || 0,
            maxCount: slot.max_count || 1,
            isOpen: slot.is_open ?? true,
          }));

          return {
            ...team,
            status: team.status as 'active' | 'inactive' | 'recruiting' | null,
            recruitment_method: team.recruitment_method as 'public' | 'invite' | 'auto' | null,
            memberCount: (memberCount || 0) + 1, // +1 for leader
            slots: slotInfos,
            leader: team.leader as LeaderInfo | null,
          };
        })
      );

      setTeams(enrichedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
      setHasUpdates(false);
    }
  }, []);

  // Fetch applied team IDs
  const fetchAppliedTeams = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('team_applications')
        .select('team_id')
        .eq('user_id', user.id)
        .in('status', ['pending', 'accepted']);
      
      if (error) throw error;
      
      const ids = new Set(data?.map(app => app.team_id).filter(Boolean) as string[]);
      setAppliedTeamIds(ids);
    } catch (error) {
      console.error('Error fetching applied teams:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchAppliedTeams();
  }, [fetchAppliedTeams]);

  // Real-time updates
  useRealtimeTeams(() => {
    setHasUpdates(true);
    toast.info('팀 목록이 업데이트되었습니다', {
      action: {
        label: '새로고침',
        onClick: () => fetchTeams(),
      },
    });
  });

  const filteredTeams = teams
    .filter((team) => {
      const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.slogan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || 
        team.slots.some(s => s.role === roleFilter && s.isOpen && s.currentCount < s.maxCount);
      
      const matchesRoleType = roleTypeFilter === 'all' || 
        team.slots.some(s => s.roleType === roleTypeFilter && s.isOpen && s.currentCount < s.maxCount);
      
      const matchesAnimalSkin = animalSkinFilter === 'all' || 
        team.slots.some(s => s.preferredAnimalSkin === animalSkinFilter && s.isOpen && s.currentCount < s.maxCount);
      
      const matchesStatus = statusFilter === 'all' || team.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesRoleType && matchesAnimalSkin && matchesStatus;
    })
    .sort((a, b) => {
      // 지원한 팀 우선 정렬
      const aApplied = appliedTeamIds.has(a.id) ? 1 : 0;
      const bApplied = appliedTeamIds.has(b.id) ? 1 : 0;
      if (bApplied !== aApplied) return bApplied - aApplied;
      
      switch (sortOption) {
        case 'level':
          return (b.avg_level || 1) - (a.avg_level || 1);
        case 'rating':
          return (b.rating_avg || 0) - (a.rating_avg || 0);
        case 'newest':
        default:
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">팀</h1>
            <p className="text-muted-foreground mt-1">함께할 팀을 찾거나 새로운 팀을 만들어보세요</p>
          </div>
          <Link to="/teams/create">
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              팀 만들기
            </Button>
          </Link>
        </div>
      </ScrollReveal>

      {/* Filters */}
      <ScrollReveal animation="fade-up" delay={100}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="팀 이름 또는 설명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="역할" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 역할</SelectItem>
              {Object.entries(ROLES).map(([key, role]) => (
                <SelectItem key={key} value={key}>
                  {role.icon} {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleTypeFilter} onValueChange={setRoleTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="직무" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 직무</SelectItem>
              {Object.entries(ROLE_TYPES).map(([key, roleType]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    {roleType.icon} {roleType.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={animalSkinFilter} onValueChange={setAnimalSkinFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="성향" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 성향</SelectItem>
              {Object.entries(ANIMAL_SKINS).map(([key, skin]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    {skin.icon} {skin.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="recruiting">모집중</SelectItem>
              <SelectItem value="active">활동중</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ScrollReveal>

      {/* Results count and sort */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {searchQuery || roleFilter !== 'all' || roleTypeFilter !== 'all' || animalSkinFilter !== 'all' || statusFilter !== 'all'
            ? `검색 결과 ${filteredTeams.length}개 팀`
            : `총 ${teams.length}개 팀`}
        </p>
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-32">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">최신순</SelectItem>
            <SelectItem value="level">레벨순</SelectItem>
            <SelectItem value="rating">평점순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teams grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team, index) => (
          <ScrollReveal key={team.id} animation="fade-up" delay={150 + index * 50}>
            <Link to={`/teams/${team.id}`}>
              <Card className={`h-full hover:shadow-md transition-all hover:border-primary/30 cursor-pointer ${appliedTeamIds.has(team.id) ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}>
                <CardContent className="p-5">
                  {/* Applied badge */}
                  {appliedTeamIds.has(team.id) && (
                    <div className="mb-3 -mt-1">
                      <Badge variant="default" className="text-xs">
                        ✓ 지원함
                      </Badge>
                    </div>
                  )}
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl flex-shrink-0">
                      {team.emblem_url || '🎯'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold truncate">{team.name}</h3>
                        {team.status === 'recruiting' && (
                          <StatusBadge status="모집중" variant="success" size="sm" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {team.slogan || '슬로건 없음'}
                      </p>
                      {/* Recruiting slots summary */}
                      {(() => {
                        const recruitingSlots = team.slots.filter(s => s.isOpen && s.currentCount < s.maxCount);
                        const totalRecruiting = recruitingSlots.reduce((sum, s) => sum + (s.maxCount - s.currentCount), 0);
                        if (totalRecruiting > 0) {
                          return (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge variant="outline" className="text-xs bg-primary/5 border-primary/30 text-primary">
                                <Users className="w-3 h-3 mr-1" />
                                {totalRecruiting}명 모집중
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ({recruitingSlots.length}개 포지션)
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Roles with recruitment count */}
                  {team.slots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {team.slots.map((slot, i) => {
                        const isFilled = slot.currentCount >= slot.maxCount;
                        const isRecruiting = slot.isOpen && !isFilled;
                        const skinInfo = slot.preferredAnimalSkin ? ANIMAL_SKINS[slot.preferredAnimalSkin] : null;
                        
                        return (
                          <div 
                            key={i}
                            className={`relative flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm ${
                              isFilled 
                                ? 'bg-muted text-muted-foreground opacity-60' 
                                : 'bg-primary/10 border border-dashed border-primary/30'
                            }`}
                            title={`${skinInfo ? `${skinInfo.name} ` : ''}${ROLES[slot.role].name}${slot.roleType ? ` (${ROLE_TYPES[slot.roleType]?.name})` : ''} - ${slot.currentCount}/${slot.maxCount}명 ${isFilled ? '(충원완료)' : '(모집중)'}`}
                          >
                            {skinInfo && <span className="text-sm">{skinInfo.icon}</span>}
                            <span className="text-base">{ROLES[slot.role].icon}</span>
                            <span className={`text-xs font-medium ${isFilled ? 'text-muted-foreground' : 'text-primary'}`}>
                              {slot.currentCount}/{slot.maxCount}
                            </span>
                            {slot.roleType && isRecruiting && (
                              <span className="text-xs text-muted-foreground">
                                {ROLE_TYPES[slot.roleType]?.icon}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Leader info */}
                  {team.leader && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={team.leader.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {team.leader.name?.charAt(0) || 'L'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1 text-sm">
                        <Crown className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-muted-foreground">{team.leader.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{team.memberCount}명</span>
                      </div>
                      <LevelBadge level={team.avg_level || 1} size="sm" />
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{(team.rating_avg || 0).toFixed(1)}</span>
                      </div>
                    </div>
                    {team.updated_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(team.updated_at), { addSuffix: true, locale: ko })}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      {filteredTeams.length === 0 && !loading && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">
            {teams.length === 0 ? '아직 팀이 없습니다' : '검색 결과가 없습니다'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {teams.length === 0 ? '첫 번째 팀을 만들어보세요!' : '다른 조건으로 검색해보세요'}
          </p>
          <Link to="/teams/create">
            <Button>새 팀 만들기</Button>
          </Link>
        </div>
      )}

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
