import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail, Bell, Trophy, Users, FileText, CreditCard, AlertTriangle, Star, Settings } from 'lucide-react';

interface NotificationPreference {
  id: string;
  user_id: string;
  email_contract: boolean;
  email_project: boolean;
  email_team: boolean;
  email_payment: boolean;
  email_dispute: boolean;
  email_review: boolean;
  email_siege: boolean;
  email_badge: boolean;
  email_system: boolean;
}

const preferenceConfig = [
  { key: 'email_contract', label: '계약 알림', description: '계약 생성, 상태 변경 시 이메일 수신', icon: FileText },
  { key: 'email_project', label: '프로젝트 알림', description: '프로젝트 업데이트, 제안서 관련 이메일 수신', icon: Settings },
  { key: 'email_team', label: '팀 알림', description: '팀 초대, 지원서 관련 이메일 수신', icon: Users },
  { key: 'email_payment', label: '결제 알림', description: '결제 완료, 에스크로 관련 이메일 수신', icon: CreditCard },
  { key: 'email_dispute', label: '분쟁 알림', description: '분쟁 생성, 해결 시 이메일 수신', icon: AlertTriangle },
  { key: 'email_review', label: '리뷰 알림', description: '새 리뷰 작성 시 이메일 수신', icon: Star },
  { key: 'email_siege', label: '시즈 알림', description: '시즈 대회 관련 이메일 수신', icon: Trophy },
  { key: 'email_badge', label: '뱃지 알림', description: '새 뱃지 획득 시 이메일 수신', icon: Trophy },
  { key: 'email_system', label: '시스템 알림', description: '공지사항, 중요 업데이트 이메일 수신', icon: Bell },
];

export function NotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No preferences exist, create default
        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newData);
      } else if (error) {
        throw error;
      } else {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('설정을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: string, value: boolean) => {
    if (!preferences || !user) return;

    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('설정이 저장되었습니다');
    } catch (error) {
      console.error('Error saving preference:', error);
      toast.error('설정 저장에 실패했습니다');
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableAll = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const updates = preferenceConfig.reduce((acc, config) => {
        acc[config.key] = true;
        return acc;
      }, {} as Record<string, boolean>);

      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      
      if (preferences) {
        setPreferences({ ...preferences, ...updates } as NotificationPreference);
      }
      toast.success('모든 이메일 알림이 활성화되었습니다');
    } catch (error) {
      console.error('Error enabling all:', error);
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableAll = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const updates = preferenceConfig.reduce((acc, config) => {
        acc[config.key] = false;
        return acc;
      }, {} as Record<string, boolean>);

      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      
      if (preferences) {
        setPreferences({ ...preferences, ...updates } as NotificationPreference);
      }
      toast.success('모든 이메일 알림이 비활성화되었습니다');
    } catch (error) {
      console.error('Error disabling all:', error);
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            이메일 알림 설정
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          이메일 알림 설정
        </CardTitle>
        <CardDescription>
          알림 유형별로 이메일 수신 여부를 설정할 수 있습니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEnableAll} disabled={saving}>
            모두 켜기
          </Button>
          <Button variant="outline" size="sm" onClick={handleDisableAll} disabled={saving}>
            모두 끄기
          </Button>
        </div>

        <div className="space-y-4">
          {preferenceConfig.map((config) => {
            const Icon = config.icon;
            const value = preferences?.[config.key as keyof NotificationPreference] as boolean;
            
            return (
              <div
                key={config.key}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor={config.key} className="font-medium cursor-pointer">
                      {config.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <Switch
                  id={config.key}
                  checked={value ?? true}
                  onCheckedChange={(checked) => handleToggle(config.key, checked)}
                  disabled={saving}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
