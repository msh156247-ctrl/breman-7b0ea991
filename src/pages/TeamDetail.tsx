import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Star, Trophy, Calendar, Settings, 
  UserPlus, Copy, Check, Briefcase, Crown, MessageSquare, ExternalLink, Loader2, UserCog, ClipboardList,
  Inbox, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROLES, ROLE_TYPES, ANIMAL_SKINS, type UserRole, type RoleType, type AnimalSkin } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeamAnnouncementBoard } from '@/components/team/TeamAnnouncementBoard';
import { TeamMemberManagement } from '@/components/team/TeamMemberManagement';
import { TeamApplicationManagement } from '@/components/team/TeamApplicationManagement';
import { TeamServiceOfferList } from '@/components/team/TeamServiceOfferList';
import { TeamNotificationsWidget } from '@/components/team/TeamNotificationsWidget';
import { TeamApplicationDialog } from '@/components/team/TeamApplicationDialog';

interface PositionQuestion {
  id: string;
  question: string;
  required: boolean;
}

interface Team {
  id: string;
  name: string;
  slogan: string | null;
  description: string | null;
  emblem_url: string | null;
  avg_level: number | null;
  rating_avg: number | null;
  status: 'active' | 'inactive' | 'recruiting' | null;
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
  role_type: RoleType | null;
  preferred_animal_skin: AnimalSkin | null;
  min_level: number;
  required_skills: string[] | null;
  required_skill_levels: { skillName: string; minLevel: number }[];
  questions: PositionQuestion[];
  current_count: number;
  max_count: number;
}

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [copied, setCopied] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedRoleType, setSelectedRoleType] = useState<string>('');
  const [applicationText, setApplicationText] = useState('');
  
  // Proposal states
  const [sentProposals, setSentProposals] = useState<any[]>([]);
  const [receivedProposals, setReceivedProposals] = useState<any[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  
  // Auto-select based on profile when dialog opens
  useEffect(() => {
    if (applyDialogOpen && profile && openSlots.length > 0) {
      // Find matching slot based on user's main role type
      const userRoleType = profile.main_role_type as RoleType | null;
      const userAnimalSkin = profile.animal_skin as AnimalSkin | null;
      const userPrimaryRole = profile.primary_role as UserRole | null;
      
      // Find best matching slot
      const availableSlots = openSlots.filter(s => s.current_count < s.max_count);
      
      if (availableSlots.length > 0) {
        // Priority 1: Match by role_type
        let matchedSlot = userRoleType 
          ? availableSlots.find(s => s.role_type === userRoleType)
          : null;
        
        // Priority 2: Match by animal_skin preference
        if (!matchedSlot && userAnimalSkin) {
          matchedSlot = availableSlots.find(s => s.preferred_animal_skin === userAnimalSkin);
        }
        
        // Priority 3: Match by primary_role
        if (!matchedSlot && userPrimaryRole) {
          matchedSlot = availableSlots.find(s => s.role === userPrimaryRole);
        }
        
        // Fallback: First available slot
        if (!matchedSlot) {
          matchedSlot = availableSlots[0];
        }
        
        if (matchedSlot) {
          setSelectedRole(matchedSlot.role);
          setSelectedRoleType(matchedSlot.role_type || '');
        }
      }
    }
  }, [applyDialogOpen, profile, openSlots]);
  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;
      setTeam({
        ...teamData,
        status: teamData.status as 'active' | 'inactive' | 'recruiting' | null,
      });

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

      // Fetch all slots (both open and filled)
      const { data: slotsData } = await supabase
        .from('team_role_slots')
        .select('*')
        .eq('team_id', teamId);

      setOpenSlots((slotsData || []).map(slot => {
        let questions: PositionQuestion[] = [];
        if (Array.isArray(slot.questions)) {
          questions = slot.questions as unknown as PositionQuestion[];
        }
        let requiredSkillLevels: { skillName: string; minLevel: number }[] = [];
        if (Array.isArray(slot.required_skill_levels)) {
          requiredSkillLevels = slot.required_skill_levels as unknown as { skillName: string; minLevel: number }[];
        }
        return {
          id: slot.id,
          role: slot.role as UserRole,
          role_type: slot.role_type as RoleType | null,
          preferred_animal_skin: slot.preferred_animal_skin as AnimalSkin | null,
          min_level: slot.min_level || 1,
          required_skills: slot.required_skills,
          required_skill_levels: requiredSkillLevels,
          questions,
          current_count: slot.current_count || 0,
          max_count: slot.max_count || 1,
        };
      }));

    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch proposals for this team
  const fetchProposals = async () => {
    if (!teamId) return;
    setProposalsLoading(true);
    try {
      // Sent proposals (team submitted to projects)
      const { data: sentData, error: sentError } = await supabase
        .from('project_proposals')
        .select(`
          *,
          project:projects(id, title, client_id)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });
      
      if (sentError) throw sentError;
      setSentProposals(sentData || []);

      // Received proposals (projects proposed to this team)
      // For now, received proposals are those where team is involved
      setReceivedProposals([]);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setProposalsLoading(false);
    }
  };

  const isLeader = user?.id === team?.leader_id;
  const isMember = isLeader || members.some(m => m.id === user?.id);

  useEffect(() => {
    if (teamId && isLeader) {
      fetchProposals();
    }
  }, [teamId, isLeader]);

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'accepted': return '수락됨';
      case 'rejected': return '거절됨';
      case 'pending': return '대기중';
      default: return status || '알 수 없음';
    }
  };

  const inviteLink = team ? `${window.location.origin}/teams/join/${team.id}` : '';

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: '초대 링크 복사됨',
        description: '링크가 클립보드에 복사되었습니다.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: '복사 실패',
        description: '클립보드 접근이 거부되었습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleApply = async () => {
    if (!selectedRole || !applicationText || !user || !team) {
      toast({
        title: '입력 필요',
        description: '역할과 지원 내용을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const insertData: {
        team_id: string;
        user_id: string;
        desired_role: UserRole;
        role_type?: RoleType | null;
        intro: string;
      } = {
        team_id: team.id,
        user_id: user.id,
        desired_role: selectedRole as UserRole,
        intro: applicationText,
      };
      
      if (selectedRoleType) {
        insertData.role_type = selectedRoleType as RoleType;
      }

      const { error } = await supabase
        .from('team_applications')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: '지원 완료',
        description: '팀 리더가 검토 후 연락드릴 예정입니다.',
      });
      setApplyDialogOpen(false);
      setSelectedRole('');
      setSelectedRoleType('');
      setApplicationText('');
    } catch (error) {
      console.error('Error applying to team:', error);
      toast({
        title: '지원 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  const handleNavigateToChat = async () => {
    if (!team) {
      toast({
        title: '오류',
        description: '팀 정보를 찾을 수 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: '오류',
        description: '로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Check if team conversation exists
      const { data: existingConvos, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'team')
        .eq('team_id', team.id);

      if (fetchError) throw fetchError;

      if (existingConvos && existingConvos.length > 0) {
        navigate(`/chat/${existingConvos[0].id}`);
        return;
      }

      // Create new team conversation
      const { data: newConvo, error: createError } = await supabase
        .from('conversations')
        .insert({ 
          type: 'team' as const,
          team_id: team.id,
          name: team.name
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Create conversation error:', createError);
        throw createError;
      }

      if (!newConvo) {
        throw new Error('Failed to create conversation');
      }

      navigate(`/chat/${newConvo.id}`);
    } catch (error) {
      console.error('Error navigating to chat:', error);
      toast({
        title: '채팅 오류',
        description: '채팅 페이지로 이동할 수 없습니다. 잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">팀을 찾을 수 없습니다</h2>
        <Link to="/teams">
          <Button>팀 목록으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <ScrollReveal animation="fade-up">
        <Link to="/teams" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>팀 목록</span>
        </Link>
      </ScrollReveal>

      {/* Team header */}
      <ScrollReveal animation="fade-up" delay={100}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-background border">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Emblem */}
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-5xl md:text-6xl shadow-lg flex-shrink-0">
                {team.emblem_url || '🎯'}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-display font-bold">{team.name}</h1>
                  <StatusBadge 
                    status={team.status === 'recruiting' ? '모집중' : '활동중'} 
                    variant={team.status === 'recruiting' ? 'success' : 'primary'} 
                  />
                </div>
                {team.slogan && <p className="text-lg text-muted-foreground">{team.slogan}</p>}
                {team.description && <p className="text-sm text-foreground/80">{team.description}</p>}
                
                {/* Stats */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{members.length}명</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-secondary" />
                    <span>{team.rating_avg || 0} 평점</span>
                  </div>
                  <LevelBadge level={team.avg_level || 1} size="sm" />
                  {team.created_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(team.created_at).toLocaleDateString('ko-KR')} 창단</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-row md:flex-col gap-2">
                {isLeader ? (
                  <>
                    <Link to={`/teams/${team.id}/edit`}>
                      <Button variant="outline" className="flex-1 md:flex-none">
                        <Settings className="w-4 h-4 mr-2" />
                        팀 관리
                      </Button>
                    </Link>
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="flex-1 md:flex-none bg-gradient-primary">
                          <UserPlus className="w-4 h-4 mr-2" />
                          초대하기
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>팀원 초대</DialogTitle>
                          <DialogDescription>
                            아래 링크를 공유하여 새로운 팀원을 초대하세요.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 mt-4">
                          <input 
                            type="text" 
                            value={inviteLink} 
                            readOnly 
                            className="flex-1 px-3 py-2 text-sm border rounded-lg bg-muted"
                          />
                          <Button onClick={copyInviteLink} variant="outline">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : !isMember ? (
                  <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-primary">
                        <UserPlus className="w-4 h-4 mr-2" />
                        지원하기
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>팀 지원하기</DialogTitle>
                        <DialogDescription>
                          {team.name}에 지원하시겠습니까?
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* 모집 포지션 리스트 */}
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-3 block">모집 포지션 선택</label>
                          <div className="grid gap-2">
                            {openSlots.map((slot) => {
                              const isFilled = slot.current_count >= slot.max_count;
                              const isSelected = selectedRole === slot.role && selectedRoleType === (slot.role_type || '');
                              const roleTypeInfo = slot.role_type ? ROLE_TYPES[slot.role_type] : null;
                              const skinInfo = slot.preferred_animal_skin ? ANIMAL_SKINS[slot.preferred_animal_skin] : null;
                              
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={isFilled}
                                  onClick={() => {
                                    setSelectedRole(slot.role);
                                    setSelectedRoleType(slot.role_type || '');
                                  }}
                                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                    isFilled 
                                      ? 'opacity-50 cursor-not-allowed bg-muted'
                                      : isSelected 
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-border hover:border-primary/30'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex items-center gap-1.5">
                                      {skinInfo && <span className="text-lg">{skinInfo.icon}</span>}
                                      <span className="text-xl">{ROLES[slot.role].icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">{ROLES[slot.role].name}</span>
                                        {roleTypeInfo && (
                                          <Badge variant="secondary" className="text-xs">
                                            {roleTypeInfo.icon} {roleTypeInfo.name}
                                          </Badge>
                                        )}
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${isFilled ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                                          {slot.current_count}/{slot.max_count}명
                                        </span>
                                        {isFilled && (
                                          <span className="text-xs text-destructive">모집완료</span>
                                        )}
                                      </div>
                                      {(slot.required_skills && slot.required_skills.length > 0) && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                          {slot.required_skills.slice(0, 3).map((skill, i) => (
                                            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                              {skill}
                                            </span>
                                          ))}
                                          {slot.required_skills.length > 3 && (
                                            <span className="text-xs text-muted-foreground">+{slot.required_skills.length - 3}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          {profile && (
                            <p className="text-xs text-muted-foreground mt-2">
                              💡 프로필 설정 기반으로 적합한 포지션이 자동 선택됩니다
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-2 block">자기소개</label>
                          <Textarea 
                            placeholder="본인의 경험과 팀에 기여할 수 있는 부분을 알려주세요..."
                            value={applicationText}
                            onChange={(e) => setApplicationText(e.target.value)}
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
                          취소
                        </Button>
                        <Button onClick={handleApply} className="bg-gradient-primary" disabled={!selectedRole}>
                          지원 제출
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Leader-only: Management Cards */}
      {isLeader && (
        <ScrollReveal animation="fade-up" delay={150}>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Application Management */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">지원 관리</h3>
                      <p className="text-sm text-muted-foreground">팀 지원서 확인</p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        확인
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <ClipboardList className="w-5 h-5" />
                          지원서 관리
                        </DialogTitle>
                        <DialogDescription>
                          팀 지원서를 검토하고 수락/거절하세요.
                        </DialogDescription>
                      </DialogHeader>
                      <TeamApplicationManagement 
                        teamId={team.id} 
                        onApplicationHandled={fetchTeamData}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Proposal List */}
            <Card className="border-secondary/30 bg-secondary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Inbox className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">제안 리스트</h3>
                      <p className="text-sm text-muted-foreground">
                        {sentProposals.length > 0 ? `${sentProposals.length}건의 제안` : '보낸 제안 확인'}
                      </p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        확인
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Inbox className="w-5 h-5" />
                          제안 리스트
                        </DialogTitle>
                        <DialogDescription>
                          프로젝트에 보낸 제안 현황을 확인하세요.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        {proposalsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        ) : sentProposals.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            보낸 제안이 없습니다
                          </div>
                        ) : (
                          sentProposals.map((proposal) => (
                            <Card 
                              key={proposal.id}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => navigate(`/projects/${proposal.project_id}`)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">
                                      {proposal.project?.title || '프로젝트'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {proposal.proposed_budget ? `${(proposal.proposed_budget / 10000).toLocaleString()}만원` : '예산 미정'}
                                      {proposal.proposed_timeline_weeks && ` · ${proposal.proposed_timeline_weeks}주`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(proposal.status)}
                                    <span className="text-sm">{getStatusLabel(proposal.status)}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>
      )}

      {/* Content tabs */}
      <ScrollReveal animation="fade-up" delay={isLeader ? 200 : 150}>
        <Tabs defaultValue="intro" className="space-y-6">
          <TabsList className="w-full grid grid-cols-4 md:grid-cols-4">
            <TabsTrigger value="intro" className="gap-1.5">
              <Users className="w-4 h-4" />
              소개
            </TabsTrigger>
            <TabsTrigger value="openings" className="gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">모집 포지션</span>
              <span className="sm:hidden">모집</span>
            </TabsTrigger>
            {isMember && (
              <TabsTrigger value="board" className="gap-1.5">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">공지사항</span>
                <span className="sm:hidden">공지</span>
              </TabsTrigger>
            )}
            {isMember && (
              <TabsTrigger value="services" className="gap-1.5">
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">서비스 오퍼</span>
                <span className="sm:hidden">서비스</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Team Introduction Tab - includes members */}
          <TabsContent value="intro" className="space-y-6">
            {/* Team Description */}
            {team.description && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  팀 소개
                </h2>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-foreground/80 whitespace-pre-wrap">{team.description}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Members */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                팀 멤버 ({members.length}명)
              </h2>
              {members.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl overflow-hidden">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              member.name.charAt(0)
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{member.name}</span>
                              {member.isLeader && (
                                <Crown className="w-4 h-4 text-secondary" aria-label="팀 리더" />
                              )}
                            </div>
                            <RoleBadge role={member.role} level={member.level} size="sm" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">아직 팀원이 없습니다</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Member Management for Leader */}
            {isLeader && team.leader_id && (
              <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-primary" />
                  멤버 관리
                </h2>
                <TeamMemberManagement
                  teamId={team.id}
                  leaderId={team.leader_id}
                  members={members}
                  onMemberUpdated={fetchTeamData}
                />
              </div>
            )}
          </TabsContent>

          {/* Open Positions Tab */}
          <TabsContent value="openings" className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-success" />
              모집 포지션 ({openSlots.length}개)
            </h2>
            {openSlots.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {openSlots.map((slot) => {
                  const roleTypeInfo = slot.role_type ? ROLE_TYPES[slot.role_type] : null;
                  const animalInfo = ROLES[slot.role];
                  const isFilled = slot.current_count >= slot.max_count;
                  
                  return (
                    <Card 
                      key={slot.id} 
                      className={`border-dashed ${
                        isFilled 
                          ? 'border-muted bg-muted/30 opacity-60' 
                          : 'border-primary/30 bg-primary/5'
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                              isFilled 
                                ? 'bg-muted' 
                                : 'bg-gradient-to-br from-primary/20 to-accent/20'
                            }`}>
                              {roleTypeInfo?.icon || animalInfo?.icon || '👤'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">
                                  {roleTypeInfo?.name || animalInfo?.name || '포지션'}
                                </h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  isFilled 
                                    ? 'bg-muted text-muted-foreground' 
                                    : 'bg-primary/10 text-primary'
                                }`}>
                                  {slot.current_count}/{slot.max_count}명
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {roleTypeInfo?.description || animalInfo?.description || ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              isFilled 
                                ? 'bg-muted text-muted-foreground' 
                                : 'bg-primary/10 text-primary'
                            }`}>
                              최소 Lv.{slot.min_level}
                            </span>
                            {isFilled && (
                              <span className="text-xs text-muted-foreground">모집 완료</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Required Skill Levels (new format) */}
                        {slot.required_skill_levels && slot.required_skill_levels.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {slot.required_skill_levels.map((skill, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                                {skill.skillName} Lv.{skill.minLevel}+
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Legacy required_skills */}
                        {(!slot.required_skill_levels || slot.required_skill_levels.length === 0) && 
                         slot.required_skills && slot.required_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {slot.required_skills.map((skill) => (
                              <span key={skill} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="p-8 text-center">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">등록된 포지션이 없습니다</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Announcements Tab - Members only */}
          {isMember && (
            <TabsContent value="board" className="space-y-6">
              {/* Team Notifications */}
              <TeamNotificationsWidget teamId={team.id} />
              
              {/* Team Announcements */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  팀 공지사항
                </h2>
                <TeamAnnouncementBoard teamId={team.id} isLeader={isLeader} isMember={isMember} />
              </div>
            </TabsContent>
          )}

          {/* Service Offers Tab - Members only */}
          {isMember && (
            <TabsContent value="services" className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                서비스 오퍼
              </h2>
              <TeamServiceOfferList teamId={team.id} isLeader={isLeader} />
            </TabsContent>
          )}
        </Tabs>
      </ScrollReveal>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
