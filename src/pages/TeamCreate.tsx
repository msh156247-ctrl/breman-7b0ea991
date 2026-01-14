import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeamPositionSlotEditor, type PositionSlot } from '@/components/team/TeamPositionSlotEditor';

const EMOJIS = ['🚀', '💻', '🎨', '🔒', '⚡', '🌟', '🎯', '💡', '🔥', '🏆', '💪', '🎮'];

export default function TeamCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slogan: '',
    description: '',
    emblem: '🚀',
    recruitment_method: 'public' as 'public' | 'invite' | 'auto',
  });

  const [positionSlots, setPositionSlots] = useState<PositionSlot[]>([]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: '팀 이름 필요',
        description: '팀 이름을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: '로그인 필요',
        description: '팀을 만들려면 로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: formData.name,
          slogan: formData.slogan,
          description: formData.description,
          emblem_url: formData.emblem, // Using emoji as emblem for now
          recruitment_method: formData.recruitment_method,
          leader_id: user.id,
          status: 'recruiting',
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Create role slots
      const slotsToInsert = positionSlots.filter(s => !s._toDelete && s.role_type);
      if (slotsToInsert.length > 0) {
        const { error: slotsError } = await supabase
          .from('team_role_slots')
          .insert(
            slotsToInsert.map(slot => ({
              team_id: team.id,
              role: 'horse' as const, // Default animal role for compatibility
              role_type: slot.role_type,
              min_level: slot.min_level,
              max_count: slot.max_count,
              current_count: 0,
              required_skill_levels: JSON.parse(JSON.stringify(slot.required_skill_levels)),
              is_open: true,
            }))
          );

        if (slotsError) throw slotsError;
      }

      toast({
        title: '팀 생성 완료!',
        description: `${formData.name} 팀이 성공적으로 생성되었습니다.`,
      });

      navigate(`/teams/${team.id}`);
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: '생성 실패',
        description: '팀을 생성할 수 없습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <ScrollReveal animation="fade-up">
        <Link to="/teams" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>팀 목록</span>
        </Link>
      </ScrollReveal>

      <ScrollReveal animation="fade-up" delay={100}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">새 팀 만들기</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emblem">팀 엠블럼</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleChange('emblem', emoji)}
                        className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all ${
                          formData.emblem === emoji
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-muted-foreground'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">팀 이름 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="예: 스타트업 드림팀"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="slogan">슬로건</Label>
                  <Input
                    id="slogan"
                    value={formData.slogan}
                    onChange={(e) => handleChange('slogan', e.target.value)}
                    placeholder="예: 혁신으로 세상을 바꾸다"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">팀 소개</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="팀에 대한 소개를 작성해주세요..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="recruitment">모집 방식</Label>
                  <Select
                    value={formData.recruitment_method}
                    onValueChange={(value) => handleChange('recruitment_method', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">공개 모집 (누구나 지원 가능)</SelectItem>
                      <SelectItem value="invite">초대 전용</SelectItem>
                      <SelectItem value="auto">자동 승인 (조건 충족 시)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Open Positions */}
              <TeamPositionSlotEditor 
                slots={positionSlots} 
                onChange={setPositionSlots} 
              />

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/teams')}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '생성 중...' : '팀 만들기'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  );
}
