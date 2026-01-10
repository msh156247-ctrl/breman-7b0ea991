import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, Save, Loader2, ChevronUp, Sparkles, BookOpen, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { SKILL_TIERS, SKILL_CATEGORIES, type SkillTier } from '@/lib/constants';
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

type Skill = {
  id: string;
  name: string;
  category: string | null;
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

export function SkillManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isExpDialogOpen, setIsExpDialogOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingLevel, setEditingLevel] = useState<number>(1);
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
          skill:skills(id, name, category)
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

  // Get skills that user doesn't have yet
  const availableSkills = allSkills.filter(
    skill => !userSkills.some(us => us.skill_id === skill.id)
  );

  // Group available skills by category
  const groupedSkills = availableSkills.reduce((acc, skill) => {
    const category = skill.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  // Add skill mutation
  const addSkillMutation = useMutation({
    mutationFn: async ({ skillId, level }: { skillId: string; level: number }) => {
      if (!user?.id) throw new Error('로그인이 필요합니다');
      
      const tier = getTierFromLevel(level);
      const initialPoints = LEVEL_XP_THRESHOLDS[level - 1] || 0;
      
      const { error } = await supabase
        .from('user_skills')
        .insert({
          user_id: user.id,
          skill_id: skillId,
          level,
          tier,
          points: initialPoints,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id] });
      toast.success('기술이 추가되었습니다');
      setIsAddDialogOpen(false);
      setSelectedSkillId('');
      setSelectedLevel(1);
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
      
      // Add experience
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
      
      // Calculate new total XP
      const currentXP = totalXPBySkill[skillId] || 0;
      const userSkill = userSkills.find(us => us.skill_id === skillId);
      const basePoints = userSkill?.points || 0;
      const newTotalXP = basePoints + currentXP + xpEarned;
      const newLevel = getLevelFromXP(newTotalXP);
      const newTier = getTierFromLevel(newLevel);
      
      // Update user skill level and points
      const { error: updateError } = await supabase
        .from('user_skills')
        .update({ 
          level: newLevel, 
          tier: newTier,
          points: newTotalXP,
        })
        .eq('skill_id', skillId)
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      return { newLevel, previousLevel: userSkill?.level || 1 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['skill-experiences', user?.id] });
      
      if (result.newLevel > result.previousLevel) {
        toast.success(`🎉 레벨 업! Lv.${result.previousLevel} → Lv.${result.newLevel}`);
      } else {
        toast.success('경험이 추가되었습니다');
      }
      
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

  // Update skill mutation
  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, level }: { id: string; level: number }) => {
      const tier = getTierFromLevel(level);
      const points = LEVEL_XP_THRESHOLDS[level - 1] || 0;
      
      const { error } = await supabase
        .from('user_skills')
        .update({ level, tier, points })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-skills', user?.id] });
      toast.success('레벨이 업데이트되었습니다');
      setEditingSkillId(null);
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
    mutationFn: async ({ expId, skillId, xpAmount }: { expId: string; skillId: string; xpAmount: number }) => {
      if (!user?.id) throw new Error('로그인이 필요합니다');
      
      // Delete experience
      const { error: delError } = await supabase
        .from('skill_experiences')
        .delete()
        .eq('id', expId);
      
      if (delError) throw delError;
      
      // Recalculate XP and level
      const userSkill = userSkills.find(us => us.skill_id === skillId);
      const currentPoints = userSkill?.points || 0;
      const newPoints = Math.max(0, currentPoints - xpAmount);
      const newLevel = getLevelFromXP(newPoints);
      const newTier = getTierFromLevel(newLevel);
      
      // Update user skill
      const { error: updateError } = await supabase
        .from('user_skills')
        .update({ level: newLevel, tier: newTier, points: newPoints })
        .eq('skill_id', skillId)
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
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
    addSkillMutation.mutate({ skillId: selectedSkillId, level: selectedLevel });
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

  const handleStartEdit = (userSkill: UserSkill) => {
    setEditingSkillId(userSkill.id);
    setEditingLevel(userSkill.level);
  };

  const handleSaveEdit = () => {
    if (editingSkillId) {
      updateSkillMutation.mutate({ id: editingSkillId, level: editingLevel });
    }
  };

  const handleCancelEdit = () => {
    setEditingSkillId(null);
    setEditingLevel(1);
  };

  const openExpDialog = (skillId: string) => {
    setExpSkillId(skillId);
    setIsExpDialogOpen(true);
  };

  // Group user skills by category
  const userSkillsByCategory = userSkills.reduce((acc, us) => {
    const category = us.skill?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(us);
    return acc;
  }, {} as Record<string, UserSkill[]>);

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
        <CardTitle className="text-lg font-display">내 기술</CardTitle>
        <div className="flex gap-2">
          {userSkills.length > 0 && (
            <Dialog open={isExpDialogOpen} onOpenChange={setIsExpDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Sparkles className="w-4 h-4" />
                  경험 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>스킬 경험 추가</DialogTitle>
                  <DialogDescription>
                    경험을 추가하면 XP가 쌓이고 레벨이 자동으로 올라갑니다.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
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
                            {us.skill.name} (Lv.{us.level})
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
                    <label className="text-sm font-medium">경험 유형 (획득 XP)</label>
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
                            <span className="text-xs font-bold text-primary">+{option.value} XP</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* XP preview */}
                  {expSkillId && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">획득 예정 XP</span>
                        <span className="font-bold text-primary">+{expXP} XP</span>
                      </div>
                      {(() => {
                        const userSkill = userSkills.find(us => us.skill_id === expSkillId);
                        const currentPoints = userSkill?.points || 0;
                        const newTotal = currentPoints + expXP;
                        const newLevel = getLevelFromXP(newTotal);
                        const willLevelUp = newLevel > (userSkill?.level || 1);
                        
                        return willLevelUp ? (
                          <div className="mt-2 p-2 rounded bg-success/10 text-success text-xs font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            레벨 업 예정! Lv.{userSkill?.level} → Lv.{newLevel}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 기술 추가</DialogTitle>
                <DialogDescription>
                  추가할 기술을 선택하고 현재 레벨을 설정하세요.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Skill selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">기술 선택</label>
                  <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                    <SelectTrigger>
                      <SelectValue placeholder="기술을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(groupedSkills).map(([category, skills]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES]?.name || category}
                          </div>
                          {skills.map((skill) => (
                            <SelectItem key={skill.id} value={skill.id}>
                              {skill.name}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Level slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">레벨</label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{selectedLevel}</span>
                      <span className="text-sm text-muted-foreground">/ 10</span>
                    </div>
                  </div>
                  <Slider
                    value={[selectedLevel]}
                    onValueChange={(v) => setSelectedLevel(v[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-center">
                    <SkillBadge 
                      name={allSkills.find(s => s.id === selectedSkillId)?.name || '기술'} 
                      tier={getTierFromLevel(selectedLevel)}
                      level={selectedLevel}
                      size="lg"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>입문</span>
                    <span>초급</span>
                    <span>중급</span>
                    <span>고급</span>
                    <span>전문가</span>
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
            {Object.entries(userSkillsByCategory).map(([category, skills]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">
                    {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES]?.icon || '📦'}
                  </span>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES]?.name || category}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skills.map((userSkill) => {
                    const experiences = experiencesBySkill[userSkill.skill_id] || [];
                    const totalXP = userSkill.points || 0;
                    const xpProgress = getXPProgressInLevel(totalXP, userSkill.level);
                    const isExpanded = expandedSkillId === userSkill.id;
                    
                    return (
                      <Collapsible 
                        key={userSkill.id}
                        open={isExpanded}
                        onOpenChange={(open) => setExpandedSkillId(open ? userSkill.id : null)}
                      >
                        <div 
                          className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors group"
                        >
                          {editingSkillId === userSkill.id ? (
                            // Edit mode
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <SkillBadge 
                                  name={userSkill.skill.name} 
                                  tier={getTierFromLevel(editingLevel)}
                                />
                                <span className="text-lg font-bold">Lv.{editingLevel}</span>
                              </div>
                              <Slider
                                value={[editingLevel]}
                                onValueChange={(v) => setEditingLevel(v[0])}
                                min={1}
                                max={10}
                                step={1}
                                className="w-full"
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={handleSaveEdit}
                                  disabled={updateSkillMutation.isPending}
                                  className="flex-1"
                                >
                                  {updateSkillMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={handleCancelEdit}
                                  className="flex-1"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <SkillBadge 
                                  name={userSkill.skill.name} 
                                  tier={userSkill.tier as SkillTier}
                                />
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
                                    className="h-7 w-7"
                                    onClick={() => handleStartEdit(userSkill)}
                                  >
                                    <ChevronUp className="w-3 h-3" />
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
                              
                              {/* Level and XP progress */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {totalXP} XP / {LEVEL_XP_THRESHOLDS[userSkill.level] || '∞'} XP
                                  </span>
                                  <span className="font-medium">Lv.{userSkill.level}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full bg-gradient-to-r ${
                                      SKILL_CATEGORIES[userSkill.skill.category as keyof typeof SKILL_CATEGORIES]?.color || 'from-primary to-accent'
                                    }`}
                                    style={{ width: `${Math.min((xpProgress.current / xpProgress.max) * 100, 100)}%` }}
                                  />
                                </div>
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
                            </>
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
                                      <span className="font-medium text-primary">+{exp.xp_earned} XP</span>
                                      <span>·</span>
                                      <Calendar className="w-3 h-3" />
                                      <span>{format(new Date(exp.created_at), 'yyyy.MM.dd')}</span>
                                    </div>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover/exp:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                    onClick={() => deleteExperienceMutation.mutate({ 
                                      expId: exp.id, 
                                      skillId: exp.skill_id,
                                      xpAmount: exp.xp_earned,
                                    })}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
