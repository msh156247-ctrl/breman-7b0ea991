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
import { ROLE_TYPES, ANIMAL_SKINS, type RoleType, type AnimalSkin } from '@/lib/constants';

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

  const [requiredRoles, setRequiredRoles] = useState<RoleType[]>([]);
  const [preferredSkins, setPreferredSkins] = useState<AnimalSkin[]>([]);
  
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRole = (role: RoleType) => {
    if (!requiredRoles.includes(role)) {
      setRequiredRoles(prev => [...prev, role]);
    }
  };

  const removeRole = (role: RoleType) => {
    setRequiredRoles(prev => prev.filter(r => r !== role));
  };

  const togglePreferredSkin = (skin: AnimalSkin) => {
    if (preferredSkins.includes(skin)) {
      setPreferredSkins(prev => prev.filter(s => s !== skin));
    } else {
      setPreferredSkins(prev => [...prev, skin]);
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
      // Note: required_roles in DB expects user_role enum (animal types), not role_types
      // For now, we store the role requirements in required_skills as text
      const roleNames = requiredRoles.map(r => ROLE_TYPES[r].name);
      const allRequirements = [...roleNames, ...requiredSkills];
      
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          title: formData.title,
          description: formData.description,
          budget_min: formData.budget_min ? parseInt(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseInt(formData.budget_max) : null,
          timeline_weeks: formData.timeline_weeks ? parseInt(formData.timeline_weeks) : null,
          visibility: formData.visibility,
          required_roles: null,
          preferred_animal_skins: preferredSkins.length > 0 ? preferredSkins : [],
          required_skills: allRequirements.length > 0 ? allRequirements : null,
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
            <CardTitle className="text-2xl">프로젝트 의뢰하기</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              완벽하지 않아도 괜찮아요. 팀과 함께 구체화해 나갈 수 있습니다 ✨
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: 무엇 - What do you need? */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
                  <span>어떤 것을 만들고 싶으세요?</span>
                </div>
                <div>
                  <Label htmlFor="title">프로젝트 제목 *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="예: 우리 가게 예약 앱, 팀 협업 도구..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">어떤 프로젝트인지 간단히 알려주세요</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="대략적인 아이디어만 적어도 됩니다. 자세한 내용은 팀과 함께 정리할 수 있어요."
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    💬 구체적인 기능이나 요구사항은 팀과 대화하면서 정리해도 됩니다.
                  </p>
                </div>
              </div>

              {/* Step 2: 누구 - Who do you need? (Roles + Skills combined) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
                  <span>어떤 도움이 필요하세요?</span>
                </div>
                
                <div>
                  <Label className="mb-2 block">필요한 분야를 선택해주세요</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ROLE_TYPES).map(([key, role]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => requiredRoles.includes(key as RoleType) 
                          ? removeRole(key as RoleType) 
                          : addRole(key as RoleType)
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all ${
                          requiredRoles.includes(key as RoleType)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <span>{role.icon}</span>
                        <span>{role.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    💡 잘 모르겠다면 비워두셔도 됩니다. 팀이 함께 판단해줄 거예요.
                  </p>
                </div>

                <div>
                  <Label className="mb-2 block">특별히 필요한 기술이 있나요? (선택)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="예: React, Python, 결제 연동..."
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
                    <div className="flex flex-wrap gap-2 mt-2">
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
              </div>

              {/* Preferred Personality (Animal Skins) - 선호 성향 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium">+</span>
                  <span>선호하는 협업 성향이 있나요? (선택)</span>
                </div>
                
                <div>
                  <Label className="mb-2 block">원하는 성향을 선택해주세요</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.entries(ANIMAL_SKINS) as [AnimalSkin, typeof ANIMAL_SKINS[AnimalSkin]][]).map(([key, skin]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePreferredSkin(key)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          preferredSkins.includes(key)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{skin.icon}</span>
                          <div>
                            <span className="font-medium">{skin.name}</span>
                            <span className="text-xs text-muted-foreground ml-1">({skin.title})</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {skin.keywords.slice(0, 2).map((keyword) => (
                            <span 
                              key={keyword}
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                preferredSkins.includes(key)
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    🎭 성향은 팀원의 협업 스타일을 나타냅니다. 비워두면 모든 성향을 환영합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
                  <span>대략 언제쯤 완료되면 좋을까요?</span>
                </div>
                <div>
                  <Label htmlFor="timeline">희망 기간 (주)</Label>
                  <Input
                    id="timeline"
                    type="number"
                    value={formData.timeline_weeks}
                    onChange={(e) => handleChange('timeline_weeks', e.target.value)}
                    placeholder="예: 4, 8, 12..."
                    className="mt-1"
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    📌 <strong>참고용</strong>이에요. 정확하지 않아도 괜찮습니다. 팀과 상의 후 조정할 수 있어요.
                  </p>
                </div>
              </div>

              {/* Step 4: 예산 - Budget */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">4</span>
                  <span>예산은 어느 정도 생각하고 계세요?</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget_min">최소 (원)</Label>
                    <Input
                      id="budget_min"
                      type="number"
                      value={formData.budget_min}
                      onChange={(e) => handleChange('budget_min', e.target.value)}
                      placeholder="예: 3000000"
                      className="mt-1"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget_max">최대 (원)</Label>
                    <Input
                      id="budget_max"
                      type="number"
                      value={formData.budget_max}
                      onChange={(e) => handleChange('budget_max', e.target.value)}
                      placeholder="예: 10000000"
                      className="mt-1"
                      min="0"
                    />
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">💰 예산은 참고용입니다</p>
                  <p>정확하지 않아도 됩니다. 실제 금액은 팀과 협의 후 계약 단계에서 확정해요.</p>
                </div>
              </div>

              {/* 공개 범위 */}
              <div className="space-y-4 pt-4 border-t border-border">
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
