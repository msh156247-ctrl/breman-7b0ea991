import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Users, 
  UsersRound, 
  Search,
  Plus,
  ChevronRight
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

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Realtime subscription for new messages
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
      // Fetch conversations where user is a participant
      const { data: directConvos, error: directError } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(user_id, team_id)
        `)
        .order('last_message_at', { ascending: false });

      if (directError) throw directError;

      // Fetch team-based conversations
      const { data: userTeams } = await supabase
        .from('team_memberships')
        .select('team_id')
        .eq('user_id', user.id);

      const { data: leaderTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('leader_id', user.id);

      const teamIds = [
        ...(userTeams?.map(t => t.team_id) || []),
        ...(leaderTeams?.map(t => t.id) || [])
      ];

      // Fetch team-based conversations only if user has teams
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

      // Combine and enrich conversations
      const allConvos = [...(directConvos || []), ...teamConvos];
      const uniqueConvos = Array.from(new Map(allConvos.map(c => [c.id, c])).values());

      // Enrich with additional data
      const enrichedConvos = await Promise.all(
        uniqueConvos.map(async (convo) => {
          let enriched: Conversation = {
            ...convo,
            type: convo.type as 'direct' | 'team' | 'team_to_team'
          };

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          enriched.last_message = lastMsg?.content;

          if (convo.type === 'direct') {
            // Get the other participant
            const { data: participants } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', convo.id)
              .neq('user_id', user.id);

            if (participants && participants[0]) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', participants[0].user_id)
                .single();

              enriched.participant_name = profile?.name;
              enriched.participant_avatar = profile?.avatar_url || undefined;
            }
          } else if (convo.type === 'team' && convo.team_id) {
            const { data: team } = await supabase
              .from('teams')
              .select('name, emblem_url')
              .eq('id', convo.team_id)
              .single();

            enriched.team_name = team?.name;
            enriched.team_emblem = team?.emblem_url || undefined;
          } else if (convo.type === 'team_to_team') {
            enriched.name = convo.name || '팀 간 채팅';
          }

          return enriched;
        })
      );

      setConversations(enrichedConvos.sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      ));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'a h:mm', { locale: ko });
    } else if (isYesterday(date)) {
      return '어제';
    }
    return format(date, 'M/d', { locale: ko });
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return <MessageCircle className="h-4 w-4" />;
      case 'team':
        return <Users className="h-4 w-4" />;
      case 'team_to_team':
        return <UsersRound className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getConversationLabel = (type: string) => {
    switch (type) {
      case 'direct':
        return '1:1';
      case 'team':
        return '팀';
      case 'team_to_team':
        return '팀간';
      default:
        return '';
    }
  };

  const filteredConversations = conversations.filter(convo => {
    const searchLower = searchQuery.toLowerCase();
    return !searchQuery || 
      convo.participant_name?.toLowerCase().includes(searchLower) ||
      convo.team_name?.toLowerCase().includes(searchLower) ||
      convo.name?.toLowerCase().includes(searchLower) ||
      convo.last_message?.toLowerCase().includes(searchLower);
  });

  const handleConversationClick = (convo: Conversation) => {
    navigate(`/chat/${convo.id}`);
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">채팅</h1>
        <Button onClick={() => setShowNewChatDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          새 채팅
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="채팅 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Conversation List - KakaoTalk style without tabs */}
      <ScrollArea className="h-[calc(100vh-220px)]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">로딩중...</div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">채팅이 없습니다</p>
            <Button 
              variant="link" 
              onClick={() => setShowNewChatDialog(true)}
              className="mt-2"
            >
              새 채팅 시작하기
            </Button>
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
      </ScrollArea>

      <NewChatDialog 
        open={showNewChatDialog} 
        onOpenChange={setShowNewChatDialog}
        onChatCreated={(conversationId) => navigate(`/chat/${conversationId}`)}
      />
    </div>
  );
}
