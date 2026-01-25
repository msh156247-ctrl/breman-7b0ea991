import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Briefcase, Save } from 'lucide-react';
import { ROLE_TYPES, type RoleType } from '@/lib/constants';
import { toast } from 'sonner';

const SERVICE_CATEGORIES = {
  development: { name: '개발', icon: '💻' },
  design: { name: '디자인', icon: '🎨' },
  marketing: { name: '마케팅', icon: '📢' },
  content: { name: '콘텐츠', icon: '✍️' },
  consulting: { name: '컨설팅', icon: '💡' },
  general: { name: '기타', icon: '📦' },
};

interface Team {
  id: string;
  name: string;
}

export default function ServiceOfferCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState({
    team_id: '',
    title: '',
    description: '',
    service_category: 'general',
    budget_min: '',
    budget_max: '',
    timeline_weeks: '',
    offered_roles: [] as RoleType[],
    offered_skills: '',
  });

  useEffect(() => {
    if (user?.id) {
      fetchMyTeams();
    }
  }, [user?.id]);

  const fetchMyTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('leader_id', user?.id);

      if (error) throw error;
      setMyTeams(data || []);
      if (data && data.length === 1) {
        setFormData(prev => ({ ...prev, team_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleRoleToggle = (role: RoleType) => {
    setFormData(prev => ({
      ...prev,
      offered_roles: prev.offered_roles.includes(role)
        ? prev.offered_roles.filter(r => r !== role)
        : [...prev.offered_roles, role]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.team_id) {
      toast.error('팀을 선택해주세요');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('서비스 제목을 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const skillsArray = formData.offered_skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const { data, error } = await supabase
        .from('team_service_offers')
        .insert({
          team_id: formData.team_id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          service_category: formData.service_category,
          budget_min: formData.budget_min ? parseInt(formData.budget_min) * 10000 : null,
          budget_max: formData.budget_max ? parseInt(formData.budget_max) * 10000 : null,
          timeline_weeks: formData.timeline_weeks ? parseInt(formData.timeline_weeks) : null,
          offered_roles: formData.offered_roles,
          offered_skills: skillsArray,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('서비스 오퍼가 등록되었습니다');
      navigate(`/service-offers/${data.id}`);
    } catch (error: any) {
      console.error('Error creating offer:', error);
      toast.error('서비스 등록에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (myTeams.length === 0) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-2">팀이 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              서비스를 등록하려면 먼저 팀을 만들어야 합니다.
            </p>
            <Button onClick={() => navigate('/teams/create')}>
              팀 만들기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">서비스 등록</h1>
          <p className="text-muted-foreground">팀이 제공할 수 있는 서비스를 등록하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>서비스의 기본 정보를 입력해주세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Team selection */}
            {myTeams.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="team">팀 선택 *</Label>
                <Select
                  value={formData.team_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="팀을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {myTeams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">서비스 제목 *</Label>
              <Input
                id="title"
                placeholder="예: 웹 애플리케이션 개발, 브랜드 디자인 패키지"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                maxLength={100}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select
                value={formData.service_category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, service_category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_CATEGORIES).map(([key, { name, icon }]) => (
                    <SelectItem key={key} value={key}>
                      {icon} {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">서비스 설명</Label>
              <Textarea
                id="description"
                placeholder="서비스에 대한 자세한 설명을 작성해주세요..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
              />
            </div>

            {/* Budget range */}
            <div className="space-y-2">
              <Label>예상 비용 범위 (만원)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="최소"
                  value={formData.budget_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="number"
                  placeholder="최대"
                  value={formData.budget_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <Label htmlFor="timeline">예상 소요 기간 (주)</Label>
              <Input
                id="timeline"
                type="number"
                placeholder="예: 4"
                value={formData.timeline_weeks}
                onChange={(e) => setFormData(prev => ({ ...prev, timeline_weeks: e.target.value }))}
              />
            </div>

            {/* Offered roles */}
            <div className="space-y-3">
              <Label>제공 가능한 역할</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(ROLE_TYPES).map(([key, { name, icon }]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={formData.offered_roles.includes(key as RoleType)}
                      onCheckedChange={() => handleRoleToggle(key as RoleType)}
                    />
                    <span className="text-sm">
                      {icon} {name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label htmlFor="skills">보유 기술 (콤마로 구분)</Label>
              <Input
                id="skills"
                placeholder="예: React, TypeScript, Node.js, Figma"
                value={formData.offered_skills}
                onChange={(e) => setFormData(prev => ({ ...prev, offered_skills: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? '등록 중...' : '서비스 등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}
