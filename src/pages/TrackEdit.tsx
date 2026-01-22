import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ArrowLeft, Route, X, Loader2 } from 'lucide-react';
import { ROLE_TYPES, TRACK_STATUS } from '@/lib/constants';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type RoleType = Database['public']['Enums']['role_type'];

export default function TrackEdit() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetRoleType, setTargetRoleType] = useState<RoleType | ''>('');
  const [status, setStatus] = useState<string>('active');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Fetch track
  const { data: track, isLoading: trackLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!trackId,
  });

  // Fetch available skills
  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Populate form when track is loaded
  useEffect(() => {
    if (track) {
      setTitle(track.title);
      setDescription(track.description || '');
      setTargetRoleType(track.target_role_type || '');
      setStatus(track.status);
      setSelectedSkills(track.target_skills || []);
    }
  }, [track]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tracks')
        .update({
          title,
          description: description || null,
          target_role_type: targetRoleType || null,
          target_skills: selectedSkills.length > 0 ? selectedSkills : null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trackId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      toast.success('Track이 수정되었습니다');
      navigate(`/tracks/${trackId}`);
    },
    onError: (error) => {
      toast.error('Track 수정에 실패했습니다');
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    updateMutation.mutate();
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  // Check ownership
  if (track && track.user_id !== user?.id) {
    return (
      <div className="text-center py-12">
        <Route className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">권한이 없습니다</h2>
        <Button variant="outline" onClick={() => navigate(-1)}>
          돌아가기
        </Button>
      </div>
    );
  }

  if (trackLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Track 수정</h1>
            <p className="text-muted-foreground">성장 경로를 수정하세요</p>
          </div>
        </div>
      </ScrollReveal>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <ScrollReveal animation="fade-up" delay={100}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 백엔드 개발자로 성장하기"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="이 Track의 목표와 방향을 설명해주세요"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roleType">목표 역할 타입</Label>
                  <Select
                    value={targetRoleType}
                    onValueChange={(value) => setTargetRoleType(value as RoleType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="역할 타입 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_TYPES).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {info.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">상태</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRACK_STATUS).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {info.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Target Skills */}
        <ScrollReveal animation="fade-up" delay={200}>
          <Card>
            <CardHeader>
              <CardTitle>목표 스킬</CardTitle>
              <p className="text-sm text-muted-foreground">
                이 Track에서 성장하고 싶은 스킬을 선택하세요
              </p>
            </CardHeader>
            <CardContent>
              {skills && skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant={selectedSkills.includes(skill.id) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleSkill(skill.id)}
                    >
                      {skill.name}
                      {selectedSkills.includes(skill.id) && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  등록된 스킬이 없습니다
                </p>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Actions */}
        <ScrollReveal animation="fade-up" delay={300}>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장하기'
              )}
            </Button>
          </div>
        </ScrollReveal>
      </form>
    </div>
  );
}
