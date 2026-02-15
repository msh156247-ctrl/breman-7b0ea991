import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFollows } from '@/hooks/useFollows';
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
  UserCheck,
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
  const { following, isFollowing, follow } = useFollows();
  
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

        let existingConvoId: string | null = null;
        if (existingConvos) {
          for (const convo of existingConvos) {
            const participants = convo.conversation_participants as any[];
            const participantIds = participants.map((p: any) => p.user_id);
            if (participantIds.includes(user.id) && participantIds.includes(selectedTarget.id) && participantIds.length === 2) {
              existingConvoId = convo.id;
              break;
            }
          }
        }

        if (existingConvoId) {
          onChatCreated(existingConvoId);
          onOpenChange(false);
          resetSelections();
          return;
        }

        const { data: newConvo, error } = await supabase
          .from('conversations')
          .insert({ type: 'direct' as const })
          .select()
          .single();

        if (error) throw error;

        await supabase.from('conversation_participants').insert([
          { conversation_id: newConvo.id, user_id: user.id },
          { conversation_id: newConvo.id, user_id: selectedTarget.id },
        ]);

        onChatCreated(newConvo.id);
      } else {
        // Team chat
        const { data: existingTeamConvo } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'team')
          .eq('team_id', selectedTarget.id)
          .maybeSingle();

        if (existingTeamConvo) {
          onChatCreated(existingTeamConvo.id);
          onOpenChange(false);
          resetSelections();
          return;
        }

        const { data: newConvo, error } = await supabase
          .from('conversations')
          .insert({ 
            type: 'team' as const,
            team_id: selectedTarget.id,
            name: selectedTarget.name,
          })
          .select()
          .single();

        if (error) throw error;

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

  const handleFollow = async (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await follow(targetId);
  };

  const filteredTargets = targets.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build following targets for the following tab
  const followingTargets: ChatTarget[] = following
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(f => ({
      type: 'user' as const,
      id: f.userId,
      name: f.name,
      avatar_url: f.avatar_url,
      subtitle: f.primary_role,
    }));

  const resetSelections = () => {
    setSelectedTarget(null);
    setSearchQuery('');
    setActiveTab('all');
  };

  const renderFollowButton = (target: ChatTarget) => {
    if (target.type !== 'user') return null;

    if (isFollowing(target.id)) {
      return (
        <Badge variant="secondary" className="text-xs">
          <UserCheck className="h-3 w-3 mr-1" />
          팔로잉
        </Badge>
      );
    }

    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={(e) => handleFollow(target.id, e)}
      >
        <UserPlus className="h-3 w-3 mr-1" />
        팔로우
      </Button>
    );
  };

  const renderTargetItem = (target: ChatTarget, showFollowButton = true) => (
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
      {showFollowButton && renderFollowButton(target)}
      {selectedTarget?.id === target.id && selectedTarget?.type === target.type && (
        <Check className="h-4 w-4 text-primary flex-shrink-0" />
      )}
    </div>
  );

  const content = (
    <div className="flex flex-col gap-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="following">
            팔로잉
            {following.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {following.length}
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

        <TabsContent value="following" className="mt-2">
          <ScrollArea className="h-64">
            {followingTargets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다' : '아직 팔로우하는 사용자가 없습니다'}
              </div>
            ) : (
              <div className="space-y-1">
                {followingTargets.map((target) => renderTargetItem(target, false))}
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
