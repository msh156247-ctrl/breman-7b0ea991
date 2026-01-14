import { useState, useEffect } from 'react';
import { Plus, X, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_TYPES, type RoleType } from '@/lib/constants';

interface RequiredSkillLevel {
  skillName: string;
  minLevel: number;
}

export interface PositionSlot {
  id?: string;
  role_type: RoleType | null;
  min_level: number;
  max_count: number;
  current_count: number;
  required_skill_levels: RequiredSkillLevel[];
  is_open?: boolean;
  _isNew?: boolean;
  _toDelete?: boolean;
}

interface TeamPositionSlotEditorProps {
  slots: PositionSlot[];
  onChange: (slots: PositionSlot[]) => void;
}

export function TeamPositionSlotEditor({ slots, onChange }: TeamPositionSlotEditorProps) {
  const addSlot = () => {
    onChange([...slots, { 
      role_type: null, 
      min_level: 1, 
      max_count: 1,
      current_count: 0,
      required_skill_levels: [],
      is_open: true,
      _isNew: true,
    }]);
  };

  const updateSlot = (index: number, updates: Partial<PositionSlot>) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], ...updates };
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

  const addRequiredSkill = (slotIndex: number) => {
    const slot = slots[slotIndex];
    updateSlot(slotIndex, {
      required_skill_levels: [...slot.required_skill_levels, { skillName: '', minLevel: 1 }]
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
                      {/* Role Type, Level, and Count */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                          <label className="text-xs text-muted-foreground">최소 레벨</label>
                          <Select 
                            value={String(slot.min_level)} 
                            onValueChange={(v) => updateSlot(slotIndex, { min_level: parseInt(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                                <SelectItem key={level} value={String(level)}>
                                  Lv.{level}
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

                      {/* Required Skills */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted-foreground">필요 기술 (선택)</label>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => addRequiredSkill(slotIndex)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            기술 추가
                          </Button>
                        </div>
                        
                        {slot.required_skill_levels.length > 0 && (
                          <div className="space-y-2">
                            {slot.required_skill_levels.map((skill, skillIndex) => (
                              <div key={skillIndex} className="flex items-center gap-2">
                                <Input
                                  placeholder="기술명 (예: React)"
                                  value={skill.skillName}
                                  onChange={(e) => updateRequiredSkill(slotIndex, skillIndex, { skillName: e.target.value })}
                                  className="flex-1 h-8 text-sm"
                                />
                                <Select
                                  value={String(skill.minLevel)}
                                  onValueChange={(v) => updateRequiredSkill(slotIndex, skillIndex, { minLevel: parseInt(v) })}
                                >
                                  <SelectTrigger className="w-24 h-8">
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
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeRequiredSkill(slotIndex, skillIndex)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
