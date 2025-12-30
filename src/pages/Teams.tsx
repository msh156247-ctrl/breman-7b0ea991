import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Users, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ROLES, type UserRole } from '@/lib/constants';
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
  openSlots: { role: UserRole; filled: boolean }[];
}

export default function Teams() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [teams, setTeams] = useState<TeamWithSlots[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
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

          // Get role slots
          const { data: slots } = await supabase
            .from('team_role_slots')
            .select('role, is_open')
            .eq('team_id', team.id);

          // Get filled memberships by role
          const { data: memberships } = await supabase
            .from('team_memberships')
            .select('role')
            .eq('team_id', team.id);

          const filledRoles = memberships?.map(m => m.role) || [];
          
          const openSlots = (slots || []).map(slot => ({
            role: slot.role as UserRole,
            filled: !slot.is_open || filledRoles.includes(slot.role),
          }));

          return {
            ...team,
            status: team.status as 'active' | 'inactive' | 'recruiting' | null,
            recruitment_method: team.recruitment_method as 'public' | 'invite' | 'auto' | null,
            memberCount: (memberCount || 0) + 1, // +1 for leader
            openSlots,
          };
        })
      );

      setTeams(enrichedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.slogan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
      team.openSlots.some(r => r.role === roleFilter && !r.filled);
    
    const matchesStatus = statusFilter === 'all' || team.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
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
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="필요 역할" />
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
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

      {/* Teams grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team, index) => (
          <ScrollReveal key={team.id} animation="fade-up" delay={150 + index * 50}>
            <Link to={`/teams/${team.id}`}>
              <Card className="h-full hover:shadow-md transition-all hover:border-primary/30 cursor-pointer">
                <CardContent className="p-5">
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
                    </div>
                  </div>

                  {/* Roles */}
                  {team.openSlots.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {team.openSlots.map((r, i) => (
                        <div 
                          key={i}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                            r.filled 
                              ? 'bg-muted' 
                              : 'bg-primary/10 border-2 border-dashed border-primary/30'
                          }`}
                          title={`${ROLES[r.role].name} ${r.filled ? '(충원됨)' : '(모집중)'}`}
                        >
                          {ROLES[r.role].icon}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{team.memberCount}명</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Star className="w-4 h-4 text-secondary" />
                        <span>{team.rating_avg || 0}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      평균 Lv.{team.avg_level || 1}
                    </span>
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
