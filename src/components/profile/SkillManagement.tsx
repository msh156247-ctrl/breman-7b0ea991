import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, Save, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { SKILL_TIERS, SKILL_CATEGORIES, type SkillTier } from '@/lib/constants';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Skill = {
  id: string;
  name: string;
  category: string | null;
};

type UserSkill = {
  id: string;
  skill_id: string;
  level: number;
  tier: SkillTier;
  skill: Skill;
};

function getTierFromLevel(level: number): SkillTier {
  if (level >= 9) return 'diamond';
  if (level >= 7) return 'platinum';
  if (level >= 5) return 'gold';
  if (level >= 3) return 'silver';
  return 'bronze';
}

export function SkillManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingLevel, setEditingLevel] = useState<number>(1);

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
          skill:skills(id, name, category)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as unknown as UserSkill[];
    },
    enabled: !!user?.id,
  });

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
      
      const { error } = await supabase
        .from('user_skills')
        .insert({
          user_id: user.id,
          skill_id: skillId,
          level,
          tier,
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

  // Update skill mutation
  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, level }: { id: string; level: number }) => {
      const tier = getTierFromLevel(level);
      
      const { error } = await supabase
        .from('user_skills')
        .update({ level, tier })
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

  const handleAddSkill = () => {
    if (!selectedSkillId) {
      toast.error('기술을 선택해주세요');
      return;
    }
    addSkillMutation.mutate({ skillId: selectedSkillId, level: selectedLevel });
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-display">내 기술</CardTitle>
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
                  {skills.map((userSkill) => (
                    <div 
                      key={userSkill.id}
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
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${
                                  SKILL_CATEGORIES[userSkill.skill.category as keyof typeof SKILL_CATEGORIES]?.color || 'from-primary to-accent'
                                }`}
                                style={{ width: `${(userSkill.level / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">Lv.{userSkill.level}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
