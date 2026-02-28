import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Loader2, Star, ClipboardCheck, Trophy, Send, Plus, X, Wrench, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Member {
  id: string;
  name: string;
  avatar_url: string | null;
  level: number;
}

interface MemberEvaluationProps {
  teamId: string;
  members: Member[];
}

interface RatingItem {
  name: string;
  score: number;
  comment?: string;
}

const SCORE_LABELS: Record<number, string> = {
  1: '매우 부족',
  2: '부족',
  3: '보통',
  4: '우수',
  5: '탁월',
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-colors"
        >
          <Star
            className={cn(
              'w-5 h-5 transition-colors',
              star <= value ? 'fill-secondary text-secondary' : 'text-muted-foreground/30'
            )}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs text-muted-foreground ml-1 self-center">
          {SCORE_LABELS[value]}
        </span>
      )}
    </div>
  );
}

function RatingItemRow({
  item,
  onUpdate,
  onRemove,
  placeholder,
}: {
  item: RatingItem;
  onUpdate: (item: RatingItem) => void;
  onRemove: () => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2">
        <Input
          value={item.name}
          onChange={(e) => onUpdate({ ...item, name: e.target.value })}
          placeholder={placeholder}
          className="flex-1 h-8 text-sm"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemove}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <StarRating value={item.score} onChange={(score) => onUpdate({ ...item, score })} />
    </div>
  );
}

export function MemberEvaluationManagement({ teamId, members }: MemberEvaluationProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [evaluationType, setEvaluationType] = useState<'milestone' | 'final'>('milestone');
  const [skillRatings, setSkillRatings] = useState<RatingItem[]>([]);
  const [taskRatings, setTaskRatings] = useState<RatingItem[]>([]);
  const [comment, setComment] = useState('');

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['member-evaluations', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_evaluations')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember) throw new Error('멤버를 선택해주세요');
      
      const validSkills = skillRatings.filter(r => r.name.trim() && r.score > 0);
      const validTasks = taskRatings.filter(r => r.name.trim() && r.score > 0);
      
      if (validSkills.length === 0 && validTasks.length === 0) {
        throw new Error('최소 1개 이상의 기술 또는 작업을 평가해주세요');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다');

      const { error } = await supabase
        .from('member_evaluations')
        .insert({
          team_id: teamId,
          evaluator_id: user.id,
          evaluated_user_id: selectedMember.id,
          evaluation_type: evaluationType,
          contribution_score: 0,
          quality_score: 0,
          punctuality_score: 0,
          skill_ratings: validSkills as any,
          task_ratings: validTasks as any,
          comment: comment || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-evaluations', teamId] });
      toast.success('평가가 등록되었습니다');
      resetForm();
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const resetForm = () => {
    setSelectedMember(null);
    setSkillRatings([]);
    setTaskRatings([]);
    setComment('');
    setEvaluationType('milestone');
  };

  const openEvalDialog = (member: Member) => {
    resetForm();
    setSelectedMember(member);
    setSkillRatings([{ name: '', score: 0 }]);
    setTaskRatings([{ name: '', score: 0 }]);
    setDialogOpen(true);
  };

  const addSkillRating = () => setSkillRatings([...skillRatings, { name: '', score: 0 }]);
  const addTaskRating = () => setTaskRatings([...taskRatings, { name: '', score: 0 }]);

  const updateSkillRating = (idx: number, item: RatingItem) => {
    const updated = [...skillRatings];
    updated[idx] = item;
    setSkillRatings(updated);
  };

  const updateTaskRating = (idx: number, item: RatingItem) => {
    const updated = [...taskRatings];
    updated[idx] = item;
    setTaskRatings(updated);
  };

  const removeSkillRating = (idx: number) => setSkillRatings(skillRatings.filter((_, i) => i !== idx));
  const removeTaskRating = (idx: number) => setTaskRatings(taskRatings.filter((_, i) => i !== idx));

  // Group evaluations by member
  const evalsByMember = members.map((member) => {
    const memberEvals = evaluations.filter((e: any) => e.evaluated_user_id === member.id);
    const avgScore = memberEvals.length > 0
      ? memberEvals.reduce((sum: number, e: any) => sum + Number(e.overall_score), 0) / memberEvals.length
      : null;
    return { member, evaluations: memberEvals, avgScore };
  });

  const hasValidRatings = () => {
    const validSkills = skillRatings.filter(r => r.name.trim() && r.score > 0);
    const validTasks = taskRatings.filter(r => r.name.trim() && r.score > 0);
    return validSkills.length > 0 || validTasks.length > 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        프로젝트에서 사용한 기술과 수행한 작업 단위로 팀원을 평가합니다.
      </p>

      <div className="space-y-3">
        {evalsByMember.map(({ member, evaluations: memberEvals, avgScore }) => (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  userId={member.id}
                  avatarUrl={member.avatar_url}
                  name={member.name}
                  className="h-10 w-10"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{member.name}</span>
                    <span className="text-xs text-muted-foreground">Lv.{member.level}</span>
                  </div>
                  {avgScore !== null ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                      <span className="text-sm font-semibold">{avgScore.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({memberEvals.length}회 평가)</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">아직 평가 없음</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEvalDialog(member)}
                  className="gap-1.5 shrink-0"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  평가하기
                </Button>
              </div>

              {/* Recent evaluations */}
              {memberEvals.length > 0 && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {memberEvals.slice(0, 3).map((ev: any) => {
                    const skills = (ev.skill_ratings || []) as RatingItem[];
                    const tasks = (ev.task_ratings || []) as RatingItem[];
                    return (
                      <div key={ev.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {ev.evaluation_type === 'final' ? '최종' : '마일스톤'}
                            </Badge>
                            <span className="text-muted-foreground">
                              {new Date(ev.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          <span className="font-semibold text-foreground">
                            평균 {Number(ev.overall_score).toFixed(1)}
                          </span>
                        </div>
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {skills.map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] gap-0.5">
                                <Wrench className="w-2.5 h-2.5" />
                                {s.name} {s.score}/5
                              </Badge>
                            ))}
                          </div>
                        )}
                        {tasks.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tasks.map((t, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] gap-0.5">
                                <ListChecks className="w-2.5 h-2.5" />
                                {t.name} {t.score}/5
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evaluation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              팀원 평가
            </DialogTitle>
            <DialogDescription>
              {selectedMember?.name}님의 기술 숙련도와 작업 수행도를 평가합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>평가 유형</Label>
              <Select value={evaluationType} onValueChange={(v) => setEvaluationType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="milestone">마일스톤 평가</SelectItem>
                  <SelectItem value="final">최종 평가</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="skills" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="skills" className="gap-1.5 text-xs">
                  <Wrench className="w-3.5 h-3.5" />
                  기술 평가 ({skillRatings.length})
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-1.5 text-xs">
                  <ListChecks className="w-3.5 h-3.5" />
                  작업 평가 ({taskRatings.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="skills" className="space-y-2 mt-3">
                <p className="text-xs text-muted-foreground">
                  프로젝트에서 사용한 기술/스킬별 숙련도를 평가하세요
                </p>
                {skillRatings.map((item, idx) => (
                  <RatingItemRow
                    key={idx}
                    item={item}
                    onUpdate={(updated) => updateSkillRating(idx, updated)}
                    onRemove={() => removeSkillRating(idx)}
                    placeholder="예: React, Python, Figma..."
                  />
                ))}
                <Button variant="outline" size="sm" onClick={addSkillRating} className="gap-1.5 w-full">
                  <Plus className="w-3.5 h-3.5" />
                  기술 추가
                </Button>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-2 mt-3">
                <p className="text-xs text-muted-foreground">
                  수행한 작업/태스크별 완성도를 평가하세요
                </p>
                {taskRatings.map((item, idx) => (
                  <RatingItemRow
                    key={idx}
                    item={item}
                    onUpdate={(updated) => updateTaskRating(idx, updated)}
                    onRemove={() => removeTaskRating(idx)}
                    placeholder="예: API 설계, UI 구현, DB 모델링..."
                  />
                ))}
                <Button variant="outline" size="sm" onClick={addTaskRating} className="gap-1.5 w-full">
                  <Plus className="w-3.5 h-3.5" />
                  작업 추가
                </Button>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>종합 코멘트 (선택)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="팀원에게 전달할 피드백을 작성하세요..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !hasValidRatings()}
              className="gap-1.5"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              평가 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
