import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ROLE_TYPES, type RoleType } from '@/lib/constants';
import { toast } from 'sonner';
import { ApplicantDetailCard } from './ApplicantDetailCard';

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

interface SkillExperience {
  id: string;
  skill_name: string;
  title: string;
  description: string | null;
  xp_earned: number;
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
  attachments: string[] | null;
  answers_json: Record<string, string> | null;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
    level: number;
    bio: string | null;
  };
  userSkills: UserSkill[];
  skillExperiences: SkillExperience[];
  matchedSlot: RoleSlot | null;
  fitScore: ReturnType<typeof calculateFitScore>;
}

interface TeamApplicationManagementProps {
  teamId: string;
  teamName?: string;
  onApplicationHandled?: () => void;
}

export function TeamApplicationManagement({ teamId, teamName, onApplicationHandled }: TeamApplicationManagementProps) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['team-applications', teamId],
    queryFn: async () => {
      // Fetch applications with attachments and answers_json
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
          attachments,
          answers_json,
          user:profiles!team_applications_user_id_fkey(id, name, avatar_url, level, bio)
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
      
      // Fetch skill experiences for all applicants
      const { data: allSkillExperiences } = await supabase
        .from('skill_experiences')
        .select(`
          id,
          user_id,
          title,
          description,
          xp_earned,
          skill:skills!skill_experiences_skill_id_fkey(name)
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
      
      // Map skill experiences by user
      const experiencesByUser: Record<string, SkillExperience[]> = {};
      (allSkillExperiences || []).forEach((exp: any) => {
        if (!exp.skill?.name) return;
        if (!experiencesByUser[exp.user_id]) {
          experiencesByUser[exp.user_id] = [];
        }
        experiencesByUser[exp.user_id].push({
          id: exp.id,
          skill_name: exp.skill.name,
          title: exp.title,
          description: exp.description,
          xp_earned: exp.xp_earned
        });
      });
      
      // Enrich applications with fit scores and experiences
      return apps.map(app => {
        const userSkills = skillsByUser[app.user_id] || [];
        const skillExperiences = experiencesByUser[app.user_id] || [];
        const matchedSlot = app.role_type 
          ? roleSlots.find(s => s.role_type === app.role_type) || null
          : null;
        const fitScore = matchedSlot 
          ? calculateFitScore(matchedSlot, userSkills, app.user.level)
          : null;
        
        return {
          ...app,
          userSkills,
          skillExperiences,
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

  const handleAccept = (applicationId: string) => {
    handleApplicationMutation.mutate({ applicationId, action: 'accept' });
  };

  const handleReject = (applicationId: string) => {
    handleApplicationMutation.mutate({ applicationId, action: 'reject' });
  };

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
              <ApplicantDetailCard
                key={application.id}
                application={application}
                processingId={processingId}
                onAccept={handleAccept}
                onReject={handleReject}
                isPending={true}
                teamName={teamName}
              />
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
          <div className="grid gap-4">
            {handledApplications.map((application) => (
              <ApplicantDetailCard
                key={application.id}
                application={application}
                processingId={processingId}
                onAccept={handleAccept}
                onReject={handleReject}
                isPending={false}
                teamName={teamName}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
