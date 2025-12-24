import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Palette, Save, Loader2, Eye, Mail, Image } from 'lucide-react';

interface EmailBranding {
  id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  footer_text: string | null;
  support_email: string | null;
  website_url: string | null;
}

export function EmailBrandingSettings() {
  const { user } = useAuth();
  const [branding, setBranding] = useState<EmailBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('email_branding')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBranding(data);
    } catch (error) {
      console.error('Error fetching branding:', error);
      toast.error('브랜딩 설정을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!branding) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_branding')
        .update({
          brand_name: branding.brand_name,
          logo_url: branding.logo_url,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color,
          text_color: branding.text_color,
          background_color: branding.background_color,
          footer_text: branding.footer_text,
          support_email: branding.support_email,
          website_url: branding.website_url,
        })
        .eq('id', branding.id);

      if (error) throw error;
      toast.success('브랜딩 설정이 저장되었습니다');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('브랜딩 설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof EmailBranding, value: string) => {
    if (!branding) return;
    setBranding({ ...branding, [field]: value || null });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            이메일 브랜딩 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!branding) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          브랜딩 설정을 불러올 수 없습니다
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            브랜드 정보
          </CardTitle>
          <CardDescription>
            이메일에 표시될 브랜드 정보를 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand_name">브랜드 이름</Label>
              <Input
                id="brand_name"
                value={branding.brand_name}
                onChange={(e) => handleChange('brand_name', e.target.value)}
                placeholder="My App"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">로고 URL</Label>
              <Input
                id="logo_url"
                value={branding.logo_url || ''}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website_url">웹사이트 URL</Label>
              <Input
                id="website_url"
                value={branding.website_url || ''}
                onChange={(e) => handleChange('website_url', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support_email">지원 이메일</Label>
              <Input
                id="support_email"
                type="email"
                value={branding.support_email || ''}
                onChange={(e) => handleChange('support_email', e.target.value)}
                placeholder="support@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            색상 테마
          </CardTitle>
          <CardDescription>
            이메일의 색상 테마를 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primary_color">주 색상</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="primary_color"
                  value={branding.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_color">보조 색상</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="secondary_color"
                  value={branding.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent_color">강조 색상</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="accent_color"
                  value={branding.accent_color}
                  onChange={(e) => handleChange('accent_color', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.accent_color}
                  onChange={(e) => handleChange('accent_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="text_color">텍스트 색상</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="text_color"
                  value={branding.text_color}
                  onChange={(e) => handleChange('text_color', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.text_color}
                  onChange={(e) => handleChange('text_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="background_color">배경 색상</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="background_color"
                  value={branding.background_color}
                  onChange={(e) => handleChange('background_color', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.background_color}
                  onChange={(e) => handleChange('background_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-6 p-4 rounded-lg border" style={{ backgroundColor: branding.background_color }}>
            <div className="rounded-lg overflow-hidden shadow-lg" style={{ maxWidth: '400px', margin: '0 auto' }}>
              <div 
                className="p-4 text-center"
                style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }}
              >
                <p className="text-white font-semibold">{branding.brand_name}</p>
                <span 
                  className="inline-block mt-2 px-3 py-1 rounded-full text-xs text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  미리보기
                </span>
              </div>
              <div className="bg-white p-4">
                <p style={{ color: branding.text_color }} className="font-medium">알림 제목</p>
                <p className="text-sm text-gray-500 mt-1">알림 내용이 여기에 표시됩니다.</p>
                <button 
                  className="mt-3 px-4 py-2 rounded text-white text-sm font-medium"
                  style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})` }}
                >
                  버튼 미리보기
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            푸터 설정
          </CardTitle>
          <CardDescription>
            이메일 하단에 표시될 내용을 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="footer_text">푸터 텍스트</Label>
            <Textarea
              id="footer_text"
              value={branding.footer_text || ''}
              onChange={(e) => handleChange('footer_text', e.target.value)}
              placeholder="이 이메일은 알림 설정에 따라 발송되었습니다."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              설정 저장
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
