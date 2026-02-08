import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageCircle, 
  Users, 
  Search,
  Plus,
  UserPlus
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { NewChatDialog } from '@/components/chat/NewChatDialog';

interface Conversation {
  id: string;
  type: 'direct' | 'team' | 'team_to_team';
  name: string | null;
  team_id: string | null;
  last_message_at: string;
  last_message?: string;
  participant_name?: string;
  participant_avatar?: string;
  team_name?: string;
  team_emblem?: string;
  unread_count?: number;
}

export function ChatConversationList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'team'>('all');

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      const channel = supabase
        .channel('conversations-list')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          () => fetchConversations()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => fetchConversations()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const [
        { data: directConvos, error: directError },
        { data: userTeams },
        { data: leaderTeams }
      ] = await Promise.all([
        supabase
          .from('conversations')
          .select(`
            *,
            conversation_participants!inner(user_id, team_id, last_read_at)
          `)
          .order('last_message_at', { ascending: false }),
        supabase
          .from('team_memberships')
          .select('team_id')
          .eq('user_id', user.id),
        supabase
          .from('teams')
          .select('id')
          .eq('leader_id', user.id)
      ]);

      if (directError) throw directError;

      const teamIds = [
        ...(userTeams?.map(t => t.team_id) || []),
        ...(leaderTeams?.map(t => t.id) || [])
      ];

      let teamConvos: any[] = [];
      if (teamIds.length > 0) {
        const { data, error: teamError } = await supabase
          .from('conversations')
          .select('*')
          .eq('type', 'team')
          .in('team_id', teamIds)
          .order('last_message_at', { ascending: false });

        if (teamError) throw teamError;
        teamConvos = data || [];
      }

      const allConvos = [...(directConvos || []), ...teamConvos];
      const uniqueConvos = Array.from(new Map(allConvos.map(c => [c.id, c])).values());
      
      if (uniqueConvos.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convoIds = uniqueConvos.map(c => c.id);

      const [
        { data: allMessages },
        { data: allParticipants },
        { data: allProfiles },
        { data: allTeams }
      ] = await Promise.all([
        supabase
          .from('messages')
          .select('conversation_id, content, created_at, sender_id')
          .in('conversation_id', convoIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('conversation_participants')
          .select('conversation_id, user_id, last_read_at')
          .in('conversation_id', convoIds),
        supabase
          .from('profiles')
          .select('id, name, avatar_url'),
        supabase
          .from('teams')
          .select('id, name, emblem_url')
          .in('id', teamIds.length > 0 ? teamIds : [''])
      ]);

      const messagesByConvo = new Map<string, { content: string; created_at: string; sender_id: string }>();
      allMessages?.forEach(msg => {
        if (!messagesByConvo.has(msg.conversation_id)) {
          messagesByConvo.set(msg.conversation_id, msg);
        }
      });

      const participantsByConvo = new Map<string, typeof allParticipants>();
      allParticipants?.forEach(p => {
        const list = participantsByConvo.get(p.conversation_id) || [];
        list.push(p);
        participantsByConvo.set(p.conversation_id, list);
      });

      const profilesById = new Map(allProfiles?.map(p => [p.id, p]) || []);
      const teamsById = new Map(allTeams?.map(t => [t.id, t]) || []);

      const userReadTimes = new Map<string, string>();
      participantsByConvo.forEach((participants, convoId) => {
        const userParticipant = participants?.find(p => p.user_id === user.id);
        if (userParticipant?.last_read_at) {
          userReadTimes.set(convoId, userParticipant.last_read_at);
        }
      });

      const unreadByConvo = new Map<string, number>();
      allMessages?.forEach(msg => {
        if (msg.sender_id === user.id) return;
        const lastRead = userReadTimes.get(msg.conversation_id);
        if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
          unreadByConvo.set(msg.conversation_id, (unreadByConvo.get(msg.conversation_id) || 0) + 1);
        }
      });

      const enrichedConvos: Conversation[] = uniqueConvos.map((convo) => {
        const lastMsg = messagesByConvo.get(convo.id);
        const participants = participantsByConvo.get(convo.id) || [];
        const otherParticipant = participants.find(p => p.user_id !== user.id);
        
        let enriched: Conversation = {
          id: convo.id,
          type: convo.type as 'direct' | 'team' | 'team_to_team',
          name: convo.name,
          team_id: convo.team_id,
          last_message_at: convo.last_message_at,
          last_message: lastMsg?.content,
          unread_count: unreadByConvo.get(convo.id) || 0
        };

        if (convo.type === 'direct' && otherParticipant?.user_id) {
          const profile = profilesById.get(otherParticipant.user_id);
          enriched.participant_name = profile?.name;
          enriched.participant_avatar = profile?.avatar_url || undefined;
        } else if (convo.type === 'team' && convo.team_id) {
          const team = teamsById.get(convo.team_id);
          enriched.team_name = team?.name;
          enriched.team_emblem = team?.emblem_url || undefined;
        } else if (convo.type === 'team_to_team') {
          enriched.name = convo.name || '팀 간 채팅';
        }

        return enriched;
      });

      setConversations(enrichedConvos.sort((a, b) => {
        const aUnread = (a.unread_count || 0) > 0 ? 1 : 0;
        const bUnread = (b.unread_count || 0) > 0 ? 1 : 0;
        if (bUnread !== aUnread) return bUnread - aUnread;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'a h:mm', { locale: ko });
    if (isYesterday(date)) return '어제';
    return format(date, 'M/d', { locale: ko });
  };

  const getConversationLabel = (type: string) => {
    switch (type) {
      case 'direct': return '1:1';
      case 'team': return '팀';
      case 'team_to_team': return '팀간';
      default: return '';
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(convo => {
      if (activeTab === 'direct' && convo.type !== 'direct') return false;
      if (activeTab === 'team' && convo.type !== 'team' && convo.type !== 'team_to_team') return false;
      const searchLower = searchQuery.toLowerCase();
      return !searchQuery || 
        convo.participant_name?.toLowerCase().includes(searchLower) ||
        convo.team_name?.toLowerCase().includes(searchLower) ||
        convo.name?.toLowerCase().includes(searchLower) ||
        convo.last_message?.toLowerCase().includes(searchLower);
    });
  }, [conversations, activeTab, searchQuery]);

  const handleConversationClick = (convo: Conversation) => {
    navigate(`/chat/${convo.id}`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Button onClick={() => setShowNewChatDialog(true)} size="sm" className="ml-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          새 채팅 / 친구
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'direct' | 'team')} className="px-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            전체
          </TabsTrigger>
          <TabsTrigger value="direct" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            1:1
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            팀
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative px-4 py-2">
        <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="채팅 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">채팅이 없습니다</p>
            <p className="text-sm text-muted-foreground mb-4">
              팀에 가입하거나 친구를 추가해서 채팅을 시작해보세요
            </p>
            <div className="flex gap-2">
              <Button variant="default" onClick={() => setShowNewChatDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                새 채팅 / 친구 추가
              </Button>
              <Button variant="outline" onClick={() => navigate('/teams')}>
                <Users className="h-4 w-4 mr-2" />
                팀 둘러보기
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((convo) => (
              <Card
                key={convo.id}
                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none rounded-none border-b border-border/50"
                onClick={() => handleConversationClick(convo)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={convo.type === 'direct' ? convo.participant_avatar : convo.team_emblem} 
                    />
                    <AvatarFallback className="bg-primary/10 text-lg">
                      {convo.type === 'direct' 
                        ? convo.participant_name?.charAt(0) 
                        : convo.type === 'team'
                          ? convo.team_emblem || convo.team_name?.charAt(0)
                          : '팀'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {convo.type === 'direct' 
                          ? convo.participant_name 
                          : convo.type === 'team' 
                            ? convo.team_name 
                            : convo.name}
                      </span>
                      <Badge variant="secondary" className="text-xs shrink-0 px-1.5 py-0">
                        {getConversationLabel(convo.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {convo.last_message || '메시지가 없습니다'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(convo.last_message_at)}
                    </span>
                    {convo.unread_count && convo.unread_count > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs">
                        {convo.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <NewChatDialog 
        open={showNewChatDialog} 
        onOpenChange={setShowNewChatDialog}
        onChatCreated={(conversationId) => navigate(`/chat/${conversationId}`)}
      />
    </div>
  );
}
