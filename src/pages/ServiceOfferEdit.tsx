import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
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

export default function ServiceOfferEdit() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    service_category: 'general',
    budget_min: '',
    budget_max: '',
    timeline_weeks: '',
    offered_roles: [] as RoleType[],
    offered_skills: '',
    status: 'active',
  });

  useEffect(() => {
    if (offerId) {
      fetchOffer();
    }
  }, [offerId]);

  const fetchOffer = async () => {
    try {
      // First fetch the offer
      const { data: offerData, error: offerError } = await supabase
        .from('team_service_offers')
        .select('*')
        .eq('id', offerId)
        .single();

      if (offerError) throw offerError;

      // Then fetch the team to check leadership
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('leader_id')
        .eq('id', offerData.team_id)
        .single();

      if (teamError) throw teamError;

      // Check if user is the team leader
      if (teamData?.leader_id !== user?.id) {
        toast.error('수정 권한이 없습니다');
        navigate('/service-offers');
        return;
      }

      setFormData({
        title: offerData.title || '',
        description: offerData.description || '',
        service_category: offerData.service_category || 'general',
        budget_min: offerData.budget_min ? String(offerData.budget_min / 10000) : '',
        budget_max: offerData.budget_max ? String(offerData.budget_max / 10000) : '',
        timeline_weeks: offerData.timeline_weeks ? String(offerData.timeline_weeks) : '',
        offered_roles: (offerData.offered_roles as RoleType[]) || [],
        offered_skills: (offerData.offered_skills || []).join(', '),
        status: offerData.status || 'active',
      });
    } catch (error) {
      console.error('Error fetching offer:', error);
      toast.error('서비스 정보를 불러올 수 없습니다');
      navigate('/service-offers');
    } finally {
      setLoading(false);
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
    
    if (!formData.title.trim()) {
      toast.error('서비스 제목을 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      const skillsArray = formData.offered_skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('team_service_offers')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          service_category: formData.service_category,
          budget_min: formData.budget_min ? parseInt(formData.budget_min) * 10000 : null,
          budget_max: formData.budget_max ? parseInt(formData.budget_max) * 10000 : null,
          timeline_weeks: formData.timeline_weeks ? parseInt(formData.timeline_weeks) : null,
          offered_roles: formData.offered_roles,
          offered_skills: skillsArray,
          status: formData.status,
        })
        .eq('id', offerId);

      if (error) throw error;

      toast.success('서비스 오퍼가 수정되었습니다');
      navigate(`/service-offers/${offerId}`);
    } catch (error: any) {
      console.error('Error updating offer:', error);
      toast.error('서비스 수정에 실패했습니다');
    } finally {
      setSaving(false);
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
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">서비스 수정</h1>
          <p className="text-muted-foreground">서비스 정보를 수정하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>서비스의 기본 정보를 수정해주세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div>
                <Label htmlFor="status" className="text-base font-medium">서비스 활성화</Label>
                <p className="text-sm text-muted-foreground">
                  비활성화하면 서비스 목록에 표시되지 않습니다
                </p>
              </div>
              <Switch
                id="status"
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))
                }
              />
            </div>

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
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '저장 중...' : '변경사항 저장'}
          </Button>
        </div>
      </form>
    </div>
  );
}
