import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Loader2, Star, ClipboardCheck, Clock, Trophy, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
              'w-6 h-6 transition-colors',
              star <= value ? 'fill-secondary text-secondary' : 'text-muted-foreground/30'
            )}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs text-muted-foreground ml-2 self-center">
          {SCORE_LABELS[value]}
        </span>
      )}
    </div>
  );
}

export function MemberEvaluationManagement({ teamId, members }: MemberEvaluationProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [evaluationType, setEvaluationType] = useState<'milestone' | 'final'>('milestone');
  const [contributionScore, setContributionScore] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const [punctualityScore, setPunctualityScore] = useState(0);
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
      if (contributionScore === 0 || qualityScore === 0 || punctualityScore === 0) {
        throw new Error('모든 항목을 평가해주세요');
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
          contribution_score: contributionScore,
          quality_score: qualityScore,
          punctuality_score: punctualityScore,
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
    setContributionScore(0);
    setQualityScore(0);
    setPunctualityScore(0);
    setComment('');
    setEvaluationType('milestone');
  };

  const openEvalDialog = (member: Member) => {
    resetForm();
    setSelectedMember(member);
    setDialogOpen(true);
  };

  // Group evaluations by member
  const evalsByMember = members.map((member) => {
    const memberEvals = evaluations.filter((e: any) => e.evaluated_user_id === member.id);
    const avgScore = memberEvals.length > 0
      ? memberEvals.reduce((sum: number, e: any) => sum + Number(e.overall_score), 0) / memberEvals.length
      : null;
    return { member, evaluations: memberEvals, avgScore };
  });

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
        마일스톤 달성 또는 프로젝트 완료 시 팀원의 기여도를 평가합니다.
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
                  {memberEvals.slice(0, 3).map((ev: any) => (
                    <div key={ev.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {ev.evaluation_type === 'final' ? '최종' : '마일스톤'}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(ev.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span title="기여도">🤝 {ev.contribution_score}</span>
                        <span title="퀄리티">📋 {ev.quality_score}</span>
                        <span title="일정">⏰ {ev.punctuality_score}</span>
                        <span className="font-semibold text-foreground">
                          평균 {Number(ev.overall_score).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evaluation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              팀원 평가
            </DialogTitle>
            <DialogDescription>
              {selectedMember?.name}님의 기여를 평가합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
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

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                기여도
              </Label>
              <StarRating value={contributionScore} onChange={setContributionScore} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                산출물 퀄리티
              </Label>
              <StarRating value={qualityScore} onChange={setQualityScore} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                일정 준수
              </Label>
              <StarRating value={punctualityScore} onChange={setPunctualityScore} />
            </div>

            <div className="space-y-2">
              <Label>코멘트 (선택)</Label>
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
              disabled={submitMutation.isPending || contributionScore === 0 || qualityScore === 0 || punctualityScore === 0}
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
