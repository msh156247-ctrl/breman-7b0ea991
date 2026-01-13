import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2, User, Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ROLE_TYPES, APPLICATION_STATUS, type RoleType } from '@/lib/constants';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface RequiredSkillLevel {
  skillName: string;
  minLevel: number;
}

interface RoleSlot {
  id: string;
  role_type: RoleType | null;
  min_level: number;
  required_skill_levels: RequiredSkillLevel[];
}

interface UserSkill {
  skill_name: string;
  level: number;
}

// Calculate fit score for a slot based on user's skills
function calculateFitScore(
  slot: RoleSlot | null, 
  userSkills: UserSkill[], 
  userLevel: number
): { score: number; levelMet: boolean; skillsMatched: number; skillsTotal: number; details: { skillName: string; required: number; userLevel: number | null; met: boolean }[] } | null {
  if (!slot) return null;
  
  const levelMet = userLevel >= slot.min_level;
  
  if (slot.required_skill_levels.length === 0) {
    return { 
      score: levelMet ? 100 : 0, 
      levelMet, 
      skillsMatched: 0, 
      skillsTotal: 0,
      details: []
    };
  }

  const details = slot.required_skill_levels.map(req => {
    const userSkill = userSkills.find(s => s.skill_name.toLowerCase() === req.skillName.toLowerCase());
    const userSkillLevel = userSkill?.level ?? null;
    const met = userSkillLevel !== null && userSkillLevel >= req.minLevel;
    return {
      skillName: req.skillName,
      required: req.minLevel,
      userLevel: userSkillLevel,
      met
    };
  });

  const skillsMatched = details.filter(d => d.met).length;
  const skillsTotal = slot.required_skill_levels.length;
  
  // Score calculation: 40% for level, 60% for skills
  const levelScore = levelMet ? 40 : 0;
  const skillScore = skillsTotal > 0 ? (skillsMatched / skillsTotal) * 60 : 60;
  
  return {
    score: Math.round(levelScore + skillScore),
    levelMet,
    skillsMatched,
    skillsTotal,
    details
  };
}

interface Application {
  id: string;
  user_id: string;
  desired_role: string;
  role_type: RoleType | null;
  intro: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
    level: number;
  };
  userSkills?: UserSkill[];
  matchedSlot?: RoleSlot | null;
  fitScore?: ReturnType<typeof calculateFitScore>;
}

interface TeamApplicationManagementProps {
  teamId: string;
  onApplicationHandled?: () => void;
}

export function TeamApplicationManagement({ teamId, onApplicationHandled }: TeamApplicationManagementProps) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['team-applications', teamId],
    queryFn: async () => {
      // Fetch applications
      const { data, error } = await supabase
        .from('team_applications')
        .select(`
          id,
          user_id,
          desired_role,
          role_type,
          intro,
          status,
          created_at,
          user:profiles!team_applications_user_id_fkey(id, name, avatar_url, level)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const apps = data as unknown as Application[];
      
      // Fetch role slots for the team
      const { data: slotsData } = await supabase
        .from('team_role_slots')
        .select('*')
        .eq('team_id', teamId);
      
      const roleSlots: RoleSlot[] = (slotsData || []).map(slot => {
        let requiredSkillLevels: RequiredSkillLevel[] = [];
        if (slot.required_skill_levels) {
          try {
            const parsed = typeof slot.required_skill_levels === 'string' 
              ? JSON.parse(slot.required_skill_levels) 
              : slot.required_skill_levels;
            if (Array.isArray(parsed)) {
              requiredSkillLevels = parsed.map((s: any) => ({
                skillName: s.skillName || s.skill_name || '',
                minLevel: s.minLevel || s.min_level || 1
              }));
            }
          } catch (e) {
            console.error('Error parsing required_skill_levels:', e);
          }
        }
        return {
          id: slot.id,
          role_type: slot.role_type as RoleType | null,
          min_level: slot.min_level || 1,
          required_skill_levels: requiredSkillLevels,
        };
      });
      
      // Fetch user skills for all applicants
      const userIds = apps.map(a => a.user_id);
      const { data: allUserSkills } = await supabase
        .from('user_skills')
        .select(`
          user_id,
          level,
          skill:skills!user_skills_skill_id_fkey(name)
        `)
        .in('user_id', userIds);
      
      // Map skills by user
      const skillsByUser: Record<string, UserSkill[]> = {};
      (allUserSkills || []).forEach((us: any) => {
        if (!us.skill?.name) return;
        if (!skillsByUser[us.user_id]) {
          skillsByUser[us.user_id] = [];
        }
        skillsByUser[us.user_id].push({
          skill_name: us.skill.name,
          level: us.level || 1
        });
      });
      
      // Enrich applications with fit scores
      return apps.map(app => {
        const userSkills = skillsByUser[app.user_id] || [];
        const matchedSlot = app.role_type 
          ? roleSlots.find(s => s.role_type === app.role_type) || null
          : null;
        const fitScore = matchedSlot 
          ? calculateFitScore(matchedSlot, userSkills, app.user.level)
          : null;
        
        return {
          ...app,
          userSkills,
          matchedSlot,
          fitScore
        };
      });
    },
  });

  const handleApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, action }: { applicationId: string; action: 'accept' | 'reject' }) => {
      setProcessingId(applicationId);
      
      const application = applications.find(a => a.id === applicationId);
      if (!application) throw new Error('지원서를 찾을 수 없습니다');

      // Update application status
      const { error: updateError } = await supabase
        .from('team_applications')
        .update({ 
          status: action === 'accept' ? 'accepted' : 'rejected' 
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // If accepted, add as team member
      if (action === 'accept') {
        const { error: memberError } = await supabase
          .from('team_memberships')
          .insert({
            team_id: teamId,
            user_id: application.user_id,
            role: application.desired_role as 'horse' | 'dog' | 'cat' | 'rooster',
          });

        if (memberError) throw memberError;

        // Close the role slot if it exists
        if (application.role_type) {
          await supabase
            .from('team_role_slots')
            .update({ is_open: false })
            .eq('team_id', teamId)
            .eq('role_type', application.role_type)
            .eq('is_open', true)
            .limit(1);
        }
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['team-applications', teamId] });
      toast.success(action === 'accept' ? '지원을 수락했습니다' : '지원을 거절했습니다');
      onApplicationHandled?.();
      setProcessingId(null);
    },
    onError: (error) => {
      toast.error('처리 실패: ' + error.message);
      setProcessingId(null);
    },
  });

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const handledApplications = applications.filter(a => a.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-8 text-center">
          <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">아직 지원자가 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            대기중인 지원 ({pendingApplications.length}건)
          </h3>
          <div className="grid gap-4">
            {pendingApplications.map((application) => (
              <Card key={application.id} className="border-primary/30">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Applicant info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg overflow-hidden">
                        {application.user.avatar_url ? (
                          <img 
                            src={application.user.avatar_url} 
                            alt={application.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          application.user.name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{application.user.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            Lv.{application.user.level}
                          </span>
                          {/* Fit Score Badge */}
                          {application.fitScore && (
                            <Badge 
                              variant="outline"
                              className={`text-xs gap-1 ${
                                application.fitScore.score >= 80 
                                  ? "bg-green-500/10 text-green-700 border-green-500/30" 
                                  : application.fitScore.score >= 50 
                                  ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                                  : "bg-red-500/10 text-red-700 border-red-500/30"
                              }`}
                            >
                              {application.fitScore.score >= 80 ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : application.fitScore.score >= 50 ? (
                                <AlertCircle className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              적합도 {application.fitScore.score}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>
                            {application.role_type 
                              ? `${ROLE_TYPES[application.role_type]?.icon || ''} ${ROLE_TYPES[application.role_type]?.name || application.role_type}`
                              : application.desired_role
                            }
                          </span>
                          <span>•</span>
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(application.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={processingId === application.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            거절
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>지원 거절</AlertDialogTitle>
                            <AlertDialogDescription>
                              {application.user.name}님의 지원을 거절하시겠습니까?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleApplicationMutation.mutate({ 
                                applicationId: application.id, 
                                action: 'reject' 
                              })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              거절하기
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button 
                        size="sm"
                        className="bg-gradient-to-r from-success to-emerald-400 text-white"
                        onClick={() => handleApplicationMutation.mutate({ 
                          applicationId: application.id, 
                          action: 'accept' 
                        })}
                        disabled={processingId === application.id}
                      >
                        {processingId === application.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        수락
                      </Button>
                    </div>
                  </div>

                  {/* Intro */}
                  {application.intro && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                      {application.intro}
                    </div>
                  )}

                  {/* Fit Score Details (Collapsible) */}
                  {application.fitScore && application.matchedSlot && (
                    <Collapsible className="mt-4">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">적합도 상세</span>
                            <Progress 
                              value={application.fitScore.score} 
                              className={`w-24 h-2 ${
                                application.fitScore.score >= 80 
                                  ? "[&>div]:bg-green-500" 
                                  : application.fitScore.score >= 50 
                                  ? "[&>div]:bg-yellow-500"
                                  : "[&>div]:bg-red-500"
                              }`}
                            />
                            <span className={`text-sm font-bold ${
                              application.fitScore.score >= 80 
                                ? "text-green-600" 
                                : application.fitScore.score >= 50 
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}>
                              {application.fitScore.score}%
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">클릭하여 펼치기</span>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="p-3 rounded-lg border bg-background space-y-3">
                          {/* Level Requirement */}
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm text-muted-foreground">최소 레벨</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                요구: Lv.{application.matchedSlot.min_level}
                              </Badge>
                              <span className="text-xs">→</span>
                              <Badge variant="outline" className="text-xs">
                                지원자: Lv.{application.user.level}
                              </Badge>
                              {application.fitScore.levelMet ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </div>

                          {/* Skill Requirements */}
                          {application.fitScore.details.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">필요 스킬</span>
                                <span className="text-xs text-muted-foreground">
                                  {application.fitScore.skillsMatched}/{application.fitScore.skillsTotal} 충족
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {application.fitScore.details.map((detail, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                                      detail.met ? "bg-green-500/10" : "bg-red-500/10"
                                    }`}
                                  >
                                    <span>{detail.skillName}</span>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">
                                        요구: Lv.{detail.required}
                                      </Badge>
                                      <span className="text-xs">→</span>
                                      <Badge 
                                        variant={detail.userLevel !== null ? "outline" : "destructive"} 
                                        className="text-xs"
                                      >
                                        {detail.userLevel !== null ? `Lv.${detail.userLevel}` : "미보유"}
                                      </Badge>
                                      {detail.met ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              이 포지션은 특별한 스킬 요구사항이 없습니다.
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Handled Applications */}
      {handledApplications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            처리된 지원 ({handledApplications.length}건)
          </h3>
          <div className="grid gap-3">
            {handledApplications.slice(0, 5).map((application) => (
              <Card key={application.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm overflow-hidden">
                        {application.user.avatar_url ? (
                          <img 
                            src={application.user.avatar_url} 
                            alt={application.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          application.user.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{application.user.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {application.role_type 
                            ? ROLE_TYPES[application.role_type]?.name 
                            : application.desired_role
                          }
                        </div>
                      </div>
                    </div>
                    <StatusBadge 
                      status={APPLICATION_STATUS[application.status]?.name || application.status}
                      variant={APPLICATION_STATUS[application.status]?.color as any || 'muted'}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
