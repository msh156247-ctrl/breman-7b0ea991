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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface InviteToConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  existingParticipantIds: string[];
  onInviteSuccess?: () => void;
}

interface UserResult {
  id: string;
  name: string;
  avatar_url: string | null;
  email: string;
  isFriend: boolean;
}

export function InviteToConversationDialog({
  open,
  onOpenChange,
  conversationId,
  existingParticipantIds,
  onInviteSuccess
}: InviteToConversationDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [friends, setFriends] = useState<UserResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'search'>('friends');

  // Fetch friends list
  useEffect(() => {
    if (open && user) {
      fetchFriends();
    }
  }, [open, user]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setActiveTab('friends');
    }
  }, [open]);

  const fetchFriends = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user_id,
          friend_id,
          status
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) throw error;

      // Get friend IDs (exclude self)
      const friendIds = (data || []).map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ).filter(id => !existingParticipantIds.includes(id));

      if (friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Fetch friend profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, email')
        .in('id', friendIds);

      if (profileError) throw profileError;

      setFriends((profiles || []).map(p => ({
        ...p,
        isFriend: true
      })));
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, email')
        .neq('id', user.id)
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;

      // Filter out existing participants
      const filtered = (data || []).filter(
        p => !existingParticipantIds.includes(p.id)
      );

      // Check which are friends
      const friendIds = friends.map(f => f.id);
      setSearchResults(filtered.map(p => ({
        ...p,
        isFriend: friendIds.includes(p.id)
      })));
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('사용자 검색에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleInvite = async () => {
    if (selectedUsers.length === 0) return;

    setInviting(true);
    try {
      // Add selected users as participants
      const inserts = selectedUsers.map(userId => ({
        conversation_id: conversationId,
        user_id: userId
      }));

      const { error } = await supabase
        .from('conversation_participants')
        .insert(inserts);

      if (error) throw error;

      toast.success(`${selectedUsers.length}명을 초대했습니다`);
      onInviteSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error inviting users:', error);
      toast.error('초대에 실패했습니다');
    } finally {
      setInviting(false);
    }
  };

  const displayUsers = activeTab === 'friends' ? friends : searchResults;

  const content = (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'friends' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('friends')}
        >
          친구 목록
        </Button>
        <Button
          variant={activeTab === 'search' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('search')}
        >
          사용자 검색
        </Button>
      </div>

      {/* Search input (only in search tab) */}
      {activeTab === 'search' && (
        <div className="flex gap-2">
          <Input
            placeholder="이름 또는 이메일로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button size="icon" onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* User list */}
      <ScrollArea className="h-[250px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            {activeTab === 'friends' ? (
              <>
                <UserPlus className="h-8 w-8 mb-2" />
                <p className="text-sm">초대 가능한 친구가 없습니다</p>
              </>
            ) : searchQuery ? (
              <>
                <Search className="h-8 w-8 mb-2" />
                <p className="text-sm">검색 결과가 없습니다</p>
              </>
            ) : (
              <>
                <Search className="h-8 w-8 mb-2" />
                <p className="text-sm">사용자를 검색하세요</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayUsers.map((userItem) => (
              <div
                key={userItem.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUsers.includes(userItem.id)
                    ? 'bg-primary/10 ring-1 ring-primary'
                    : 'hover:bg-accent'
                }`}
                onClick={() => toggleUserSelection(userItem.id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userItem.avatar_url || undefined} />
                  <AvatarFallback>
                    {userItem.name?.slice(0, 2) || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{userItem.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {userItem.email}
                  </p>
                </div>
                {userItem.isFriend && (
                  <Badge variant="secondary" className="shrink-0">
                    친구
                  </Badge>
                )}
                {selectedUsers.includes(userItem.id) && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Selected count & Invite button */}
      <div className="flex items-center justify-between pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          {selectedUsers.length > 0 
            ? `${selectedUsers.length}명 선택됨`
            : '초대할 사용자를 선택하세요'
          }
        </p>
        <Button 
          onClick={handleInvite} 
          disabled={selectedUsers.length === 0 || inviting}
        >
          {inviting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          초대하기
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              대화 초대
            </DrawerTitle>
            <DrawerDescription>
              대화에 참여할 사용자를 선택하세요
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            대화 초대
          </DialogTitle>
          <DialogDescription>
            대화에 참여할 사용자를 선택하세요
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}