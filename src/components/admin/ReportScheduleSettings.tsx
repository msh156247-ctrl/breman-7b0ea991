import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, Loader2, Save } from 'lucide-react';

interface ReportScheduleSettings {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  delivery_hour: number;
  delivery_minute: number;
  weekly_day: number;
  monthly_day: number;
  is_enabled: boolean;
  timezone: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

const MONTHLY_DAYS = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}일`,
}));

export function ReportScheduleSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReportScheduleSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('report_schedule_settings')
        .select('*')
        .single();

      if (error) throw error;
      
      setSettings(data as ReportScheduleSettings);
    } catch (error) {
      console.error('Error fetching report schedule settings:', error);
      toast.error('설정을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('report_schedule_settings')
        .update({
          frequency: settings.frequency,
          delivery_hour: settings.delivery_hour,
          delivery_minute: settings.delivery_minute,
          weekly_day: settings.weekly_day,
          monthly_day: settings.monthly_day,
          is_enabled: settings.is_enabled,
        })
        .eq('id', settings.id);

      if (error) throw error;
      
      toast.success('보고서 스케줄 설정이 저장되었습니다');
    } catch (error) {
      console.error('Error saving report schedule settings:', error);
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ReportScheduleSettings>(
    key: K,
    value: ReportScheduleSettings[K]
  ) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">설정을 불러올 수 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>자동 보고서 스케줄</CardTitle>
                <CardDescription>
                  관리자에게 활동 보고서를 자동으로 발송하는 스케줄을 설정합니다
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="enabled" className="text-sm text-muted-foreground">
                활성화
              </Label>
              <Switch
                id="enabled"
                checked={settings.is_enabled}
                onCheckedChange={(checked) => updateSetting('is_enabled', checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Frequency */}
          <div className="space-y-2">
            <Label>발송 주기</Label>
            <Select
              value={settings.frequency}
              onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                updateSetting('frequency', value)
              }
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">매일</SelectItem>
                <SelectItem value="weekly">매주</SelectItem>
                <SelectItem value="monthly">매월</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weekly Day */}
          {settings.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>요일 선택</Label>
              <Select
                value={settings.weekly_day.toString()}
                onValueChange={(value) => updateSetting('weekly_day', parseInt(value))}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Monthly Day */}
          {settings.frequency === 'monthly' && (
            <div className="space-y-2">
              <Label>날짜 선택</Label>
              <Select
                value={settings.monthly_day.toString()}
                onValueChange={(value) => updateSetting('monthly_day', parseInt(value))}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHLY_DAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                29일 이후는 해당 월에 없을 수 있어 28일까지만 선택 가능합니다
              </p>
            </div>
          )}

          {/* Delivery Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              발송 시간 (KST)
            </Label>
            <Select
              value={settings.delivery_hour.toString()}
              onValueChange={(value) => updateSetting('delivery_hour', parseInt(value))}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((hour) => (
                  <SelectItem key={hour.value} value={hour.value.toString()}>
                    {hour.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">현재 설정: </span>
              {settings.is_enabled ? (
                <>
                  {settings.frequency === 'daily' && '매일'}
                  {settings.frequency === 'weekly' &&
                    `매주 ${DAYS_OF_WEEK.find((d) => d.value === settings.weekly_day)?.label}`}
                  {settings.frequency === 'monthly' && `매월 ${settings.monthly_day}일`}
                  {` ${settings.delivery_hour.toString().padStart(2, '0')}:00 (KST)에 자동 발송`}
                </>
              ) : (
                '자동 발송 비활성화됨'
              )}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            설정 저장
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
