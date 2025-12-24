import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailBrandingSettings } from '@/components/admin/EmailBrandingSettings';
import { Shield, Palette, Bell, Settings } from 'lucide-react';

export default function AdminSettings() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile?.user_type !== 'admin') {
      navigate('/dashboard');
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <p className="text-muted-foreground">로딩중...</p>
        </div>
      </div>
    );
  }

  if (profile?.user_type !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-secondary">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">관리자 설정</h1>
          <p className="text-muted-foreground">시스템 전반의 설정을 관리합니다</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="w-4 h-4" />
            이메일 브랜딩
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            알림 설정
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <EmailBrandingSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">알림 설정</h3>
            <p className="text-muted-foreground">
              추후 업데이트 예정입니다
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
