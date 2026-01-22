import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ArrowLeft, Route, X, Loader2 } from 'lucide-react';
import { ROLE_TYPES } from '@/lib/constants';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type RoleType = Database['public']['Enums']['role_type'];

export default function TrackCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetRoleType, setTargetRoleType] = useState<RoleType | ''>('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다');
      
      const { data, error } = await supabase
        .from('tracks')
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          target_role_type: targetRoleType || null,
          target_skills: selectedSkills.length > 0 ? selectedSkills : null,
          status: 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast.success('Track이 생성되었습니다');
      navigate(`/tracks/${data.id}`);
    },
    onError: (error) => {
      toast.error('Track 생성에 실패했습니다');
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    createMutation.mutate();
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-up">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">새 Track 만들기</h1>
            <p className="text-muted-foreground">성장 경로를 정의하세요</p>
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

              <div className="space-y-2">
                <Label htmlFor="roleType">목표 역할 타입</Label>
                <Select
                  value={targetRoleType}
                  onValueChange={(value) => setTargetRoleType(value as RoleType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="역할 타입 선택 (선택사항)" />
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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                'Track 생성'
              )}
            </Button>
          </div>
        </ScrollReveal>
      </form>
    </div>
  );
}
