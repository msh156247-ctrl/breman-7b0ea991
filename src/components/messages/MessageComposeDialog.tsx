import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Send, Loader2, X, UserCircle, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface MessageComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId?: string;
  recipientName?: string;
  defaultSubject?: string;
  onSent?: () => void;
}

interface UserResult {
  id: string;
  name: string;
  avatar_url: string | null;
  email: string;
}

interface TeamResult {
  id: string;
  name: string;
  emblem_url: string | null;
  leader_id: string;
  members: UserResult[];
}

export function MessageComposeDialog({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  defaultSubject,
  onSent,
}: MessageComposeDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Recipients (TO)
  const [recipients, setRecipients] = useState<UserResult[]>([]);
  // CC recipients
  const [ccRecipients, setCcRecipients] = useState<UserResult[]>([]);
  const [showCc, setShowCc] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [teamResults, setTeamResults] = useState<TeamResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTarget, setSearchTarget] = useState<'to' | 'cc'>('to');

  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  // Set recipient if provided
  useEffect(() => {
    if (open && recipientId && recipientName) {
      setRecipients([{ id: recipientId, name: recipientName, avatar_url: null, email: '' }]);
    }
    if (open && defaultSubject) {
      setSubject(defaultSubject);
    }
  }, [open, recipientId, recipientName, defaultSubject]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setRecipients([]);
      setCcRecipients([]);
      setShowCc(false);
      setSearchQuery('');
      setSearchResults([]);
      setTeamResults([]);
      setSubject('');
      setContent('');
      setSearchTarget('to');
    }
  }, [open]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setSearching(true);
    try {
      // Search users
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, email')
        .neq('id', user.id)
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(users || []);

      // Search teams
      const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('id, name, emblem_url, leader_id')
        .ilike('name', `%${searchQuery}%`)
        .limit(5);

      if (!teamError && teams) {
        // Fetch members for each team
        const teamsWithMembers: TeamResult[] = [];
        for (const team of teams) {
          const { data: memberships } = await supabase
            .from('team_memberships')
            .select('user_id')
            .eq('team_id', team.id);

          const memberIds = [
            team.leader_id,
            ...(memberships || []).map(m => m.user_id).filter(Boolean),
          ].filter((id): id is string => !!id && id !== user.id);

          const uniqueIds = [...new Set(memberIds)];
          if (uniqueIds.length === 0) continue;

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, avatar_url, email')
            .in('id', uniqueIds);

          teamsWithMembers.push({
            ...team,
            members: profiles || [],
          });
        }
        setTeamResults(teamsWithMembers);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  const addRecipient = (u: UserResult) => {
    const target = searchTarget === 'to' ? recipients : ccRecipients;
    const setter = searchTarget === 'to' ? setRecipients : setCcRecipients;
    if (!target.find(r => r.id === u.id)) {
      setter(prev => [...prev, u]);
    }
  };

  const addTeamMembers = (team: TeamResult) => {
    const target = searchTarget === 'to' ? recipients : ccRecipients;
    const setter = searchTarget === 'to' ? setRecipients : setCcRecipients;
    const newMembers = team.members.filter(m => !target.find(r => r.id === m.id));
    if (newMembers.length > 0) {
      setter(prev => [...prev, ...newMembers]);
    }
    toast.success(`${team.name} 팀원 ${newMembers.length}명 추가됨`);
  };

  const removeRecipient = (id: string, type: 'to' | 'cc') => {
    if (type === 'to') {
      setRecipients(prev => prev.filter(r => r.id !== id));
    } else {
      setCcRecipients(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0 || !content.trim() || !user) return;

    setSending(true);
    try {
      const groupId = crypto.randomUUID();
      const allRecipients = [
        ...recipients.map(r => ({ ...r, is_cc: false })),
        ...ccRecipients.map(r => ({ ...r, is_cc: true })),
      ];

      // Remove duplicates (if someone is in both TO and CC, keep as TO)
      const seen = new Set<string>();
      const unique = allRecipients.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      const rows = unique.map(r => ({
        sender_id: user.id,
        recipient_id: r.id,
        subject: subject.trim(),
        content: content.trim(),
        is_cc: r.is_cc,
        group_id: unique.length > 1 ? groupId : null,
      }));

      const { error } = await supabase.from('direct_messages').insert(rows);
      if (error) throw error;

      toast.success(`${unique.length}명에게 쪽지를 보냈습니다`);
      onSent?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('쪽지 전송에 실패했습니다');
    } finally {
      setSending(false);
    }
  };

  const totalRecipients = recipients.length + ccRecipients.length;

  const renderRecipientChips = (list: UserResult[], type: 'to' | 'cc') => (
    <div className="flex flex-wrap gap-1.5">
      {list.map(r => (
        <Badge key={r.id} variant="secondary" className="gap-1 pr-1 py-1">
          <Avatar className="h-4 w-4">
            <AvatarImage src={r.avatar_url || undefined} />
            <AvatarFallback className="text-[8px] bg-primary/10">{r.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-xs max-w-[100px] truncate">{r.name}</span>
          <button
            onClick={() => removeRecipient(r.id, type)}
            className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );

  const renderSearchSection = () => (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="이름, 이메일 또는 팀 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          autoFocus={recipients.length === 0 && !recipientId}
        />
        <Button size="icon" onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {searching ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="max-h-[180px]">
          <div className="space-y-1">
            {/* Team results */}
            {teamResults.map((team) => (
              <div
                key={`team-${team.id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors border border-dashed border-border"
                onClick={() => addTeamMembers(team)}
              >
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground">{team.members.length}명의 팀원</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">팀 전체</Badge>
              </div>
            ))}

            {/* User results */}
            {searchResults.map((u) => {
              const alreadyAdded = recipients.find(r => r.id === u.id) || ccRecipients.find(r => r.id === u.id);
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    alreadyAdded ? 'opacity-50 cursor-default' : 'hover:bg-accent cursor-pointer'
                  }`}
                  onClick={() => !alreadyAdded && addRecipient(u)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-sm">
                      {u.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {alreadyAdded && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">추가됨</Badge>
                  )}
                </div>
              );
            })}

            {searchQuery && !searching && searchResults.length === 0 && teamResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">검색 결과가 없습니다</p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  const formContent = (
    <div className="flex flex-col gap-4">
      {/* TO Recipients */}
      <div className="space-y-2">
        <Label>받는 사람</Label>
        {recipients.length > 0 && renderRecipientChips(recipients, 'to')}
        <div onClick={() => setSearchTarget('to')}>
          {searchTarget === 'to' && renderSearchSection()}
          {searchTarget !== 'to' && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setSearchTarget('to')}>
              + 받는 사람 추가
            </Button>
          )}
        </div>
      </div>

      {/* CC toggle */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground gap-1 px-0"
          onClick={() => { setShowCc(!showCc); if (!showCc) setSearchTarget('cc'); }}
        >
          {showCc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          참조 (CC)
          {ccRecipients.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] text-[10px] px-1">
              {ccRecipients.length}
            </Badge>
          )}
        </Button>

        {showCc && (
          <div className="space-y-2 mt-2">
            {ccRecipients.length > 0 && renderRecipientChips(ccRecipients, 'cc')}
            <div onClick={() => setSearchTarget('cc')}>
              {searchTarget === 'cc' && renderSearchSection()}
              {searchTarget !== 'cc' && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setSearchTarget('cc')}>
                  + 참조 추가
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label>제목 (선택)</Label>
        <Input
          placeholder="제목을 입력하세요"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label>내용</Label>
        <Textarea
          placeholder="쪽지 내용을 입력하세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
        />
      </div>

      {/* Send button */}
      <Button
        onClick={handleSend}
        disabled={recipients.length === 0 || !content.trim() || sending}
        className="w-full"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        {totalRecipients > 1 ? `${totalRecipients}명에게 보내기` : '보내기'}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="fixed inset-0 z-50 flex flex-col w-full h-full max-w-none translate-x-0 translate-y-0 left-0 top-0 rounded-none p-0 border-0">
          <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                쪽지 쓰기
              </DialogTitle>
            </div>
            <DialogDescription>
              여러 명 또는 팀에게 쪽지를 보냅니다
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe">
            {formContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            쪽지 쓰기
          </DialogTitle>
          <DialogDescription>
            여러 명 또는 팀에게 쪽지를 보냅니다
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
