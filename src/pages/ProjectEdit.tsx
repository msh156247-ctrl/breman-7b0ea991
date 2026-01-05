import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, X, Loader2, Trash2 } from 'lucide-react';
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
import { ROLES, PROJECT_STATUS, type UserRole } from '@/lib/constants';

export default function ProjectEdit() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    timeline_weeks: '',
    visibility: 'public',
    status: 'open' as keyof typeof PROJECT_STATUS,
  });

  const [requiredRoles, setRequiredRoles] = useState<UserRole[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      if (project.client_id !== user?.id) {
        toast({
          title: '권한 없음',
          description: '프로젝트 의뢰자만 수정할 수 있습니다.',
          variant: 'destructive',
        });
        navigate(`/projects/${projectId}`);
        return;
      }

      setFormData({
        title: project.title || '',
        description: project.description || '',
        budget_min: project.budget_min?.toString() || '',
        budget_max: project.budget_max?.toString() || '',
        timeline_weeks: project.timeline_weeks?.toString() || '',
        visibility: project.visibility || 'public',
        status: (project.status as keyof typeof PROJECT_STATUS) || 'open',
      });

      setRequiredRoles((project.required_roles as UserRole[]) || []);
      setRequiredSkills((project.required_skills as string[]) || []);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: '오류',
        description: '프로젝트 정보를 불러올 수 없습니다.',
        variant: 'destructive',
      });
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

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

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: formData.title,
          description: formData.description,
          budget_min: formData.budget_min ? parseInt(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseInt(formData.budget_max) : null,
          timeline_weeks: formData.timeline_weeks ? parseInt(formData.timeline_weeks) : null,
          visibility: formData.visibility,
          status: formData.status,
          required_roles: requiredRoles.length > 0 ? requiredRoles : null,
          required_skills: requiredSkills.length > 0 ? requiredSkills : null,
        })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: '프로젝트 수정 완료!',
        description: '프로젝트 정보가 업데이트되었습니다.',
      });

      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: '수정 실패',
        description: '프로젝트를 수정할 수 없습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Delete proposals first
      await supabase
        .from('project_proposals')
        .delete()
        .eq('project_id', projectId);

      // Delete project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: '프로젝트 삭제 완료',
        description: '프로젝트가 삭제되었습니다.',
      });

      navigate('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: '삭제 실패',
        description: '프로젝트를 삭제할 수 없습니다.',
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
        <Link to={`/projects/${projectId}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>프로젝트 상세로 돌아가기</span>
        </Link>
      </ScrollReveal>

      <ScrollReveal animation="fade-up" delay={100}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">프로젝트 수정</CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  프로젝트 삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>정말 프로젝트를 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 작업은 되돌릴 수 없습니다. 모든 프로젝트 데이터와 제안서가 영구적으로 삭제됩니다.
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
                  <Label htmlFor="status">프로젝트 상태</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROJECT_STATUS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  onClick={() => navigate(`/projects/${projectId}`)}
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
