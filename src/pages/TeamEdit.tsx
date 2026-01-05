import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, X, ChevronUp, ChevronDown, Loader2, Trash2 } from 'lucide-react';
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
import { ROLES, type UserRole } from '@/lib/constants';

const EMOJIS = ['🚀', '💻', '🎨', '🔒', '⚡', '🌟', '🎯', '💡', '🔥', '🏆', '💪', '🎮'];

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

  const [openSlots, setOpenSlots] = useState<{ id?: string; role: UserRole; minLevel: number; order: number }[]>([]);
  const [deletedSlotIds, setDeletedSlotIds] = useState<string[]>([]);

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
        setOpenSlots(slots.map((slot, index) => ({
          id: slot.id,
          role: slot.role as UserRole,
          minLevel: slot.min_level || 1,
          order: index,
        })));
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

  const addSlot = () => {
    const newOrder = openSlots.length > 0 ? Math.max(...openSlots.map(s => s.order)) + 1 : 0;
    setOpenSlots(prev => [...prev, { role: 'horse', minLevel: 1, order: newOrder }]);
  };

  const removeSlot = (index: number) => {
    const slot = openSlots[index];
    if (slot.id) {
      setDeletedSlotIds(prev => [...prev, slot.id!]);
    }
    setOpenSlots(prev => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'role' | 'minLevel', value: string | number) => {
    setOpenSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ));
  };

  const moveSlot = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === openSlots.length - 1) return;
    
    const newSlots = [...openSlots];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSlots[index], newSlots[targetIndex]] = [newSlots[targetIndex], newSlots[index]];
    newSlots.forEach((slot, i) => slot.order = i);
    setOpenSlots(newSlots);
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

      // Delete removed slots
      if (deletedSlotIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('team_role_slots')
          .delete()
          .in('id', deletedSlotIds);

        if (deleteError) throw deleteError;
      }

      // Update/Insert slots
      for (const slot of openSlots) {
        if (slot.id) {
          // Update existing slot
          const { error } = await supabase
            .from('team_role_slots')
            .update({
              role: slot.role,
              min_level: slot.minLevel,
            })
            .eq('id', slot.id);

          if (error) throw error;
        } else {
          // Insert new slot
          const { error } = await supabase
            .from('team_role_slots')
            .insert({
              team_id: teamId,
              role: slot.role,
              min_level: slot.minLevel,
              is_open: true,
            });

          if (error) throw error;
        }
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>모집 포지션</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSlot}>
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </div>

                {openSlots.map((slot, index) => (
                  <div key={slot.id || `new-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex flex-col gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => moveSlot(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => moveSlot(index, 'down')}
                        disabled={index === openSlots.length - 1}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <span className="text-sm text-muted-foreground font-medium w-6">
                      {index + 1}
                    </span>

                    <Select
                      value={slot.role}
                      onValueChange={(value) => updateSlot(index, 'role', value as UserRole)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLES).map(([key, role]) => (
                          <SelectItem key={key} value={key}>
                            {role.icon} {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">최소 레벨:</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={slot.minLevel}
                        onChange={(e) => updateSlot(index, 'minLevel', parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlot(index)}
                      className="ml-auto text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {openSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    모집할 포지션을 추가해주세요
                  </p>
                )}
              </div>

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
