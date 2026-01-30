import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MessageCircle, 
  Users, 
  Check, 
  UserPlus, 
  Clock, 
  UserCheck,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  primary_role: string | null;
}

interface Team {
  id: string;
  name: string;
  emblem_url: string | null;
  slogan: string | null;
}

interface ChatTarget {
  type: 'user' | 'team';
  id: string;
  name: string;
  avatar_url: string | null;
  subtitle: string | null;
}

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (conversationId: string) => void;
}

export function NewChatDialog({ open, onOpenChange, onChatCreated }: NewChatDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { 
    friends, 
    pendingRequests, 
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest,
    getFriendshipStatus 
  } = useFriends();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [targets, setTargets] = useState<ChatTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<ChatTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const allTargets: ChatTarget[] = [];

      // Fetch users (exclude self)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, primary_role')
        .neq('id', user.id)
        .order('name');

      if (usersData) {
        usersData.forEach(u => {
          allTargets.push({
            type: 'user',
            id: u.id,
            name: u.name,
            avatar_url: u.avatar_url,
            subtitle: u.primary_role,
          });
        });
      }

      // Fetch my teams (as member or leader)
      const { data: memberships } = await supabase
        .from('team_memberships')
        .select('team_id')
        .eq('user_id', user.id);

      const { data: leaderTeams } = await supabase
        .from('teams')
        .select('id, name, emblem_url, slogan')
        .eq('leader_id', user.id);

      const memberTeamIds = memberships?.map(m => m.team_id) || [];
      let myTeams: Team[] = leaderTeams || [];
      
      if (memberTeamIds.length > 0) {
        const { data: memberTeams } = await supabase
          .from('teams')
          .select('id, name, emblem_url, slogan')
          .in('id', memberTeamIds);

        const allMyTeams = [...(leaderTeams || []), ...(memberTeams || [])];
        myTeams = Array.from(new Map(allMyTeams.map(t => [t.id, t])).values());
      }

      myTeams.forEach(t => {
        allTargets.push({
          type: 'team',
          id: t.id,
          name: t.name,
          avatar_url: t.emblem_url,
          subtitle: t.slogan,
        });
      });

      setTargets(allTargets);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    if (!selectedTarget || !user) return;
    setCreating(true);

    try {
      if (selectedTarget.type === 'user') {
        // 1:1 direct chat
        const { data: existingConvos } = await supabase
          .from('conversations')
          .select(`
            id,
            conversation_participants!inner(user_id)
          `)
          .eq('type', 'direct');

        // Find existing conversation between these two users
        const existingConvo = existingConvos?.find(convo => {
          const participants = convo.conversation_participants;
          if (!participants || participants.length !== 2) return false;
          const participantIds = participants.map((p: { user_id: string | null }) => p.user_id);
          return participantIds.includes(user.id) && participantIds.includes(selectedTarget.id);
        });

        if (existingConvo) {
          onChatCreated(existingConvo.id);
          onOpenChange(false);
          resetSelections();
          return;
        }

        // Create new conversation
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({ type: 'direct' })
          .select()
          .single();

        if (convoError) throw convoError;

        // Add participants
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: newConvo.id, user_id: user.id },
            { conversation_id: newConvo.id, user_id: selectedTarget.id }
          ]);

        if (participantsError) throw participantsError;

        toast.success('채팅방이 생성되었습니다');
        onChatCreated(newConvo.id);
      } else {
        // Team chat
        const { data: existingConvo, error: fetchError } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'team')
          .eq('team_id', selectedTarget.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingConvo) {
          onChatCreated(existingConvo.id);
          onOpenChange(false);
          resetSelections();
          return;
        }

        // Create new team conversation
        const { data: newConvo, error } = await supabase
          .from('conversations')
          .insert({ 
            type: 'team',
            team_id: selectedTarget.id,
            name: selectedTarget.name
          })
          .select()
          .single();

        if (error) throw error;

        toast.success('팀 채팅방이 생성되었습니다');
        onChatCreated(newConvo.id);
      }

      onOpenChange(false);
      resetSelections();
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('채팅방 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const handleSendFriendRequest = async (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await sendFriendRequest(targetId);
  };

  const handleAcceptRequest = async (friendshipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await acceptFriendRequest(friendshipId);
  };

  const handleRejectRequest = async (friendshipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await rejectFriendRequest(friendshipId);
  };

  const filteredTargets = targets.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build friend targets for the friends tab
  const friendTargets: ChatTarget[] = filteredFriends.map(f => ({
    type: 'user' as const,
    id: f.friendId,
    name: f.name,
    avatar_url: f.avatar_url,
    subtitle: f.primary_role,
  }));

  const resetSelections = () => {
    setSelectedTarget(null);
    setSearchQuery('');
    setActiveTab('all');
  };

  const renderFriendshipButton = (target: ChatTarget) => {
    if (target.type !== 'user') return null;

    const status = getFriendshipStatus(target.id);
    
    switch (status) {
      case 'accepted':
        return (
          <Badge variant="secondary" className="text-xs">
            <UserCheck className="h-3 w-3 mr-1" />
            친구
          </Badge>
        );
      case 'pending_sent':
        return (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            요청 중
          </Badge>
        );
      case 'pending_received':
        const request = pendingRequests.find(r => r.friendId === target.id);
        if (request) {
          return (
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 px-2 text-xs"
                onClick={(e) => handleAcceptRequest(request.id, e)}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 px-2 text-xs"
                onClick={(e) => handleRejectRequest(request.id, e)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }
        return null;
      default:
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={(e) => handleSendFriendRequest(target.id, e)}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            친구 추가
          </Button>
        );
    }
  };

  const renderTargetItem = (target: ChatTarget, showFriendButton = true) => (
    <div
      key={`${target.type}-${target.id}`}
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
        selectedTarget?.id === target.id && selectedTarget?.type === target.type
          ? 'bg-primary/10' 
          : 'hover:bg-muted'
      }`}
      onClick={() => setSelectedTarget(target)}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={target.avatar_url || undefined} />
          <AvatarFallback>{target.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
          {target.type === 'user' ? (
            <MessageCircle className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Users className="h-3 w-3 text-primary" />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{target.name}</p>
        {target.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{target.subtitle}</p>
        )}
      </div>
      {showFriendButton && renderFriendshipButton(target)}
      {selectedTarget?.id === target.id && selectedTarget?.type === target.type && (
        <Check className="h-4 w-4 text-primary flex-shrink-0" />
      )}
    </div>
  );

  const content = (
    <div className="flex flex-col gap-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="friends">
            친구
            {friends.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {friends.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests">
            요청
            {pendingRequests.filter(r => !r.isSentByMe).length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {pendingRequests.filter(r => !r.isSentByMe).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <TabsContent value="all" className="mt-2">
          <ScrollArea className="h-64">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-pulse">로딩중...</div>
              </div>
            ) : filteredTargets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTargets.map((target) => renderTargetItem(target))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="friends" className="mt-2">
          <ScrollArea className="h-64">
            {friendTargets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다' : '아직 친구가 없습니다'}
              </div>
            ) : (
              <div className="space-y-1">
                {friendTargets.map((target) => renderTargetItem(target, false))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="requests" className="mt-2">
          <ScrollArea className="h-64">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                대기 중인 요청이 없습니다
              </div>
            ) : (
              <div className="space-y-1">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.avatar_url || undefined} />
                      <AvatarFallback>{request.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{request.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.isSentByMe ? '내가 보낸 요청' : '받은 요청'}
                      </p>
                    </div>
                    {!request.isSentByMe && (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="h-7 px-2"
                          onClick={(e) => handleAcceptRequest(request.id, e)}
                        >
                          수락
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2"
                          onClick={(e) => handleRejectRequest(request.id, e)}
                        >
                          거절
                        </Button>
                      </div>
                    )}
                    {request.isSentByMe && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        대기 중
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Button
        className="w-full"
        disabled={!selectedTarget || creating}
        onClick={handleCreateChat}
      >
        {creating ? '생성 중...' : '채팅 시작'}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetSelections(); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>새 채팅</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetSelections(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 채팅</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
