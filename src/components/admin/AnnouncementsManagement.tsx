import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Megaphone, Plus, Trash2, Edit2, Loader2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { logActivity } from '@/lib/activityLogger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  active: boolean;
  priority: number;
  created_at: string;
}

export function AnnouncementsManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    active: true,
    priority: 0,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('공지사항을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content || '',
        active: announcement.active ?? true,
        priority: announcement.priority ?? 0,
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({ title: '', content: '', active: true, priority: 0 });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title,
            content: formData.content || null,
            active: formData.active,
            priority: formData.priority,
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;

        // Log the activity
        await logActivity({
          action: 'update_announcement',
          targetType: 'announcement',
          targetId: editingAnnouncement.id,
          details: { title: formData.title },
        });

        toast.success('공지사항이 수정되었습니다');
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            title: formData.title,
            content: formData.content || null,
            active: formData.active,
            priority: formData.priority,
          })
          .select()
          .single();

        if (error) throw error;

        // Log the activity
        await logActivity({
          action: 'create_announcement',
          targetType: 'announcement',
          targetId: data?.id,
          details: { title: formData.title },
        });

        toast.success('공지사항이 추가되었습니다');
      }

      setDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('공지사항 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const announcement = announcements.find(a => a.id === id);
    
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log the activity
      await logActivity({
        action: 'delete_announcement',
        targetType: 'announcement',
        targetId: id,
        details: { title: announcement?.title },
      });

      toast.success('공지사항이 삭제되었습니다');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('공지사항 삭제에 실패했습니다');
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ active: !announcement.active })
        .eq('id', announcement.id);

      if (error) throw error;
      setAnnouncements(announcements.map(a => 
        a.id === announcement.id ? { ...a, active: !a.active } : a
      ));

      // Log the activity
      await logActivity({
        action: 'toggle_announcement',
        targetType: 'announcement',
        targetId: announcement.id,
        details: { 
          title: announcement.title,
          active: !announcement.active,
        },
      });

      toast.success(announcement.active ? '공지사항이 비활성화되었습니다' : '공지사항이 활성화되었습니다');
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const handlePriorityChange = async (announcement: Announcement, direction: 'up' | 'down') => {
    const newPriority = direction === 'up' ? announcement.priority + 1 : Math.max(0, announcement.priority - 1);
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ priority: newPriority })
        .eq('id', announcement.id);

      if (error) throw error;
      fetchAnnouncements();
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            공지사항 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              공지사항 관리
            </CardTitle>
            <CardDescription>
              총 {announcements.length}개의 공지사항 ({announcements.filter(a => a.active).length}개 활성)
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                새 공지사항
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingAnnouncement ? '공지사항 수정' : '새 공지사항'}
                </DialogTitle>
                <DialogDescription>
                  공지사항을 작성하세요. 활성화된 공지사항만 사용자에게 표시됩니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">제목</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="공지사항 제목을 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">내용</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="공지사항 내용을 입력하세요"
                    rows={5}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Label htmlFor="priority">우선순위</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      className="w-24"
                      min={0}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="active">활성화</Label>
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>등록된 공지사항이 없습니다</p>
            <Button variant="link" onClick={() => handleOpenDialog()}>
              첫 번째 공지사항 작성하기
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-4 rounded-lg border transition-colors ${
                  announcement.active 
                    ? 'bg-card border-border' 
                    : 'bg-muted/50 border-muted opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{announcement.title}</h3>
                      {announcement.active ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                          활성
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          비활성
                        </Badge>
                      )}
                      {announcement.priority > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          우선순위 {announcement.priority}
                        </Badge>
                      )}
                    </div>
                    {announcement.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.content}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(announcement.created_at || '').toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePriorityChange(announcement, 'up')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePriorityChange(announcement, 'down')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={announcement.active ?? false}
                      onCheckedChange={() => handleToggleActive(announcement)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(announcement)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            이 공지사항을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(announcement.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
