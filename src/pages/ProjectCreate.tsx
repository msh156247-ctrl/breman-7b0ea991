import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
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
import { ROLES, ANIMAL_SKINS, type UserRole, type AnimalSkin } from '@/lib/constants';

export default function ProjectCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    timeline_weeks: '',
    visibility: 'public',
  });

  const [requiredRoles, setRequiredRoles] = useState<UserRole[]>([]);
  const [preferredAnimalSkins, setPreferredAnimalSkins] = useState<AnimalSkin[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRole = (role: UserRole) => {
    if (!requiredRoles.includes(role)) {
      setRequiredRoles(prev => [...prev, role]);
    }
  };

  const removeRole = (role: UserRole) => {
    setRequiredRoles(prev => prev.filter(r => r !== role));
  };

  const toggleAnimalSkin = (skin: AnimalSkin) => {
    if (preferredAnimalSkins.includes(skin)) {
      setPreferredAnimalSkins(prev => prev.filter(s => s !== skin));
    } else {
      setPreferredAnimalSkins(prev => [...prev, skin]);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !requiredSkills.includes(newSkill.trim())) {
      setRequiredSkills(prev => [...prev, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setRequiredSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: '프로젝트 제목 필요',
        description: '프로젝트 제목을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: '로그인 필요',
        description: '프로젝트를 등록하려면 로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          title: formData.title,
          description: formData.description,
          budget_min: formData.budget_min ? parseInt(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseInt(formData.budget_max) : null,
          timeline_weeks: formData.timeline_weeks ? parseInt(formData.timeline_weeks) : null,
          visibility: formData.visibility,
          required_roles: requiredRoles.length > 0 ? requiredRoles : null,
          preferred_animal_skins: preferredAnimalSkins.length > 0 ? preferredAnimalSkins : [],
          required_skills: requiredSkills.length > 0 ? requiredSkills : null,
          client_id: user.id,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '프로젝트 등록 완료!',
        description: `${formData.title} 프로젝트가 성공적으로 등록되었습니다.`,
      });

      navigate(`/projects/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: '등록 실패',
        description: '프로젝트를 등록할 수 없습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ScrollReveal animation="fade-up">
        <Link to="/projects" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>프로젝트 목록</span>
        </Link>
      </ScrollReveal>

      <ScrollReveal animation="fade-up" delay={100}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">새 프로젝트 의뢰하기</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">프로젝트 제목 *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="예: AI 기반 고객 서비스 챗봇 개발"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">프로젝트 설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="프로젝트에 대한 상세 설명을 작성해주세요..."
                    rows={6}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget_min">최소 예산 (원)</Label>
                    <Input
                      id="budget_min"
                      type="number"
                      value={formData.budget_min}
                      onChange={(e) => handleChange('budget_min', e.target.value)}
                      placeholder="5000000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget_max">최대 예산 (원)</Label>
                    <Input
                      id="budget_max"
                      type="number"
                      value={formData.budget_max}
                      onChange={(e) => handleChange('budget_max', e.target.value)}
                      placeholder="10000000"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="timeline">예상 기간 (주)</Label>
                  <Input
                    id="timeline"
                    type="number"
                    value={formData.timeline_weeks}
                    onChange={(e) => handleChange('timeline_weeks', e.target.value)}
                    placeholder="8"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="visibility">공개 범위</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) => handleChange('visibility', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">공개 (모든 팀이 지원 가능)</SelectItem>
                      <SelectItem value="private">비공개 (초대된 팀만)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preferred Animal Skins */}
              <div className="space-y-4">
                <Label>선호 성향 (선택사항)</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ANIMAL_SKINS).map(([key, skin]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleAnimalSkin(key as AnimalSkin)}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all ${
                        preferredAnimalSkins.includes(key as AnimalSkin)
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <span>{skin.icon}</span>
                      <span>{skin.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Roles */}
              <div className="space-y-4">
                <Label>필요 역할</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROLES).map(([key, role]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => requiredRoles.includes(key as UserRole) 
                        ? removeRole(key as UserRole) 
                        : addRole(key as UserRole)
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all ${
                        requiredRoles.includes(key as UserRole)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <span>{role.icon}</span>
                      <span>{role.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Skills */}
              <div className="space-y-4">
                <Label>필요 기술 스택</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="예: React, Python, AWS..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addSkill}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {requiredSkills.map((skill) => (
                      <span 
                        key={skill}
                        className="px-3 py-1 rounded-md bg-muted text-sm flex items-center gap-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/projects')}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '등록 중...' : '프로젝트 등록'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  );
}
