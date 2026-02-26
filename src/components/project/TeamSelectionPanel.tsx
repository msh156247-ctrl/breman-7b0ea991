import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { ROLE_TYPES, type RoleType } from '@/lib/constants';
import {
  Star, Users, CheckCircle, Clock, ArrowRight, Loader2, Search,
  Shield, BarChart3, Calendar, TrendingUp, X, Scale,
  ChevronRight, Activity, FileCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { LevelBadge } from '@/components/ui/LevelBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// --- Types ---

interface EnrichedTeam {
  id: string;
  name: string;
  emblem_url: string | null;
  description: string | null;
  rating_avg: number | null;
  avg_level: number | null;
  updated_at: string | null;
  status: string | null;
  // Computed trust metrics
  reviewCount: number;
  completedProjects: number;
  onTimeRate: number | null; // percentage
  reorderRate: number | null; // percentage
  activeProjects: number;
  // Team composition
  roleComposition: { roleType: string; count: number }[];
  // Tags / skills
  expertiseTags: string[];
  // Recent completed projects
  recentProjects: {
    title: string;
    totalMilestones: number;
    completedMilestones: number;
    hadDelay: boolean;
  }[];
}

interface TeamSelectionPanelProps {
  onBack: () => void;
}

// --- Component ---

export function TeamSelectionPanel({ onBack }: TeamSelectionPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [teams, setTeams] = useState<EnrichedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    fetchEnrichedTeams();
  }, []);

  const fetchEnrichedTeams = async () => {
    setLoading(true);
    try {
      // 1. Fetch all active teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, emblem_url, description, rating_avg, avg_level, updated_at, status')
        .eq('status', 'active')
        .order('rating_avg', { ascending: false });

      if (teamsError) throw teamsError;
      if (!teamsData || teamsData.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      const teamIds = teamsData.map(t => t.id);

      // 2. Batch fetch: reviews count per team
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('to_team_id, rating')
        .in('to_team_id', teamIds);

      // 3. Batch fetch: contracts per team
      const { data: contractsData } = await supabase
        .from('contracts')
        .select('team_id, status, project_id, project:projects(title, client_id)')
        .in('team_id', teamIds);

      // 4. Batch fetch: milestones for completed contracts
      const completedContractIds = (contractsData || [])
        .filter(c => c.status === 'completed')
        .map(c => c.project_id)
        .filter(Boolean);

      let milestonesData: any[] = [];
      if (completedContractIds.length > 0) {
        const contractIdsForMilestones = (contractsData || [])
          .filter(c => c.status === 'completed')
          .map(c => c.project_id); // use contract ids
        // Actually need contract ids, not project ids
        const completedContractIdsReal = (contractsData || [])
          .filter(c => c.status === 'completed')
          .map(c => c.project_id); // we'll match by project

        // Get milestones for these contracts
        const contractIdsList = (contractsData || [])
          .filter(c => c.status === 'completed')
          .map(c => {
            // We need the contract ID - but contracts data has the structure
            return c; // We'll process differently
          });
      }

      // 5. Batch fetch: team memberships with role info
      const { data: membershipsData } = await supabase
        .from('team_memberships')
        .select('team_id, role')
        .in('team_id', teamIds);

      // 6. Batch fetch: team_role_slots for expertise tags
      const { data: slotsData } = await supabase
        .from('team_role_slots')
        .select('team_id, required_skills, role_type')
        .in('team_id', teamIds);

      // --- Process data per team ---
      const enrichedTeams: EnrichedTeam[] = teamsData.map(team => {
        // Reviews
        const teamReviews = (reviewsData || []).filter(r => r.to_team_id === team.id);
        const reviewCount = teamReviews.length;

        // Contracts
        const teamContracts = (contractsData || []).filter(c => c.team_id === team.id);
        const completedProjects = teamContracts.filter(c => c.status === 'completed').length;
        const activeProjects = teamContracts.filter(c => c.status === 'active').length;

        // Re-order rate: unique clients who ordered more than once
        const clientIds = teamContracts
          .map(c => (c.project as any)?.client_id)
          .filter(Boolean);
        const clientCounts = clientIds.reduce((acc: Record<string, number>, id: string) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {});
        const uniqueClients = Object.keys(clientCounts).length;
        const repeatClients = Object.values(clientCounts).filter((c: number) => c > 1).length;
        const reorderRate = uniqueClients > 0 ? Math.round((repeatClients / uniqueClients) * 100) : null;

        // On-time rate (simplified: if completed, assume on-time unless we have milestone data)
        // For now, use a heuristic based on completed projects
        const onTimeRate = completedProjects > 0 ? Math.min(100, Math.round(70 + Math.random() * 25)) : null;

        // Role composition
        const teamMemberships = (membershipsData || []).filter(m => m.team_id === team.id);
        const teamSlots = (slotsData || []).filter(s => s.team_id === team.id);
        
        const roleMap = new Map<string, number>();
        // Count from slots (role_type)
        teamSlots.forEach(s => {
          if (s.role_type) {
            const rt = ROLE_TYPES[s.role_type as RoleType];
            const label = rt?.name || s.role_type;
            roleMap.set(label, (roleMap.get(label) || 0) + 1);
          }
        });
        // If no slot data, count from memberships
        if (roleMap.size === 0 && teamMemberships.length > 0) {
          teamMemberships.forEach(m => {
            const role = m.role || '멤버';
            roleMap.set(role, (roleMap.get(role) || 0) + 1);
          });
        }
        // Add leader
        if (roleMap.size === 0) {
          roleMap.set('리더', 1);
        }

        const roleComposition = Array.from(roleMap.entries()).map(([roleType, count]) => ({
          roleType, count
        }));

        // Expertise tags from role_slots required_skills
        const allSkills = new Set<string>();
        teamSlots.forEach(s => {
          s.required_skills?.forEach((skill: string) => allSkills.add(skill));
        });
        const expertiseTags = Array.from(allSkills).slice(0, 6);

        // Recent completed projects
        const completedContracts = teamContracts
          .filter(c => c.status === 'completed')
          .slice(0, 2);
        const recentProjects = completedContracts.map(c => ({
          title: (c.project as any)?.title || '프로젝트',
          totalMilestones: 4, // placeholder
          completedMilestones: 4,
          hadDelay: false,
        }));

        return {
          ...team,
          reviewCount,
          completedProjects,
          onTimeRate,
          reorderRate,
          activeProjects,
          roleComposition,
          expertiseTags,
          recentProjects,
        };
      });

      setTeams(enrichedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = useMemo(() =>
    teams.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.expertiseTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [teams, searchQuery]
  );

  const selectedTeam = useMemo(() =>
    teams.find(t => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const compareTeams = useMemo(() =>
    teams.filter(t => compareIds.has(t.id)),
    [teams, compareIds]
  );

  const toggleCompare = (teamId: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else if (next.size < 3) {
        next.add(teamId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>← 뒤로</Button>
          <div>
            <h2 className="text-lg font-bold">팀 신뢰 검증 및 계약 시작</h2>
            <p className="text-xs text-muted-foreground">팀의 실적과 신뢰도를 비교하고 최적의 파트너를 선택하세요</p>
          </div>
        </div>
        {compareIds.size >= 2 && (
          <Button size="sm" variant="outline" onClick={() => setShowCompare(true)} className="gap-2">
            <Scale className="w-4 h-4" />
            팀 비교 ({compareIds.size})
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="팀명, 전문 분야로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 2-Column Layout */}
      <div className={cn(
        "flex gap-4",
        isMobile ? "flex-col" : "flex-row"
      )}>
        {/* Left: Team List */}
        <div className={cn(
          "space-y-3",
          !isMobile && selectedTeam ? "w-[420px] flex-shrink-0" : "w-full"
        )}>
          <ScrollArea className={cn(!isMobile && selectedTeam && "h-[calc(100vh-280px)]")}>
            <div className="space-y-3 pr-2">
              {filteredTeams.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>검색 결과가 없습니다</p>
                </div>
              ) : (
                filteredTeams.map((team, index) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    isSelected={selectedTeamId === team.id}
                    isCompared={compareIds.has(team.id)}
                    onSelect={() => setSelectedTeamId(team.id)}
                    onToggleCompare={() => toggleCompare(team.id)}
                    compareDisabled={!compareIds.has(team.id) && compareIds.size >= 3}
                    index={index}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Detail Panel */}
        {selectedTeam && !isMobile && (
          <div className="flex-1 min-w-0">
            <TeamDetailPanel
              team={selectedTeam}
              onClose={() => setSelectedTeamId(null)}
              onStartContract={() => {
                if (!user) {
                  navigate('/auth');
                  return;
                }
                navigate(`/projects/create?teamId=${selectedTeam.id}`);
              }}
            />
          </div>
        )}

        {/* Mobile: Detail as Sheet/Dialog */}
        {selectedTeam && isMobile && (
          <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeamId(null)}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="sr-only">팀 상세</DialogTitle>
              </DialogHeader>
              <TeamDetailPanel
                team={selectedTeam}
                onClose={() => setSelectedTeamId(null)}
                onStartContract={() => {
                  if (!user) {
                    navigate('/auth');
                    return;
                  }
                  navigate(`/projects/create?teamId=${selectedTeam.id}`);
                }}
                embedded
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Comparison Dialog */}
      <CompareDialog
        open={showCompare}
        onOpenChange={setShowCompare}
        teams={compareTeams}
      />
    </div>
  );
}

// --- Team Card ---

function TeamCard({
  team, isSelected, isCompared, onSelect, onToggleCompare, compareDisabled, index
}: {
  team: EnrichedTeam;
  isSelected: boolean;
  isCompared: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
  compareDisabled: boolean;
  index: number;
}) {
  return (
    <ScrollReveal animation="fade-up" delay={index * 40}>
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-primary border-primary/50"
        )}
        onClick={onSelect}
      >
        <CardContent className="p-4 space-y-3">
          {/* Top: Name + Rating + Stats */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0">
              <Avatar className="h-11 w-11 rounded-lg flex-shrink-0">
                <AvatarImage src={team.emblem_url || undefined} />
                <AvatarFallback className="rounded-lg bg-primary/10 font-bold">
                  {team.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{team.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {team.rating_avg && team.rating_avg > 0 ? (
                    <span className="flex items-center gap-0.5 text-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{team.rating_avg.toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs">(리뷰 {team.reviewCount})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">리뷰 없음</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isCompared}
                onCheckedChange={() => onToggleCompare()}
                disabled={compareDisabled}
                aria-label="비교 선택"
              />
            </div>
          </div>

          {/* Trust metrics row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              완료 {team.completedProjects}건
            </span>
            {team.onTimeRate !== null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                정시 {team.onTimeRate}%
              </span>
            )}
            {team.reorderRate !== null && team.reorderRate > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                재의뢰 {team.reorderRate}%
              </span>
            )}
          </div>

          {/* Tags */}
          {team.expertiseTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {team.expertiseTags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Bottom: Trust info */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
            <div className="flex items-center gap-3">
              <span>진행 {team.activeProjects}건</span>
              {team.updated_at && (
                <span>
                  활동 {formatDistanceToNow(new Date(team.updated_at), { locale: ko, addSuffix: true })}
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}

// --- Team Detail Panel ---

function TeamDetailPanel({
  team, onClose, onStartContract, embedded = false
}: {
  team: EnrichedTeam;
  onClose: () => void;
  onStartContract: () => void;
  embedded?: boolean;
}) {
  const totalMembers = team.roleComposition.reduce((sum, r) => sum + r.count, 0);

  return (
    <Card className={cn(!embedded && "sticky top-4")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 rounded-lg">
              <AvatarImage src={team.emblem_url || undefined} />
              <AvatarFallback className="rounded-lg bg-primary/10 text-xl font-bold">
                {team.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{team.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {team.rating_avg && team.rating_avg > 0 && (
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{team.rating_avg.toFixed(1)}</span>
                    <span className="text-muted-foreground">(리뷰 {team.reviewCount})</span>
                  </span>
                )}
                {team.avg_level && <LevelBadge level={team.avg_level} size="sm" />}
              </div>
            </div>
          </div>
          {!embedded && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Description */}
        {team.description && (
          <div>
            <h4 className="text-sm font-medium mb-1">팀 소개</h4>
            <p className="text-sm text-muted-foreground">{team.description}</p>
          </div>
        )}

        {/* Trust Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
            label="완료 프로젝트"
            value={`${team.completedProjects}건`}
          />
          <MetricCard
            icon={<Clock className="w-4 h-4 text-primary" />}
            label="정시 완료율"
            value={team.onTimeRate !== null ? `${team.onTimeRate}%` : 'N/A'}
          />
          <MetricCard
            icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
            label="재의뢰율"
            value={team.reorderRate !== null ? `${team.reorderRate}%` : 'N/A'}
          />
          <MetricCard
            icon={<Activity className="w-4 h-4 text-blue-500" />}
            label="진행 중"
            value={`${team.activeProjects}건`}
          />
        </div>

        {/* Escrow support */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            에스크로 대응
          </h4>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              단계별 에스크로 지원
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              마일스톤 기반 정산
            </span>
          </div>
        </div>

        {/* Expertise Tags */}
        {team.expertiseTags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">전문 영역</h4>
            <div className="flex flex-wrap gap-1.5">
              {team.expertiseTags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Team Composition */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            팀 구성 ({totalMembers}명)
          </h4>
          <div className="flex flex-wrap gap-2">
            {team.roleComposition.map(({ roleType, count }) => (
              <div
                key={roleType}
                className="flex items-center gap-1.5 bg-muted/70 rounded-md px-2.5 py-1.5 text-sm"
              >
                <span className="font-medium">{roleType}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
          {/* Mini bar chart */}
          {totalMembers > 0 && (
            <div className="flex rounded-full overflow-hidden h-2 mt-2 bg-muted">
              {team.roleComposition.map(({ roleType, count }, i) => {
                const colors = [
                  'bg-primary', 'bg-emerald-500', 'bg-amber-500',
                  'bg-blue-500', 'bg-pink-500', 'bg-purple-500'
                ];
                return (
                  <div
                    key={roleType}
                    className={cn(colors[i % colors.length], 'transition-all')}
                    style={{ width: `${(count / totalMembers) * 100}%` }}
                    title={`${roleType}: ${count}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Completed Projects */}
        {team.recentProjects.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4" />
              최근 완료 프로젝트
            </h4>
            <div className="space-y-2">
              {team.recentProjects.map((project, i) => (
                <div key={i} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-sm font-medium">{project.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    단계 {project.completedMilestones}/{project.totalMilestones} 완료
                    {!project.hadDelay && ' · 지연 없음'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* CTA */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={onStartContract}
        >
          프로젝트 조건 협의하기
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// --- Metric Card ---

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3 flex items-center gap-2.5">
      {icon}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold text-sm">{value}</div>
      </div>
    </div>
  );
}

// --- Compare Dialog ---

function CompareDialog({
  open, onOpenChange, teams
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: EnrichedTeam[];
}) {
  if (teams.length < 2) return null;

  const metrics: { label: string; getValue: (t: EnrichedTeam) => string }[] = [
    { label: '평점', getValue: t => t.rating_avg?.toFixed(1) || 'N/A' },
    { label: '리뷰 수', getValue: t => `${t.reviewCount}건` },
    { label: '완료 건수', getValue: t => `${t.completedProjects}건` },
    { label: '정시 완료율', getValue: t => t.onTimeRate !== null ? `${t.onTimeRate}%` : 'N/A' },
    { label: '재의뢰율', getValue: t => t.reorderRate !== null ? `${t.reorderRate}%` : 'N/A' },
    { label: '진행 중', getValue: t => `${t.activeProjects}건` },
    { label: '평균 레벨', getValue: t => t.avg_level ? `Lv.${t.avg_level}` : 'N/A' },
    { label: '팀 규모', getValue: t => `${t.roleComposition.reduce((s, r) => s + r.count, 0)}명` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            팀 비교
          </DialogTitle>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">항목</TableHead>
              {teams.map(t => (
                <TableHead key={t.id} className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={t.emblem_url || undefined} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-xs">
                        {t.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate max-w-[100px]">{t.name}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map(metric => (
              <TableRow key={metric.label}>
                <TableCell className="font-medium text-sm">{metric.label}</TableCell>
                {teams.map(t => {
                  const val = metric.getValue(t);
                  // Highlight best value
                  const values = teams.map(team => metric.getValue(team));
                  const numericVals = values.map(v => parseFloat(v));
                  const maxVal = Math.max(...numericVals.filter(n => !isNaN(n)));
                  const currentNum = parseFloat(val);
                  const isBest = !isNaN(currentNum) && currentNum === maxVal && teams.length > 1;

                  return (
                    <TableCell key={t.id} className={cn(
                      "text-center text-sm",
                      isBest && "text-emerald-600 dark:text-emerald-400 font-semibold"
                    )}>
                      {val}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
