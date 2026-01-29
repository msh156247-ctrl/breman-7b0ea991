import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TeamPositionSlotEditor, type PositionSlot } from '@/components/team/TeamPositionSlotEditor';
import { TeamEmblemUpload } from '@/components/team/TeamEmblemUpload';
import type { RoleType } from '@/lib/constants';

interface RequiredSkillLevel {
  skillName: string;
  minLevel: number;
}

export default function TeamEdit() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    slogan: '',
    description: '',
    emblem: '🚀',
    recruitment_method: 'public' as 'public' | 'invite' | 'auto',
    status: 'recruiting' as 'active' | 'inactive' | 'recruiting',
  });

  const [positionSlots, setPositionSlots] = useState<PositionSlot[]>([]);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      if (team.leader_id !== user?.id) {
        toast({
          title: '권한 없음',
          description: '팀 리더만 수정할 수 있습니다.',
          variant: 'destructive',
        });
        navigate(`/teams/${teamId}`);
        return;
      }

      setFormData({
        name: team.name || '',
        slogan: team.slogan || '',
        description: team.description || '',
        emblem: team.emblem_url || '🚀',
        recruitment_method: (team.recruitment_method as 'public' | 'invite' | 'auto') || 'public',
        status: (team.status as 'active' | 'inactive' | 'recruiting') || 'recruiting',
      });

      const { data: slots } = await supabase
        .from('team_role_slots')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (slots) {
        setPositionSlots(slots.map(slot => {
          let requiredSkillLevels: RequiredSkillLevel[] = [];
          if (Array.isArray(slot.required_skill_levels)) {
            requiredSkillLevels = slot.required_skill_levels as unknown as RequiredSkillLevel[];
          }
          return {
            id: slot.id,
            role_type: slot.role_type as RoleType | null,
            min_level: slot.min_level || 1,
            max_count: slot.max_count || 1,
            current_count: slot.current_count || 0,
            required_skill_levels: requiredSkillLevels,
            is_open: slot.is_open ?? true,
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      toast({
        title: '오류',
        description: '팀 정보를 불러올 수 없습니다.',
        variant: 'destructive',
      });
      navigate('/teams');
    } finally {
      setLoading(false);
    }
  };

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

    setIsSubmitting(true);

    try {
      // Update team
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          slogan: formData.slogan,
          description: formData.description,
          emblem_url: formData.emblem,
          recruitment_method: formData.recruitment_method,
          status: formData.status,
        })
        .eq('id', teamId);

      if (teamError) throw teamError;

      // Handle slots: delete, update, insert
      const slotsToDelete = positionSlots.filter(s => s._toDelete && s.id);
      const slotsToUpdate = positionSlots.filter(s => !s._toDelete && !s._isNew && s.id);
      const slotsToInsert = positionSlots.filter(s => !s._toDelete && s._isNew && s.role_type);

      // Delete marked slots
      if (slotsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('team_role_slots')
          .delete()
          .in('id', slotsToDelete.map(s => s.id!));

        if (deleteError) throw deleteError;
      }

      // Update existing slots
      for (const slot of slotsToUpdate) {
        const { error } = await supabase
          .from('team_role_slots')
          .update({
            role_type: slot.role_type,
            min_level: slot.min_level,
            max_count: slot.max_count,
            required_skill_levels: JSON.parse(JSON.stringify(slot.required_skill_levels)),
          })
          .eq('id', slot.id!);

        if (error) throw error;
      }

      // Insert new slots
      if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('team_role_slots')
          .insert(
            slotsToInsert.map(slot => ({
              team_id: teamId,
              role: 'horse' as const,
              role_type: slot.role_type,
              min_level: slot.min_level,
              max_count: slot.max_count,
              current_count: 0,
              required_skill_levels: JSON.parse(JSON.stringify(slot.required_skill_levels)),
              is_open: true,
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: '팀 수정 완료!',
        description: '팀 정보가 업데이트되었습니다.',
      });

      navigate(`/teams/${teamId}`);
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: '수정 실패',
        description: '팀을 수정할 수 없습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Delete role slots first
      await supabase
        .from('team_role_slots')
        .delete()
        .eq('team_id', teamId);

      // Delete team memberships
      await supabase
        .from('team_memberships')
        .delete()
        .eq('team_id', teamId);

      // Delete team applications
      await supabase
        .from('team_applications')
        .delete()
        .eq('team_id', teamId);

      // Delete team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: '팀 삭제 완료',
        description: '팀이 삭제되었습니다.',
      });

      navigate('/teams');
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: '삭제 실패',
        description: '팀을 삭제할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ScrollReveal animation="fade-up">
        <Link to={`/teams/${teamId}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>팀 상세로 돌아가기</span>
        </Link>
      </ScrollReveal>

      <ScrollReveal animation="fade-up" delay={100}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">팀 수정</CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  팀 삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>정말 팀을 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 작업은 되돌릴 수 없습니다. 모든 팀 데이터, 멤버십, 지원서가 영구적으로 삭제됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <TeamEmblemUpload
                  teamId={teamId}
                  currentEmblem={formData.emblem}
                  onEmblemChange={(emblem) => handleChange('emblem', emblem)}
                  isEditing={true}
                />

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
                  <Label htmlFor="status">팀 상태</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recruiting">모집중</SelectItem>
                      <SelectItem value="active">활동중</SelectItem>
                      <SelectItem value="inactive">비활성</SelectItem>
                    </SelectContent>
                  </Select>
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
                  onClick={() => navigate(`/teams/${teamId}`)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '저장 중...' : '변경 저장'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  );
}