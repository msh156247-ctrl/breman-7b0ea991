import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Send } from 'lucide-react';
import { ROLES, ROLE_TYPES, ANIMAL_SKINS, type UserRole, type RoleType, type AnimalSkin } from '@/lib/constants';

interface PositionQuestion {
  id: string;
  question: string;
  required: boolean;
}

interface RequiredSkillLevel {
  skillName: string;
  minLevel: number;
}

interface OpenSlot {
  id: string;
  role: UserRole;
  role_type: RoleType | null;
  preferred_animal_skin: AnimalSkin | null;
  min_level: number;
  required_skill_levels: RequiredSkillLevel[];
  questions: PositionQuestion[];
  current_count: number;
  max_count: number;
}

interface UserSkill {
  skill_name: string;
  level: number;
}

interface Profile {
  level: number;
  animal_skin: string | null;
  primary_role: string | null;
  main_role_type: string | null;
}

interface FitResult {
  score: number;
  levelMet: boolean;
  personalityMatch: boolean;
  skillsMatched: number;
  skillsTotal: number;
  details: { skillName: string; required: number; userLevel: number | null; met: boolean }[];
}

interface TeamApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: OpenSlot[];
  userSkills: UserSkill[];
  profile: Profile | null;
  onSubmit: (data: {
    slotId: string;
    role: UserRole;
    roleType: RoleType | null;
    intro: string;
    answers: Record<string, string>;
  }) => Promise<void>;
  teamName: string;
}

function calculateFitScore(
  slot: OpenSlot, 
  userSkills: UserSkill[], 
  userLevel: number,
  userAnimalSkin?: AnimalSkin | null
): FitResult {
  const levelMet = userLevel >= slot.min_level;
  const personalityMatch = !slot.preferred_animal_skin || slot.preferred_animal_skin === userAnimalSkin;
  
  if (slot.required_skill_levels.length === 0) {
    const baseScore = (levelMet ? 40 : 0) + (personalityMatch ? 20 : 0) + 40;
    return { 
      score: baseScore, 
      levelMet, 
      personalityMatch,
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
  
  const personalityScore = personalityMatch ? 20 : 0;
  const levelScore = levelMet ? 20 : 0;
  const skillScore = skillsTotal > 0 ? (skillsMatched / skillsTotal) * 60 : 60;
  
  return {
    score: Math.round(personalityScore + levelScore + skillScore),
    levelMet,
    personalityMatch,
    skillsMatched,
    skillsTotal,
    details
  };
}

export function TeamApplicationDialog({
  open,
  onOpenChange,
  slots,
  userSkills,
  profile,
  onSubmit,
  teamName,
}: TeamApplicationDialogProps) {
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [intro, setIntro] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSlots = slots.filter(s => s.current_count < s.max_count);
  
  // Auto-select best matching slot
  const sortedSlots = useMemo(() => {
    if (!profile) return availableSlots;
    
    return [...availableSlots].sort((a, b) => {
      const scoreA = calculateFitScore(a, userSkills, profile.level, profile.animal_skin as AnimalSkin | null).score;
      const scoreB = calculateFitScore(b, userSkills, profile.level, profile.animal_skin as AnimalSkin | null).score;
      return scoreB - scoreA;
    });
  }, [availableSlots, userSkills, profile]);

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const fitResult = selectedSlot && profile 
    ? calculateFitScore(selectedSlot, userSkills, profile.level, profile.animal_skin as AnimalSkin | null)
    : null;

  // Check if all required questions are answered
  const requiredQuestions = selectedSlot?.questions.filter(q => q.required) || [];
  const allRequiredAnswered = requiredQuestions.every(q => answers[q.id]?.trim());
  const canSubmit = selectedSlotId && intro.trim() && allRequiredAnswered;

  const handleSubmit = async () => {
    if (!selectedSlot || !canSubmit) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        slotId: selectedSlot.id,
        role: selectedSlot.role,
        roleType: selectedSlot.role_type,
        intro,
        answers,
      });
      onOpenChange(false);
      // Reset form
      setSelectedSlotId('');
      setIntro('');
      setAnswers({});
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset answers when slot changes
  const handleSlotChange = (slotId: string) => {
    setSelectedSlotId(slotId);
    setAnswers({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>팀 지원하기</DialogTitle>
          <DialogDescription>
            {teamName}에 지원합니다
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-2">
            {/* Position Selection */}
            <div className="space-y-2">
              <Label>지원 포지션 선택 *</Label>
              <Select value={selectedSlotId} onValueChange={handleSlotChange}>
                <SelectTrigger>
                  <SelectValue placeholder="포지션을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {sortedSlots.map((slot) => {
                    const roleTypeInfo = slot.role_type ? ROLE_TYPES[slot.role_type] : null;
                    const skinInfo = slot.preferred_animal_skin ? ANIMAL_SKINS[slot.preferred_animal_skin] : null;
                    const fitScore = profile 
                      ? calculateFitScore(slot, userSkills, profile.level, profile.animal_skin as AnimalSkin | null)
                      : null;
                    const meetsLevel = !profile || profile.level >= slot.min_level;
                    
                    return (
                      <SelectItem 
                        key={slot.id} 
                        value={slot.id}
                        disabled={!meetsLevel}
                      >
                        <div className="flex items-center gap-2">
                          <span>{roleTypeInfo?.icon || ROLES[slot.role].icon}</span>
                          <span>{roleTypeInfo?.name || ROLES[slot.role].name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({slot.current_count}/{slot.max_count})
                          </span>
                          {fitScore && (
                            <Badge 
                              variant="outline"
                              className={`text-xs ${
                                fitScore.score >= 80 
                                  ? "bg-green-500/10 text-green-700 border-green-500/30" 
                                  : fitScore.score >= 50 
                                  ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                                  : "bg-red-500/10 text-red-700 border-red-500/30"
                              }`}
                            >
                              {fitScore.score}%
                            </Badge>
                          )}
                          {!meetsLevel && (
                            <span className="text-xs text-destructive">(레벨 부족)</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Fit Score Display */}
            {selectedSlot && fitResult && (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">적합도</span>
                  <div className="flex items-center gap-2">
                    {fitResult.score >= 80 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : fitResult.score >= 50 ? (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`font-bold ${
                      fitResult.score >= 80 ? "text-green-500" 
                      : fitResult.score >= 50 ? "text-yellow-500"
                      : "text-red-500"
                    }`}>
                      {fitResult.score}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={fitResult.score} 
                  className={`h-2 ${
                    fitResult.score >= 80 ? "[&>div]:bg-green-500" 
                    : fitResult.score >= 50 ? "[&>div]:bg-yellow-500"
                    : "[&>div]:bg-red-500"
                  }`}
                />
              </div>
            )}

            {/* Self Introduction */}
            <div className="space-y-2">
              <Label htmlFor="intro">자기소개 *</Label>
              <Textarea
                id="intro"
                placeholder="간단한 자기소개와 지원 동기를 작성해주세요..."
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={4}
              />
            </div>

            {/* Position Questions */}
            {selectedSlot && selectedSlot.questions.length > 0 && (
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  포지션 질문
                  <Badge variant="secondary" className="text-xs">
                    {selectedSlot.questions.length}개
                  </Badge>
                </Label>
                {selectedSlot.questions.map((q, index) => (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm mb-2">
                          {q.question}
                          {q.required && <span className="text-destructive ml-1">*</span>}
                        </p>
                        <Textarea
                          placeholder="답변을 입력하세요..."
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="bg-gradient-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                지원 제출하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}