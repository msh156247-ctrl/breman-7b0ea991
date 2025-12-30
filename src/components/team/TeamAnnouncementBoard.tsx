import { useState, useEffect } from 'react';
import { Megaphone, Plus, Edit2, Trash2, Pin, PinOff, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author: {
    name: string;
  };
}

interface TeamAnnouncementBoardProps {
  teamId: string;
  isLeader: boolean;
  isMember: boolean;
}

// Mock announcements data
const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: '📢 팀 미팅 일정 공지',
    content: '이번 주 금요일 오후 3시에 팀 미팅이 있습니다. 모든 팀원분들의 참석 부탁드립니다. 회의 안건은 다음 프로젝트 기획 관련 논의입니다.',
    is_pinned: true,
    created_at: '2024-12-28T10:00:00Z',
    author: { name: '김리더' },
  },
  {
    id: '2',
    title: '신규 프로젝트 수주 안내',
    content: '새로운 E-커머스 프로젝트를 수주했습니다. 1월 초부터 본격적인 개발이 시작될 예정입니다. 담당 역할은 곧 공지하겠습니다.',
    is_pinned: true,
    created_at: '2024-12-27T14:30:00Z',
    author: { name: '김리더' },
  },
  {
    id: '3',
    title: '휴가 일정 조율',
    content: '연말 휴가 일정을 조율하고자 합니다. 각자 희망 휴가 일정을 채팅으로 공유해주세요.',
    is_pinned: false,
    created_at: '2024-12-25T09:00:00Z',
    author: { name: '박보안' },
  },
];

export function TeamAnnouncementBoard({ teamId, isLeader, isMember }: TeamAnnouncementBoardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const pinnedAnnouncements = announcements.filter(a => a.is_pinned);
  const regularAnnouncements = announcements.filter(a => !a.is_pinned);

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: '입력 필요',
        description: '제목과 내용을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      is_pinned: false,
      created_at: new Date().toISOString(),
      author: { name: user?.email?.split('@')[0] || '사용자' },
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    setNewTitle('');
    setNewContent('');
    setIsCreateOpen(false);
    toast({
      title: '공지 등록됨',
      description: '새로운 공지사항이 등록되었습니다.',
    });
  };

  const handleEdit = () => {
    if (!editingAnnouncement || !newTitle.trim() || !newContent.trim()) {
      toast({
        title: '입력 필요',
        description: '제목과 내용을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setAnnouncements(announcements.map(a => 
      a.id === editingAnnouncement.id 
        ? { ...a, title: newTitle, content: newContent }
        : a
    ));
    setEditingAnnouncement(null);
    setNewTitle('');
    setNewContent('');
    toast({
      title: '수정 완료',
      description: '공지사항이 수정되었습니다.',
    });
  };

  const handleDelete = (id: string) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
    setDeleteId(null);
    toast({
      title: '삭제됨',
      description: '공지사항이 삭제되었습니다.',
    });
  };

  const handleTogglePin = (id: string) => {
    setAnnouncements(announcements.map(a =>
      a.id === id ? { ...a, is_pinned: !a.is_pinned } : a
    ));
    toast({
      title: '고정 상태 변경',
      description: '공지사항 고정 상태가 변경되었습니다.',
    });
  };

  const openEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setNewTitle(announcement.title);
    setNewContent(announcement.content);
  };

  if (!isMember) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-8 text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">팀원만 공지사항을 볼 수 있습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      {isLeader && (
        <div className="flex justify-end">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                공지 작성
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 공지사항</DialogTitle>
                <DialogDescription>
                  팀원들에게 전달할 공지사항을 작성하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">제목</label>
                  <Input
                    placeholder="공지 제목을 입력하세요"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">내용</label>
                  <Textarea
                    placeholder="공지 내용을 입력하세요"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCreate} className="bg-gradient-primary">
                  등록
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Pin className="w-4 h-4" />
            고정된 공지
          </h3>
          {pinnedAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isLeader={isLeader}
              onEdit={openEdit}
              onDelete={setDeleteId}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* Regular Announcements */}
      {regularAnnouncements.length > 0 && (
        <div className="space-y-3">
          {pinnedAnnouncements.length > 0 && (
            <h3 className="text-sm font-medium text-muted-foreground mt-6">전체 공지</h3>
          )}
          {regularAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isLeader={isLeader}
              onEdit={openEdit}
              onDelete={setDeleteId}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {announcements.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">등록된 공지사항이 없습니다</p>
            {isLeader && (
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setIsCreateOpen(true)}
              >
                첫 공지 작성하기
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAnnouncement} onOpenChange={(open) => !open && setEditingAnnouncement(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지사항 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">제목</label>
              <Input
                placeholder="공지 제목을 입력하세요"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">내용</label>
              <Textarea
                placeholder="공지 내용을 입력하세요"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAnnouncement(null)}>
              취소
            </Button>
            <Button onClick={handleEdit} className="bg-gradient-primary">
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface AnnouncementCardProps {
  announcement: Announcement;
  isLeader: boolean;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function AnnouncementCard({ announcement, isLeader, onEdit, onDelete, onTogglePin }: AnnouncementCardProps) {
  return (
    <Card className={announcement.is_pinned ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {announcement.is_pinned && (
                <Badge variant="secondary" className="text-xs">
                  <Pin className="w-3 h-3 mr-1" />
                  고정
                </Badge>
              )}
              <h4 className="font-semibold truncate">{announcement.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
              {announcement.content}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {announcement.author.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(announcement.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
              </span>
            </div>
          </div>
          
          {isLeader && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onTogglePin(announcement.id)}
                title={announcement.is_pinned ? '고정 해제' : '고정'}
              >
                {announcement.is_pinned ? (
                  <PinOff className="w-4 h-4" />
                ) : (
                  <Pin className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(announcement)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(announcement.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
