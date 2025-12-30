import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Star, Trophy, Calendar, Settings, 
  UserPlus, Copy, Check, Shield, Briefcase, Award, Crown, MessageSquare, ExternalLink
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROLES, SKILL_TIERS, type UserRole, type SkillTier } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
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

// Sample team data
const teamData = {
  '1': {
    id: '1',
    name: '스타트업 드림팀',
    slogan: '혁신으로 세상을 바꾸다',
    emblem: '🚀',
    description: '우리는 혁신적인 스타트업 프로젝트를 전문으로 하는 팀입니다. 빠른 개발 속도와 높은 품질을 자랑하며, 고객의 비전을 현실로 만들어 드립니다.',
    avgLevel: 4.2,
    rating: 4.8,
    status: 'recruiting' as const,
    leaderId: 'leader1',
    createdAt: '2024-01-15',
    completedProjects: 12,
    totalEarnings: 45000000,
    skills: ['React', 'Node.js', 'AWS', 'TypeScript', 'PostgreSQL'],
    members: [
      { id: 'm1', name: '김리더', role: 'horse' as UserRole, level: 5, avatar: '👨‍💼', isLeader: true },
      { id: 'm2', name: '박보안', role: 'dog' as UserRole, level: 4, avatar: '👩‍💻', isLeader: false },
      { id: 'm3', name: '최프론트', role: 'rooster' as UserRole, level: 4, avatar: '👨‍🎨', isLeader: false },
    ],
    openSlots: [
      { 
        id: 's1', 
        role: 'cat' as UserRole, 
        minLevel: 3, 
        requiredSkills: ['Figma', 'UI/UX', 'Adobe XD'],
        description: '창의적인 디자이너를 찾습니다. UI/UX 경험 필수.',
      },
    ],
    achievements: [
      { id: 'a1', name: '첫 프로젝트 완료', icon: '🎯', date: '2024-02-01' },
      { id: 'a2', name: '5성급 리뷰 획득', icon: '⭐', date: '2024-03-15' },
      { id: 'a3', name: '10개 프로젝트 달성', icon: '🏆', date: '2024-08-20' },
      { id: 'a4', name: 'Siege 우승', icon: '👑', date: '2024-09-10' },
    ],
    projects: [
      { id: 'p1', title: 'E-커머스 리뉴얼', status: 'completed', rating: 5 },
      { id: 'p2', title: 'SaaS 대시보드', status: 'in_progress', rating: null },
    ],
  },
};

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [applicationText, setApplicationText] = useState('');

  const team = teamData[teamId as keyof typeof teamData];

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

  const inviteLink = `${window.location.origin}/teams/${team.id}/join`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({
      title: '초대 링크 복사됨',
      description: '링크가 클립보드에 복사되었습니다.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!selectedRole || !applicationText) {
      toast({
        title: '입력 필요',
        description: '역할과 지원 내용을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: '지원 완료',
      description: '팀 리더가 검토 후 연락드릴 예정입니다.',
    });
    setApplyDialogOpen(false);
    setSelectedRole('');
    setApplicationText('');
  };

  // Check if current user is the leader (mock)
  const isLeader = false; // Would be determined by auth context
  const isMember = true; // Mock - assume member for demo

  const handleNavigateToChat = async () => {
    if (!team) return;
    
    try {
      // Check if team conversation exists
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'team')
        .eq('team_id', team.id)
        .single();

      if (existingConvo) {
        navigate(`/chat/${existingConvo.id}`);
        return;
      }

      // Create new team conversation
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({ 
          type: 'team',
          team_id: team.id,
          name: team.name
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/chat/${newConvo.id}`);
    } catch (error) {
      console.error('Error navigating to chat:', error);
      toast({
        title: '오류',
        description: '채팅 페이지로 이동할 수 없습니다.',
        variant: 'destructive',
      });
    }
  };

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
              {team.emblem}
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
              <p className="text-lg text-muted-foreground">{team.slogan}</p>
              <p className="text-sm text-foreground/80">{team.description}</p>
              
              {/* Stats */}
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{team.members.length}명</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-secondary" />
                  <span>{team.rating} 평점</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span>평균 Lv.{team.avgLevel}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span>{team.completedProjects}개 프로젝트 완료</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{team.createdAt} 창단</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-row md:flex-col gap-2">
              {isLeader ? (
                <>
                  <Button variant="outline" className="flex-1 md:flex-none">
                    <Settings className="w-4 h-4 mr-2" />
                    팀 관리
                  </Button>
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
              ) : (
                <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary">
                      <UserPlus className="w-4 h-4 mr-2" />
                      지원하기
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>팀 지원하기</DialogTitle>
                      <DialogDescription>
                        {team.name}에 지원하시겠습니까?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">지원할 역할</label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="역할 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {team.openSlots.map((slot) => (
                              <SelectItem key={slot.id} value={slot.role}>
                                {ROLES[slot.role].icon} {ROLES[slot.role].name} (최소 Lv.{slot.minLevel})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <Button onClick={handleApply} className="bg-gradient-primary">
                        지원 제출
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>
      </ScrollReveal>

      {/* Content tabs */}
      <ScrollReveal animation="fade-up" delay={150}>
        <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="members">멤버</TabsTrigger>
          <TabsTrigger value="board">게시판</TabsTrigger>
          <TabsTrigger value="openings">모집 포지션</TabsTrigger>
          <TabsTrigger value="achievements">업적</TabsTrigger>
          <TabsTrigger value="projects">프로젝트</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            팀 멤버 ({team.members.length}명)
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.members.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
                      {member.avatar}
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

          {/* Skills */}
          <div className="pt-4">
            <h3 className="text-md font-medium mb-3">팀 기술 스택</h3>
            <div className="flex flex-wrap gap-2">
              {team.skills.map((skill) => (
                <SkillBadge key={skill} name={skill} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="board" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              팀 공지사항
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNavigateToChat}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              팀 채팅
            </Button>
          </div>
          <TeamAnnouncementBoard teamId={team.id} isLeader={isLeader} isMember={isMember} />
        </TabsContent>

        {/* Open Positions Tab */}
        <TabsContent value="openings" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-success" />
            모집중인 포지션 ({team.openSlots.length}개)
          </h2>
          {team.openSlots.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {team.openSlots.map((slot) => (
                <Card key={slot.id} className="border-dashed border-primary/30 bg-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
                          {ROLES[slot.role].icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{ROLES[slot.role].name}</h3>
                          <p className="text-sm text-muted-foreground">{ROLES[slot.role].description}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        최소 Lv.{slot.minLevel}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 mb-3">{slot.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {slot.requiredSkills.map((skill) => (
                        <span key={skill} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                          {skill}
                        </span>
                      ))}
                    </div>
                    <Button 
                      className="w-full mt-4 bg-gradient-primary"
                      onClick={() => {
                        setSelectedRole(slot.role);
                        setApplyDialogOpen(true);
                      }}
                    >
                      이 포지션에 지원하기
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">현재 모집중인 포지션이 없습니다</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-secondary" />
            팀 업적 ({team.achievements.length}개)
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {team.achievements.map((achievement) => (
              <Card key={achievement.id} className="text-center hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center text-3xl">
                    {achievement.icon}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{achievement.name}</h3>
                  <p className="text-xs text-muted-foreground">{achievement.date}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            진행 프로젝트
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {team.projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{project.title}</h3>
                    <StatusBadge 
                      status={project.status === 'completed' ? '완료' : '진행중'}
                      variant={project.status === 'completed' ? 'muted' : 'warning'}
                    />
                  </div>
                  {project.rating && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                      <Star className="w-4 h-4 text-secondary fill-secondary" />
                      <span>{project.rating}.0 평점</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      </ScrollReveal>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
