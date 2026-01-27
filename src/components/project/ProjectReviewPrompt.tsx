import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, Send, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProjectReviewPromptProps {
  projectId: string;
  projectTitle: string;
  reviewerId: string;
  targetType: 'team' | 'user';
  targetId: string;
  targetName: string;
  onReviewSubmitted?: () => void;
}

export function ProjectReviewPrompt({
  projectId,
  projectTitle,
  reviewerId,
  targetType,
  targetId,
  targetName,
  onReviewSubmitted,
}: ProjectReviewPromptProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: '평점을 선택해주세요',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const reviewData = {
        from_user_id: reviewerId,
        project_id: projectId,
        rating,
        comment: comment || null,
        ...(targetType === 'team' ? { to_team_id: targetId } : { to_user_id: targetId }),
      };

      const { error } = await supabase
        .from('reviews')
        .insert(reviewData);

      if (error) throw error;

      toast({
        title: '후기 작성 완료',
        description: '소중한 후기 감사합니다!',
      });
      
      setSubmitted(true);
      onReviewSubmitted?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: '후기 작성 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Star className="w-6 h-6 text-success fill-success" />
          </div>
          <h3 className="font-semibold text-lg mb-2">후기가 등록되었습니다!</h3>
          <p className="text-sm text-muted-foreground">
            {targetName}에 대한 소중한 피드백 감사합니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          후기 작성
        </CardTitle>
        <CardDescription>
          <strong>{projectTitle}</strong> 프로젝트에서 함께한 <strong>{targetName}</strong>에 대한 후기를 남겨주세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">평점</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star 
                  className={cn(
                    "w-8 h-8 transition-colors",
                    (hoveredRating || rating) >= star 
                      ? "text-secondary fill-secondary" 
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              {rating > 0 && `${rating}점`}
            </span>
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm font-medium mb-2 block">후기 (선택)</label>
          <Textarea
            placeholder="함께 작업한 경험을 공유해주세요..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full bg-gradient-primary"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          후기 등록하기
        </Button>
      </CardContent>
    </Card>
  );
}
