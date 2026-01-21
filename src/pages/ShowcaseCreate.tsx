import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  Sparkles, 
  Users, 
  User, 
  Plus,
  X,
  Target,
  Cog,
  CheckCircle2,
  Lightbulb,
  Image,
  Link2,
  Save,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BackToTop } from '@/components/ui/BackToTop';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_TYPES, SHOWCASE_VISIBILITY, type RoleType } from '@/lib/constants';
import { toast } from 'sonner';

const showcaseSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100),
  description: z.string().max(500).optional(),
  ownerType: z.enum(['personal', 'team']),
  ownerTeamId: z.string().optional(),
  goal: z.string().max(2000).optional(),
  process: z.string().max(5000).optional(),
  result: z.string().max(2000).optional(),
  retrospective: z.string().max(2000).optional(),
  visibility: z.enum(['public', 'team_only', 'private']),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
});

type ShowcaseFormData = z.infer<typeof showcaseSchema>;

export default function ShowcaseCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSkills, setSelectedSkills] = useState<{ skillId: string; level: number }[]>([]);
  const [contributors, setContributors] = useState<{ 
    userId: string; 
    roleType: RoleType; 
    description: string;
  }[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachment, setNewAttachment] = useState('');

  const form = useForm<ShowcaseFormData>({
    resolver: zodResolver(showcaseSchema),
    defaultValues: {
      ownerType: 'personal',
      visibility: 'public',
    },
  });

  const ownerType = form.watch('ownerType');

  // Fetch user's teams
  const { data: myTeams } = useQuery({
    queryKey: ['my-teams', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, emblem_url')
        .eq('leader_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch available skills
  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('category')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ShowcaseFormData) => {
      if (!user) throw new Error('로그인이 필요합니다');

      // Create showcase
      const { data: showcase, error: showcaseError } = await supabase
        .from('showcases')
        .insert({
          title: data.title,
          description: data.description || null,
          owner_user_id: data.ownerType === 'personal' ? user.id : null,
          owner_team_id: data.ownerType === 'team' ? data.ownerTeamId : null,
          goal: data.goal || null,
          process: data.process || null,
          result: data.result || null,
          retrospective: data.retrospective || null,
          visibility: data.visibility,
          started_at: data.startedAt || null,
          ended_at: data.endedAt || null,
          attachments: attachments,
          status: 'published',
        })
        .select()
        .single();

      if (showcaseError) throw showcaseError;

      // Add skills
      if (selectedSkills.length > 0) {
        const { error: skillsError } = await supabase
          .from('showcase_skills')
          .insert(
            selectedSkills.map(s => ({
              showcase_id: showcase.id,
              skill_id: s.skillId,
              proficiency_level: s.level,
            }))
          );
        if (skillsError) throw skillsError;
      }

      // Add contributors
      if (contributors.length > 0) {
        const { error: contribError } = await supabase
          .from('showcase_contributors')
          .insert(
            contributors.map(c => ({
              showcase_id: showcase.id,
              user_id: c.userId,
              role_type: c.roleType,
              role_description: c.description,
            }))
          );
        if (contribError) throw contribError;
      }

      // Add self as contributor if personal
      if (data.ownerType === 'personal') {
        await supabase
          .from('showcase_contributors')
          .insert({
            showcase_id: showcase.id,
            user_id: user.id,
            role_type: 'backend', // TODO: Use user's main role type
            is_verified: true,
          });
      }

      return showcase;
    },
    onSuccess: (showcase) => {
      toast.success('Showcase가 등록되었습니다!');
      queryClient.invalidateQueries({ queryKey: ['showcases'] });
      navigate(`/showcase/${showcase.id}`);
    },
    onError: (error) => {
      console.error('Error creating showcase:', error);
      toast.error('Showcase 등록에 실패했습니다');
    },
  });

  const handleAddAttachment = () => {
    if (newAttachment && newAttachment.startsWith('http')) {
      setAttachments([...attachments, newAttachment]);
      setNewAttachment('');
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleToggleSkill = (skillId: string) => {
    const existing = selectedSkills.find(s => s.skillId === skillId);
    if (existing) {
      setSelectedSkills(selectedSkills.filter(s => s.skillId !== skillId));
    } else {
      setSelectedSkills([...selectedSkills, { skillId, level: 3 }]);
    }
  };

  const handleSkillLevelChange = (skillId: string, level: number) => {
    setSelectedSkills(selectedSkills.map(s => 
      s.skillId === skillId ? { ...s, level } : s
    ));
  };

  const onSubmit = (data: ShowcaseFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back Button */}
      <ScrollReveal>
        <Button variant="ghost" asChild className="gap-2 -ml-2">
          <Link to="/showcase">
            <ArrowLeft className="w-4 h-4" />
            Showcase 목록
          </Link>
        </Button>
      </ScrollReveal>

      {/* Header */}
      <ScrollReveal delay={0.1}>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            새 Showcase 등록
          </h1>
          <p className="text-muted-foreground mt-1">
            경험을 기록하고 성장을 증명하세요
          </p>
        </div>
      </ScrollReveal>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <ScrollReveal delay={0.15}>
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
                <CardDescription>Showcase의 제목과 설명을 입력하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목 *</FormLabel>
                      <FormControl>
                        <Input placeholder="프로젝트명 또는 경험 제목" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>한줄 설명</FormLabel>
                      <FormControl>
                        <Input placeholder="간단한 설명을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>시작일</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>종료일</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Owner Type */}
          <ScrollReveal delay={0.2}>
            <Card>
              <CardHeader>
                <CardTitle>소유 유형</CardTitle>
                <CardDescription>개인 또는 팀 단위 Showcase인지 선택하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="ownerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="personal" id="personal" />
                            <Label htmlFor="personal" className="flex items-center gap-2 cursor-pointer">
                              <User className="w-4 h-4" />
                              개인
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="team" id="team" />
                            <Label htmlFor="team" className="flex items-center gap-2 cursor-pointer">
                              <Users className="w-4 h-4" />
                              팀
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {ownerType === 'team' && (
                  <FormField
                    control={form.control}
                    name="ownerTeamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>팀 선택 *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="팀을 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {myTeams?.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          리더로 있는 팀만 선택할 수 있습니다
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>공개 범위</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(SHOWCASE_VISIBILITY).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Content Sections */}
          <ScrollReveal delay={0.25}>
            <Card>
              <CardHeader>
                <CardTitle>상세 내용</CardTitle>
                <CardDescription>목표, 과정, 결과, 회고를 구조화하여 작성하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        목표
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="이 프로젝트/경험의 목표는 무엇이었나요?" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="process"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Cog className="w-4 h-4 text-secondary" />
                        과정
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="어떤 과정을 거쳤나요? 어떤 기술과 방법을 사용했나요?" 
                          className="min-h-[150px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="result"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        결과
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="어떤 결과를 얻었나요? 성과와 산출물을 설명해주세요" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retrospective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-warning" />
                        회고
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="무엇을 배웠나요? 아쉬웠던 점이나 다음에 더 잘할 수 있는 부분은?" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Skills */}
          <ScrollReveal delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle>사용 기술</CardTitle>
                <CardDescription>이 Showcase에서 사용/학습한 기술을 선택하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills?.map((skill) => {
                    const isSelected = selectedSkills.some(s => s.skillId === skill.id);
                    const selectedSkill = selectedSkills.find(s => s.skillId === skill.id);
                    return (
                      <div key={skill.id} className="flex items-center gap-1">
                        <Badge
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer transition-all"
                          onClick={() => handleToggleSkill(skill.id)}
                        >
                          {skill.name}
                        </Badge>
                        {isSelected && (
                          <Select
                            value={String(selectedSkill?.level || 3)}
                            onValueChange={(v) => handleSkillLevelChange(skill.id, parseInt(v))}
                          >
                            <SelectTrigger className="w-16 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map((level) => (
                                <SelectItem key={level} value={String(level)}>
                                  Lv.{level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Attachments */}
          <ScrollReveal delay={0.35}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  첨부 링크
                </CardTitle>
                <CardDescription>관련 링크를 추가하세요 (GitHub, 블로그, 데모 등)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://..."
                    value={newAttachment}
                    onChange={(e) => setNewAttachment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttachment())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddAttachment}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <span className="flex-1 text-sm truncate">{url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Submit */}
          <ScrollReveal delay={0.4}>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link to="/showcase">취소</Link>
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                {createMutation.isPending ? (
                  <>저장 중...</>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    등록하기
                  </>
                )}
              </Button>
            </div>
          </ScrollReveal>
        </form>
      </Form>

      <BackToTop />
    </div>
  );
}
