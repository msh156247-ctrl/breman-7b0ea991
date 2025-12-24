import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ROLES, SKILL_TIERS, type UserRole } from '@/lib/constants';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles, X, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const POPULAR_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Java', 'Go',
  'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes',
  'Figma', 'UI/UX', 'Tailwind CSS', 'Next.js', 'Vue.js',
  'Jest', 'Cypress', 'Security', 'DevOps', 'CI/CD'
];

type OnboardingStep = 'role' | 'skills' | 'experience' | 'summary';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const steps: OnboardingStep[] = ['role', 'skills', 'experience', 'summary'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 10) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill(skillInput);
    }
  };

  const generateAISummary = async () => {
    setIsGenerating(true);
    // Simulate AI summary generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const roleInfo = selectedRole ? ROLES[selectedRole] : null;
    const summary = `${roleInfo?.icon} ${roleInfo?.name} 역할의 개발자입니다. ${skills.slice(0, 3).join(', ')} 등의 기술을 보유하고 있으며, ${experience ? '다양한 프로젝트 경험을 통해 성장해왔습니다.' : '새로운 도전을 향해 나아가고 있습니다.'} 팀과의 협업을 통해 더 큰 가치를 만들어가고 싶습니다.`;
    
    setGeneratedSummary(summary);
    setBio(summary);
    setIsGenerating(false);
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'role':
        return selectedRole !== null;
      case 'skills':
        return skills.length >= 1;
      case 'experience':
        return true;
      case 'summary':
        return bio.trim().length > 0;
      default:
        return false;
    }
  };

  const handleComplete = async () => {
    if (!user || !selectedRole) return;

    setIsSaving(true);
    try {
      // Update profile with onboarding data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          primary_role: selectedRole,
          bio: bio,
          xp: 100, // Initial XP reward
          level: 1,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Add skills to user_skills (simplified - would need skill IDs in real app)
      // For now, we'll just complete the onboarding

      await refreshProfile();
      toast.success('온보딩 완료! 🎉 초기 100 XP를 획득했습니다.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('온보딩 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>온보딩 진행</span>
            <span>{currentStepIndex + 1} / {steps.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`text-xs ${index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {step === 'role' && '역할 선택'}
                {step === 'skills' && '기술 스택'}
                {step === 'experience' && '경험 입력'}
                {step === 'summary' && 'AI 요약'}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="border-border/50 shadow-elegant">
          {currentStep === 'role' && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">당신의 역할을 선택하세요</CardTitle>
                <CardDescription>
                  브래맨에서의 주요 역할을 선택해주세요. 나중에 변경할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(ROLES) as [UserRole, typeof ROLES[UserRole]][]).map(([key, role]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedRole(key)}
                      className={`p-5 rounded-xl border-2 transition-all text-left ${
                        selectedRole === key
                          ? 'border-primary bg-primary/5 shadow-glow'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center text-2xl flex-shrink-0`}>
                          {role.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg">{role.name}</div>
                          <div className="text-xs text-primary font-medium">{role.title}</div>
                        </div>
                        {selectedRole === key && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-3">{role.description}</p>

                      {/* Responsibilities (first 2) with tooltip */}
                      <div className="mb-3">
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-xs font-medium text-foreground/70">담당 업무</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                                <Info className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-semibold mb-2">{role.name} 전체 담당 업무</p>
                              <ul className="space-y-1">
                                {role.responsibilities.map((resp, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                    {resp}
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <ul className="space-y-1">
                          {role.responsibilities.slice(0, 2).map((resp, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                              {resp}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Keywords */}
                      <div className="flex flex-wrap gap-1.5">
                        {role.keywords.map((keyword) => (
                          <span 
                            key={keyword}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              selectedRole === key 
                                ? `bg-gradient-to-r ${role.gradient} text-primary-foreground`
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
              </CardContent>
            </>
          )}

          {currentStep === 'skills' && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">기술 스택을 입력하세요</CardTitle>
                <CardDescription>
                  보유하고 있는 기술을 선택하거나 직접 입력해주세요. (최대 10개)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected Skills */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">선택된 기술 ({skills.length}/10)</Label>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-muted/30 rounded-lg border border-border/50">
                    {skills.length === 0 ? (
                      <span className="text-muted-foreground text-sm">기술을 선택해주세요</span>
                    ) : (
                      skills.map(skill => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Custom Input */}
                <div>
                  <Label htmlFor="skill-input">직접 입력</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="skill-input"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="기술명 입력 후 Enter"
                      disabled={skills.length >= 10}
                    />
                    <Button
                      onClick={() => handleAddSkill(skillInput)}
                      disabled={!skillInput.trim() || skills.length >= 10}
                      variant="outline"
                    >
                      추가
                    </Button>
                  </div>
                </div>

                {/* Popular Skills */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">인기 기술</Label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SKILLS.map(skill => (
                      <button
                        key={skill}
                        onClick={() => handleAddSkill(skill)}
                        disabled={skills.includes(skill) || skills.length >= 10}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                          skills.includes(skill)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        } disabled:opacity-50`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 'experience' && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">경험을 공유해주세요</CardTitle>
                <CardDescription>
                  프로젝트 경험, 업무 경력 등을 자유롭게 작성해주세요. (선택사항)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="예: 3년차 프론트엔드 개발자로, 스타트업에서 React 기반 SaaS 제품을 개발했습니다. 팀 리더로서 5명의 팀원과 협업하며 프로젝트를 성공적으로 런칭한 경험이 있습니다."
                  className="min-h-[200px] resize-none"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  이 정보는 AI 요약 생성과 프로필 작성에 활용됩니다.
                </p>
              </CardContent>
            </>
          )}

          {currentStep === 'summary' && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">AI 프로필 요약</CardTitle>
                <CardDescription>
                  입력한 정보를 바탕으로 AI가 프로필 요약을 생성합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preview Info */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">선택한 역할:</span>
                    {selectedRole && <RoleBadge role={selectedRole} level={1} />}
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">선택한 기술:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skills.map(skill => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                {!generatedSummary && (
                  <Button
                    onClick={generateAISummary}
                    disabled={isGenerating}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI 요약 생성 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        AI 요약 생성하기
                      </>
                    )}
                  </Button>
                )}

                {/* Generated Summary */}
                {generatedSummary && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Sparkles className="h-4 w-4" />
                      AI가 생성한 요약
                    </div>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="min-h-[120px] resize-none"
                      placeholder="프로필 요약을 입력하세요"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={generateAISummary}
                        variant="outline"
                        size="sm"
                        disabled={isGenerating}
                      >
                        다시 생성
                      </Button>
                    </div>
                  </div>
                )}

                {/* Rewards Preview */}
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 border border-primary/20">
                  <h4 className="font-semibold mb-2">🎉 온보딩 완료 보상</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 초기 XP 100점 지급</li>
                    <li>• "브래맨 입문자" 배지 획득</li>
                    <li>• 레벨 1 시작</li>
                  </ul>
                </div>
              </CardContent>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between p-6 pt-0">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            
            {currentStep === 'summary' ? (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || isSaving}
                className="gap-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    완료하기
                    <Check className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-1"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Skip Option */}
        <div className="text-center mt-4">
          <Button
            variant="link"
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground"
          >
            나중에 설정하기
          </Button>
        </div>
      </div>
    </div>
  );
}
