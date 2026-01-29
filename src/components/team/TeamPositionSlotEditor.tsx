import { useState, useEffect } from 'react';
import { Plus, X, GripVertical, Trash2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ROLE_TYPES, ANIMAL_SKINS, ROLE_TYPE_TO_SKILL_CATEGORIES, SKILL_CATEGORIES, type RoleType, type AnimalSkin } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
interface RequiredSkillLevel {
  skillName: string;
  minLevel: number;
}

export interface PositionQuestion {
  id: string;
  question: string;
  required: boolean;
}

export interface PositionSlot {
  id?: string;
  role_type: RoleType | null;
  preferred_animal_skin?: AnimalSkin | null;
  min_level: number;
  max_count: number;
  current_count: number;
  required_skill_levels: RequiredSkillLevel[];
  questions: PositionQuestion[];
  is_open?: boolean;
  _isNew?: boolean;
  _toDelete?: boolean;
}

interface TeamPositionSlotEditorProps {
  slots: PositionSlot[];
  onChange: (slots: PositionSlot[]) => void;
}

export function TeamPositionSlotEditor({ slots, onChange }: TeamPositionSlotEditorProps) {
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
      return data as { id: string; name: string; category: string | null }[];
    },
  });

  // Get skills filtered by role type for a slot
  const getSkillsForRoleType = (roleType: RoleType | null) => {
    if (!roleType) return allSkills;
    const categories = ROLE_TYPE_TO_SKILL_CATEGORIES[roleType] || [];
    return allSkills.filter(skill => categories.includes(skill.category || ''));
  };

  // Group skills by category
  const groupSkillsByCategory = (skills: typeof allSkills) => {
    return skills.reduce((acc, skill) => {
      const category = skill.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
      return acc;
    }, {} as Record<string, typeof allSkills>);
  };

  const addSlot = () => {
    onChange([...slots, { 
      role_type: null,
      preferred_animal_skin: null,
      min_level: 1, 
      max_count: 1,
      current_count: 0,
      required_skill_levels: [],
      questions: [],
      is_open: true,
      _isNew: true,
    }]);
  };

  const addQuestion = (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (slot.questions.length >= 5) return; // 최대 5개 제한
    updateSlot(slotIndex, {
      questions: [...slot.questions, { 
        id: crypto.randomUUID(), 
        question: '', 
        required: false 
      }]
    });
  };

  const updateQuestion = (slotIndex: number, questionIndex: number, updates: Partial<PositionQuestion>) => {
    const slot = slots[slotIndex];
    const newQuestions = [...slot.questions];
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], ...updates };
    updateSlot(slotIndex, { questions: newQuestions });
  };

  const removeQuestion = (slotIndex: number, questionIndex: number) => {
    const slot = slots[slotIndex];
    updateSlot(slotIndex, {
      questions: slot.questions.filter((_, i) => i !== questionIndex)
    });
  };
  const updateSlot = (index: number, updates: Partial<PositionSlot>) => {
    const newSlots = [...slots];
    // If role_type changed, clear skills
    if ('role_type' in updates && updates.role_type !== newSlots[index].role_type) {
      newSlots[index] = { ...newSlots[index], ...updates, required_skill_levels: [] };
    } else {
      newSlots[index] = { ...newSlots[index], ...updates };
    }
    onChange(newSlots);
  };

  const removeSlot = (index: number) => {
    const slot = slots[index];
    if (slot.id) {
      // Mark for deletion
      updateSlot(index, { _toDelete: true });
    } else {
      // Remove from array
      onChange(slots.filter((_, i) => i !== index));
    }
  };

  const addRequiredSkill = (slotIndex: number, skillName: string) => {
    const slot = slots[slotIndex];
    if (!skillName || slot.required_skill_levels.some(s => s.skillName === skillName)) return;
    updateSlot(slotIndex, {
      required_skill_levels: [...slot.required_skill_levels, { skillName, minLevel: 1 }]
    });
  };

  const updateRequiredSkill = (slotIndex: number, skillIndex: number, updates: Partial<RequiredSkillLevel>) => {
    const slot = slots[slotIndex];
    const newSkills = [...slot.required_skill_levels];
    newSkills[skillIndex] = { ...newSkills[skillIndex], ...updates };
    updateSlot(slotIndex, { required_skill_levels: newSkills });
  };

  const removeRequiredSkill = (slotIndex: number, skillIndex: number) => {
    const slot = slots[slotIndex];
    updateSlot(slotIndex, {
      required_skill_levels: slot.required_skill_levels.filter((_, i) => i !== skillIndex)
    });
  };

  const visibleSlots = slots.filter(s => !s._toDelete);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">모집 포지션</label>
        <Button type="button" variant="outline" size="sm" onClick={addSlot}>
          <Plus className="w-4 h-4 mr-1" />
          포지션 추가
        </Button>
      </div>

      {visibleSlots.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>모집할 포지션을 추가하세요</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {slots.map((slot, slotIndex) => {
            if (slot._toDelete) return null;
            
            return (
              <Card key={slot.id || `new-${slotIndex}`} className="relative">
                <CardContent className="p-4 space-y-4">
                  {/* Slot header */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      {/* Role Type and Count - 직무 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">직무</label>
                          <Select 
                            value={slot.role_type || ''} 
                            onValueChange={(v) => updateSlot(slotIndex, { role_type: v as RoleType })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="직무 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_TYPES).map(([key, value]) => (
                                <SelectItem key={key} value={key}>
                                  {value.icon} {value.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">모집 인원</label>
                          <Select 
                            value={String(slot.max_count)} 
                            onValueChange={(v) => updateSlot(slotIndex, { max_count: parseInt(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                                <SelectItem key={count} value={String(count)}>
                                  {count}명
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Required Skills - 기술 (직무에 따라 필터링) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted-foreground">
                            필요 기술 {slot.role_type && `(${ROLE_TYPES[slot.role_type].name} 관련)`}
                          </label>
                        </div>
                        
                        {/* Selected skills */}
                        {slot.required_skill_levels.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {slot.required_skill_levels.map((skill, skillIndex) => (
                              <div key={skillIndex} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                <span className="flex-1 text-sm font-medium">{skill.skillName}</span>
                                <Select
                                  value={String(skill.minLevel)}
                                  onValueChange={(v) => updateRequiredSkill(slotIndex, skillIndex, { minLevel: parseInt(v) })}
                                >
                                  <SelectTrigger className="w-20 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                                      <SelectItem key={level} value={String(level)}>
                                        Lv.{level}+
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeRequiredSkill(slotIndex, skillIndex)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Skill selector dropdown */}
                        {(() => {
                          const availableSkills = getSkillsForRoleType(slot.role_type);
                          const groupedSkills = groupSkillsByCategory(
                            availableSkills.filter(s => !slot.required_skill_levels.some(rs => rs.skillName === s.name))
                          );
                          
                          if (Object.keys(groupedSkills).length === 0) return null;
                          
                          return (
                            <Select
                              value=""
                              onValueChange={(skillName) => addRequiredSkill(slotIndex, skillName)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="+ 기술 추가" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(groupedSkills).map(([category, skills]) => (
                                  <div key={category}>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                      {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES]?.icon}
                                      {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES]?.name || category}
                                    </div>
                                    {skills.map((skill) => (
                                      <SelectItem key={skill.id} value={skill.name}>
                                        {skill.name}
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </div>

                      {/* Preferred Animal Skin - 성향 (참고용) */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">선호 성향 (참고용)</label>
                        <Select 
                          value={slot.preferred_animal_skin || 'none'} 
                          onValueChange={(v) => updateSlot(slotIndex, { preferred_animal_skin: v === 'none' ? null : v as AnimalSkin })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="선호 성향 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">무관</SelectItem>
                            {Object.entries(ANIMAL_SKINS).map(([key, value]) => (
                              <SelectItem key={key} value={key}>
                                {value.icon} {value.name} ({value.title})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Position Questions - 지원자 질문 */}
                      <Collapsible>
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>지원자 질문 ({slot.questions.length}/5)</span>
                            <ChevronDown className="w-3 h-3" />
                          </CollapsibleTrigger>
                          {slot.questions.length < 5 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => addQuestion(slotIndex)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              질문 추가
                            </Button>
                          )}
                        </div>
                        
                        <CollapsibleContent className="mt-2 space-y-2">
                          {slot.questions.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">
                              지원자에게 물어볼 질문을 추가하세요. (예: 원하는 업무 방식, 경험 등)
                            </p>
                          ) : (
                            slot.questions.map((q, qIndex) => (
                              <div key={q.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                                <div className="flex-1 space-y-2">
                                  <Input
                                    placeholder={`질문 ${qIndex + 1}`}
                                    value={q.question}
                                    onChange={(e) => updateQuestion(slotIndex, qIndex, { question: e.target.value })}
                                    className="h-8 text-sm"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`required-${slot.id || slotIndex}-${qIndex}`}
                                      checked={q.required}
                                      onCheckedChange={(checked) => updateQuestion(slotIndex, qIndex, { required: !!checked })}
                                    />
                                    <label 
                                      htmlFor={`required-${slot.id || slotIndex}-${qIndex}`}
                                      className="text-xs text-muted-foreground cursor-pointer"
                                    >
                                      필수 응답
                                    </label>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeQuestion(slotIndex, qIndex)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {/* Delete button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSlot(slotIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
