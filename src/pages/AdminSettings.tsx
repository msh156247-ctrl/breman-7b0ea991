import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailBrandingSettings } from '@/components/admin/EmailBrandingSettings';
import { UserManagement } from '@/components/admin/UserManagement';
import { AnnouncementsManagement } from '@/components/admin/AnnouncementsManagement';
import { ActivityLogsManagement } from '@/components/admin/ActivityLogsManagement';
import { Shield, Palette, Users, Megaphone, Settings, Activity } from 'lucide-react';

export default function AdminSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has admin role using the is_admin function
        const { data, error } = await supabase
          .rpc('is_admin', { _user_id: user.id });

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!loading && !authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, loading, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <p className="text-muted-foreground">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
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
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            사용자 관리
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="w-4 h-4" />
            공지사항
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="w-4 h-4" />
            이메일 브랜딩
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="w-4 h-4" />
            활동 로그
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsManagement />
        </TabsContent>

        <TabsContent value="branding">
          <EmailBrandingSettings />
        </TabsContent>

        <TabsContent value="logs">
          <ActivityLogsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
