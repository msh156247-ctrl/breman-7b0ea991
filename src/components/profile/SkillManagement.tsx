import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, Loader2, Sparkles, BookOpen, Calendar, CheckCircle2, Clock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { SKILL_TIERS, SKILL_CATEGORIES, SKILL_TYPES, ROLE_TYPE_TO_SKILL_CATEGORIES, type SkillTier, type RoleType, type SkillType } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

type Skill = {
  id: string;
  name: string;
  category: string | null;
  type: SkillType | null;
};

type SkillExperience = {
  id: string;
  skill_id: string;
  title: string;
  description: string | null;
  xp_earned: number;
  created_at: string;
};

type UserSkill = {
  id: string;
  skill_id: string;
  level: number;
  tier: SkillTier;
  points: number | null;
  is_verified: boolean;
  years_of_experience: number;
  skill: Skill;
  experiences?: SkillExperience[];
};

// XP thresholds for each level
const LEVEL_XP_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000, 5000];

function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP_THRESHOLDS[i]) {
      return Math.min(i + 1, 10);
    }
  }
  return 1;
}

function getXPProgressInLevel(xp: number, level: number): { current: number; max: number } {
  const currentThreshold = LEVEL_XP_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_XP_THRESHOLDS[level] || LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1];
  return {
    current: xp - currentThreshold,
    max: nextThreshold - currentThreshold,
  };
}

function getTierFromLevel(level: number): SkillTier {
  if (level >= 9) return 'diamond';
  if (level >= 7) return 'platinum';
  if (level >= 5) return 'gold';
  if (level >= 3) return 'silver';
  return 'bronze';
}

// Experience XP options
const XP_OPTIONS = [
  { value: 25, label: '간단한 학습', description: '문서 읽기, 튜토리얼 시청' },
  { value: 50, label: '실습/연습', description: '사이드 프로젝트, 코딩 연습' },
  { value: 100, label: '프로젝트 참여', description: '실제 프로젝트에서 사용' },
  { value: 200, label: '주요 프로젝트', description: '핵심 기술로 프로젝트 완료' },
  { value: 300, label: '전문가 활동', description: '강의, 멘토링, 오픈소스 기여' },
];

// Years of experience options
const YEARS_OPTIONS = [
  { value: 0, label: '1년 미만' },
  { value: 1, label: '1년' },
  { value: 2, label: '2년' },
  { value: 3, label: '3년' },
  { value: 5, label: '5년 이상' },
  { value: 10, label: '10년 이상' },
];

export function SkillManagement() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isExpDialogOpen, setIsExpDialogOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number>(0);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  
  // Experience form state
  const [expSkillId, setExpSkillId] = useState<string>('');
  const [expTitle, setExpTitle] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expXP, setExpXP] = useState<number>(50);

  // Fetch all available skills
  const { data: allSkills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('type', { ascending: true })
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Skill[];
    },
  });

  // Fetch user's skills
  const { data: userSkills = [], isLoading } = useQuery({
    queryKey: ['user-skills', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_skills')
        .select(`
          id,
          skill_id,
          level,
          tier,
          points,
          is_verified,
          years_of_experience,
          skill:skills(id, name, category, type)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as unknown as UserSkill[];
    },
    enabled: !!user?.id,
  });

  // Fetch skill experiences
  const { data: skillExperiences = [] } = useQuery({
    queryKey: ['skill-experiences', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('skill_experiences')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SkillExperience[];
    },
    enabled: !!user?.id,
  });

  // Group experiences by skill
  const experiencesBySkill = skillExperiences.reduce((acc, exp) => {
    if (!acc[exp.skill_id]) acc[exp.skill_id] = [];
    acc[exp.skill_id].push(exp);
    return acc;
  }, {} as Record<string, SkillExperience[]>);

  // Calculate total XP per skill
  const totalXPBySkill = Object.entries(experiencesBySkill).reduce((acc, [skillId, exps]) => {
    acc[skillId] = exps.reduce((sum, exp) => sum + exp.xp_earned, 0);
    return acc;
  }, {} as Record<string, number>);

  // Get user's role types for filtering
  const userMainRole = (profile as any)?.main_role_type as RoleType | null;
  const userSubRoles = ((profile as any)?.sub_role_types || []) as RoleType[];
  const userRoleTypes = userMainRole ? [userMainRole, ...userSubRoles] : [];
  
  // Get relevant skill categories based on user's role types
  const relevantCategories = userRoleTypes.length > 0
    ? [...new Set(userRoleTypes.flatMap(role => ROLE_TYPE_TO_SKILL_CATEGORIES[role] || []))]
    : Object.keys(SKILL_CATEGORIES);

  // Get skills that user doesn't have yet, filtered by role type
  const availableSkills = allSkills.filter(skill => {
    const notOwned = !userSkills.some(us => us.skill_id === skill.id);
    const isRelevant = relevantCategories.includes(skill.category || '');
    return notOwned && isRelevant;
  });

  // Group available skills by type then category
  const groupedSkillsByType = availableSkills.reduce((acc, skill) => {
    const type = skill.type || 'tool';
    if (!acc[type]) acc[type] = {};
    const category = skill.category || 'other';
    if (!acc[type][category]) acc[type][category] = [];
    acc[type][category].push(skill);
    return acc;
  }, {} as Record<string, Record<string, Skill[]>>);

  // Add skill mutation (without level - level is 0 until verified)
  const addSkillMutation = useMutation({
    mutationFn: async ({ skillId, yearsOfExperience }: { skillId: string; yearsOfExperience: number }) => {
      if (!user?.id) throw new Error('로그인이 필요합니다');
      
      const { error } = await supabase
        .from('user_skills')
        .insert({
          user_id: user.id,
          skill_id: skillId,
          level: 0, // Level starts at 0, set by verification
          tier: 'bronze',
          points: 0,
          is_verified: false,
          years_of_experience: yearsOfExperience,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id] });
      toast.success('기술이 추가되었습니다. 팀 리더의 검증 후 레벨이 부여됩니다.');
      setIsAddDialogOpen(false);
      setSelectedSkillId('');
      setSelectedYears(0);
    },
    onError: (error) => {
      toast.error('기술 추가 실패: ' + error.message);
    },
  });

  // Add experience mutation
  const addExperienceMutation = useMutation({
    mutationFn: async ({ skillId, title, description, xpEarned }: { 
      skillId: string; 
      title: string; 
      description: string; 
      xpEarned: number 
    }) => {
      if (!user?.id) throw new Error('로그인이 필요합니다');
      
      const { error: expError } = await supabase
        .from('skill_experiences')
        .insert({
          user_id: user.id,
          skill_id: skillId,
          title,
          description: description || null,
          xp_earned: xpEarned,
        });
      
      if (expError) throw expError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['skill-experiences', user?.id] });
      toast.success('경험이 추가되었습니다');
      setIsExpDialogOpen(false);
      setExpSkillId('');
      setExpTitle('');
      setExpDescription('');
      setExpXP(50);
    },
    onError: (error) => {
      toast.error('경험 추가 실패: ' + error.message);
    },
  });

  // Update years of experience mutation
  const updateYearsMutation = useMutation({
    mutationFn: async ({ id, years }: { id: string; years: number }) => {
      const { error } = await supabase
        .from('user_skills')
        .update({ years_of_experience: years })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id] });
      toast.success('경력 연수가 업데이트되었습니다');
    },
    onError: (error) => {
      toast.error('업데이트 실패: ' + error.message);
    },
  });

  // Delete skill mutation
  const deleteSkillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id] });
      toast.success('기술이 삭제되었습니다');
    },
    onError: (error) => {
      toast.error('삭제 실패: ' + error.message);
    },
  });

  // Delete experience mutation
  const deleteExperienceMutation = useMutation({
    mutationFn: async ({ expId }: { expId: string }) => {
      if (!user?.id) throw new Error('로그인이 필요합니다');
      
      const { error: delError } = await supabase
        .from('skill_experiences')
        .delete()
        .eq('id', expId);
      
      if (delError) throw delError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['skill-experiences', user?.id] });
      toast.success('경험이 삭제되었습니다');
    },
    onError: (error) => {
      toast.error('삭제 실패: ' + error.message);
    },
  });

  const handleAddSkill = () => {
    if (!selectedSkillId) {
      toast.error('기술을 선택해주세요');
      return;
    }
    addSkillMutation.mutate({ skillId: selectedSkillId, yearsOfExperience: selectedYears });
  };

  const handleAddExperience = () => {
    if (!expSkillId || !expTitle.trim()) {
      toast.error('스킬과 제목을 입력해주세요');
      return;
    }
    addExperienceMutation.mutate({ 
      skillId: expSkillId, 
      title: expTitle.trim(), 
      description: expDescription.trim(),
      xpEarned: expXP,
    });
  };

  const openExpDialog = (skillId: string) => {
    setExpSkillId(skillId);
    setIsExpDialogOpen(true);
  };

  // Group user skills by type
  const userSkillsByType = userSkills.reduce((acc, us) => {
    const type = us.skill?.type || 'tool';
    if (!acc[type]) acc[type] = [];
    acc[type].push(us);
    return acc;
  }, {} as Record<string, UserSkill[]>);

  // Count verified vs unverified
  const verifiedCount = userSkills.filter(s => s.is_verified).length;
  const unverifiedCount = userSkills.length - verifiedCount;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg font-display">내 기술</CardTitle>
          {userSkills.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="w-3 h-3 text-success" />
                검증됨 {verifiedCount}
              </Badge>
              {unverifiedCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  대기 {unverifiedCount}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {userSkills.length > 0 && (
            <Dialog open={isExpDialogOpen} onOpenChange={setIsExpDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Sparkles className="w-4 h-4" />
                  경험 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>스킬 경험 추가</DialogTitle>
                  <DialogDescription>
                    실제 경험을 기록하세요. 팀 지원 시 리더가 참고합니다.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
                  {/* Skill selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">스킬 선택</label>
                    <Select value={expSkillId} onValueChange={setExpSkillId}>
                      <SelectTrigger>
                        <SelectValue placeholder="스킬을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {userSkills.map((us) => (
                          <SelectItem key={us.skill_id} value={us.skill_id}>
                            <span className="flex items-center gap-2">
                              {us.skill.type && SKILL_TYPES[us.skill.type]?.icon}
                              {us.skill.name}
                              {us.is_verified && <CheckCircle2 className="w-3 h-3 text-success" />}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Experience title */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">경험 제목</label>
                    <Input
                      placeholder="예: React로 대시보드 개발"
                      value={expTitle}
                      onChange={(e) => setExpTitle(e.target.value)}
                    />
                  </div>

                  {/* Experience description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">설명 (선택)</label>
                    <Textarea
                      placeholder="어떤 경험이었는지 설명해주세요"
                      value={expDescription}
                      onChange={(e) => setExpDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* XP selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">경험 유형</label>
                    <div className="grid grid-cols-1 gap-2">
                      {XP_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setExpXP(option.value)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            expXP === option.value
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{option.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsExpDialogOpen(false)}>
                    취소
                  </Button>
                  <Button 
                    onClick={handleAddExperience}
                    disabled={!expSkillId || !expTitle.trim() || addExperienceMutation.isPending}
                  >
                    {addExperienceMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    추가
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                기술 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>새 기술 추가</DialogTitle>
                <DialogDescription>
                  기술과 경력 연수를 선택하세요. 레벨은 팀 리더의 검증 후 부여됩니다.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Skill selection by type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">기술 선택</label>
                  <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                    <SelectTrigger>
                      <SelectValue placeholder="기술을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {Object.entries(groupedSkillsByType).map(([type, categories]) => (
                        <div key={type}>
                          <div className="px-2 py-2 text-xs font-bold text-primary bg-primary/5 sticky top-0">
                            {SKILL_TYPES[type as SkillType]?.icon} {SKILL_TYPES[type as SkillType]?.name || type}
                          </div>
                          {Object.entries(categories).map(([category, skills]) => (
                            <div key={category}>
                              <div className="px-4 py-1 text-xs text-muted-foreground">
                                {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES]?.name || category}
                              </div>
                              {skills.map((skill) => (
                                <SelectItem key={skill.id} value={skill.id} className="pl-6">
                                  {skill.name}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Years of experience */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">경력 연수</label>
                  <Select value={selectedYears.toString()} onValueChange={(v) => setSelectedYears(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="경력을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Info box */}
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">검증 기반 레벨 시스템</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>기술 추가 시 레벨은 0으로 시작합니다</li>
                        <li>팀에 지원하면 리더가 면접을 통해 검증합니다</li>
                        <li>검증 받은 레벨(1~10)이 실제 레벨로 반영됩니다</li>
                        <li>여러 팀에서 검증 받으면 평균 레벨이 적용됩니다</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  취소
                </Button>
                <Button 
                  onClick={handleAddSkill}
                  disabled={!selectedSkillId || addSkillMutation.isPending}
                >
                  {addSkillMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  추가
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {userSkills.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">아직 등록된 기술이 없습니다.</p>
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              첫 기술 추가하기
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(SKILL_TYPES).map(([typeKey, typeData]) => {
              const skills = userSkillsByType[typeKey];
              if (!skills || skills.length === 0) return null;
              
              return (
                <div key={typeKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{typeData.icon}</span>
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {typeData.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">({skills.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {skills.map((userSkill) => {
                      const experiences = experiencesBySkill[userSkill.skill_id] || [];
                      const isExpanded = expandedSkillId === userSkill.id;
                      
                      return (
                        <Collapsible 
                          key={userSkill.id}
                          open={isExpanded}
                          onOpenChange={(open) => setExpandedSkillId(open ? userSkill.id : null)}
                        >
                          <div 
                            className={`p-4 rounded-lg border transition-colors group ${
                              userSkill.is_verified 
                                ? 'border-success/30 bg-success/5' 
                                : 'border-border hover:border-primary/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SkillBadge 
                                        name={userSkill.skill.name} 
                                        tier={userSkill.is_verified ? (userSkill.tier as SkillTier) : 'bronze'}
                                        level={userSkill.is_verified ? userSkill.level : undefined}
                                        isVerified={userSkill.is_verified}
                                        yearsOfExperience={userSkill.years_of_experience}
                                        skillType={userSkill.skill.type || undefined}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {userSkill.is_verified 
                                      ? `검증됨 · Lv.${userSkill.level} · ${userSkill.years_of_experience}년 경력`
                                      : '검증 대기중 - 팀 지원 시 리더가 검증합니다'
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openExpDialog(userSkill.skill_id)}
                                  title="경험 추가"
                                >
                                  <Sparkles className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => deleteSkillMutation.mutate(userSkill.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Years of experience editor */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <span>경력:</span>
                              <Select 
                                value={userSkill.years_of_experience.toString()} 
                                onValueChange={(v) => updateYearsMutation.mutate({ id: userSkill.id, years: parseInt(v) })}
                              >
                                <SelectTrigger className="h-6 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {YEARS_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value.toString()}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2 text-xs">
                              {userSkill.is_verified ? (
                                <Badge variant="default" className="gap-1 bg-success text-success-foreground">
                                  <CheckCircle2 className="w-3 h-3" />
                                  검증됨 Lv.{userSkill.level}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="w-3 h-3" />
                                  검증 대기
                                </Badge>
                              )}
                            </div>
                            
                            {/* Experience toggle */}
                            {experiences.length > 0 && (
                              <CollapsibleTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <BookOpen className="w-3 h-3 mr-1" />
                                  경험 {experiences.length}개 {isExpanded ? '접기' : '보기'}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </div>
                          
                          {/* Experience list */}
                          <CollapsibleContent>
                            <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
                              {experiences.map((exp) => (
                                <div 
                                  key={exp.id}
                                  className="p-3 rounded-lg bg-muted/30 group/exp"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{exp.title}</p>
                                      {exp.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                          {exp.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span>{format(new Date(exp.created_at), 'yyyy.MM.dd')}</span>
                                      </div>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 opacity-0 group-hover/exp:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                      onClick={() => deleteExperienceMutation.mutate({ expId: exp.id })}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}