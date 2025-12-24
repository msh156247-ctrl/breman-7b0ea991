import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail, Bell, Trophy, Users, FileText, CreditCard, AlertTriangle, Star, Settings, Send, Loader2, Clock, Calendar, Globe } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  digest_mode: 'instant' | 'daily' | 'weekly';
  digest_time: string;
  digest_day: number;
  timezone: string;
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

const digestModeOptions = [
  { value: 'instant', label: '즉시 발송', description: '알림 발생 즉시 이메일 발송', icon: Send },
  { value: 'daily', label: '일일 요약', description: '매일 정해진 시간에 요약 이메일 발송', icon: Clock },
  { value: 'weekly', label: '주간 요약', description: '매주 정해진 시간에 요약 이메일 발송', icon: Calendar },
];

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00:00`, label: `${hour}:00` };
});

const dayOptions = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
];

const timezoneOptions = [
  { value: 'Asia/Seoul', label: '서울 (KST, UTC+9)' },
  { value: 'Asia/Tokyo', label: '도쿄 (JST, UTC+9)' },
  { value: 'Asia/Shanghai', label: '상하이 (CST, UTC+8)' },
  { value: 'Asia/Singapore', label: '싱가포르 (SGT, UTC+8)' },
  { value: 'Asia/Hong_Kong', label: '홍콩 (HKT, UTC+8)' },
  { value: 'Asia/Bangkok', label: '방콕 (ICT, UTC+7)' },
  { value: 'Asia/Kolkata', label: '뭄바이 (IST, UTC+5:30)' },
  { value: 'Asia/Dubai', label: '두바이 (GST, UTC+4)' },
  { value: 'Europe/Moscow', label: '모스크바 (MSK, UTC+3)' },
  { value: 'Europe/Istanbul', label: '이스탄불 (TRT, UTC+3)' },
  { value: 'Europe/Berlin', label: '베를린 (CET, UTC+1/+2)' },
  { value: 'Europe/Paris', label: '파리 (CET, UTC+1/+2)' },
  { value: 'Europe/London', label: '런던 (GMT, UTC+0/+1)' },
  { value: 'America/Sao_Paulo', label: '상파울루 (BRT, UTC-3)' },
  { value: 'America/New_York', label: '뉴욕 (EST, UTC-5/-4)' },
  { value: 'America/Chicago', label: '시카고 (CST, UTC-6/-5)' },
  { value: 'America/Denver', label: '덴버 (MST, UTC-7/-6)' },
  { value: 'America/Los_Angeles', label: '로스앤젤레스 (PST, UTC-8/-7)' },
  { value: 'Pacific/Auckland', label: '오클랜드 (NZST, UTC+12/+13)' },
  { value: 'Australia/Sydney', label: '시드니 (AEST, UTC+10/+11)' },
];

export function NotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

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
        setPreferences(newData as NotificationPreference);
      } else if (error) {
        throw error;
      } else {
        setPreferences(data as NotificationPreference);
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

  const handleDigestModeChange = async (value: 'instant' | 'daily' | 'weekly') => {
    if (!preferences || !user) return;

    const updatedPreferences = { ...preferences, digest_mode: value };
    setPreferences(updatedPreferences);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ digest_mode: value })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('이메일 발송 방식이 변경되었습니다');
    } catch (error) {
      console.error('Error saving digest mode:', error);
      toast.error('설정 저장에 실패했습니다');
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleDigestTimeChange = async (value: string) => {
    if (!preferences || !user) return;

    const updatedPreferences = { ...preferences, digest_time: value };
    setPreferences(updatedPreferences);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ digest_time: value })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('요약 발송 시간이 변경되었습니다');
    } catch (error) {
      console.error('Error saving digest time:', error);
      toast.error('설정 저장에 실패했습니다');
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleDigestDayChange = async (value: string) => {
    if (!preferences || !user) return;

    const dayValue = parseInt(value);
    const updatedPreferences = { ...preferences, digest_day: dayValue };
    setPreferences(updatedPreferences);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ digest_day: dayValue })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('요약 발송 요일이 변경되었습니다');
    } catch (error) {
      console.error('Error saving digest day:', error);
      toast.error('설정 저장에 실패했습니다');
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleTimezoneChange = async (value: string) => {
    if (!preferences || !user) return;

    const updatedPreferences = { ...preferences, timezone: value };
    setPreferences(updatedPreferences);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ timezone: value })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('시간대가 변경되었습니다');
    } catch (error) {
      console.error('Error saving timezone:', error);
      toast.error('설정 저장에 실패했습니다');
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

  const handleSendTestEmail = async () => {
    if (!user) return;
    
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          user_id: user.id,
          notification_type: 'system',
          title: '테스트 이메일',
          message: '이 이메일은 알림 시스템이 정상적으로 작동하는지 확인하기 위한 테스트입니다. 이 메시지를 받으셨다면 이메일 알림이 정상적으로 설정되어 있는 것입니다.',
          link: window.location.origin + '/notifications',
        },
      });

      if (error) throw error;
      
      toast.success('테스트 이메일이 발송되었습니다. 이메일을 확인해주세요.');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(`테스트 이메일 발송 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setSendingTest(false);
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
    <div className="space-y-6">
      {/* Digest Mode Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            이메일 발송 방식
          </CardTitle>
          <CardDescription>
            알림 이메일을 즉시 받을지, 요약으로 받을지 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {digestModeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = preferences?.digest_mode === option.value;
              
              return (
                <div
                  key={option.value}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleDigestModeChange(option.value as 'instant' | 'daily' | 'weekly')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                  </div>
                </div>
              );
            })}
          </div>

          {(preferences?.digest_mode === 'daily' || preferences?.digest_mode === 'weekly') && (
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
              {preferences?.digest_mode === 'weekly' && (
                <>
                  <Label htmlFor="digest-day" className="whitespace-nowrap">
                    발송 요일
                  </Label>
                  <Select
                    value={String(preferences?.digest_day ?? 1)}
                    onValueChange={handleDigestDayChange}
                    disabled={saving}
                  >
                    <SelectTrigger id="digest-day" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((day) => (
                        <SelectItem key={day.value} value={String(day.value)}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Label htmlFor="digest-time" className="whitespace-nowrap">
                발송 시간
              </Label>
              <Select
                value={preferences?.digest_time || '09:00:00'}
                onValueChange={handleDigestTimeChange}
                disabled={saving}
              >
                <SelectTrigger id="digest-time" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(preferences?.digest_mode === 'daily' || preferences?.digest_mode === 'weekly') && (
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="digest-timezone" className="whitespace-nowrap">
                시간대
              </Label>
              <Select
                value={preferences?.timezone || 'Asia/Seoul'}
                onValueChange={handleTimezoneChange}
                disabled={saving}
              >
                <SelectTrigger id="digest-timezone" className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            알림 유형 설정
          </CardTitle>
          <CardDescription>
            알림 유형별로 이메일 수신 여부를 설정할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleEnableAll} disabled={saving}>
              모두 켜기
            </Button>
            <Button variant="outline" size="sm" onClick={handleDisableAll} disabled={saving}>
              모두 끄기
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleSendTestEmail} 
              disabled={sendingTest || !preferences?.email_system}
            >
              {sendingTest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  테스트 이메일 발송
                </>
              )}
            </Button>
          </div>
          
          {!preferences?.email_system && (
            <p className="text-sm text-muted-foreground">
              테스트 이메일을 받으려면 시스템 알림을 활성화해주세요.
            </p>
          )}

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
    </div>
  );
}
