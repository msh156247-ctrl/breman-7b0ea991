import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageCircle, Users, UsersRound, Check } from 'lucide-react';
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

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (conversationId: string) => void;
}

export function NewChatDialog({ open, onOpenChange, onChatCreated }: NewChatDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTargetTeam, setSelectedTargetTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch users (exclude self)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, primary_role')
        .neq('id', user.id)
        .order('name');

      setUsers(usersData || []);

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
      
      if (memberTeamIds.length > 0) {
        const { data: memberTeams } = await supabase
          .from('teams')
          .select('id, name, emblem_url, slogan')
          .in('id', memberTeamIds);

        const allMyTeams = [...(leaderTeams || []), ...(memberTeams || [])];
        const uniqueTeams = Array.from(new Map(allMyTeams.map(t => [t.id, t])).values());
        setMyTeams(uniqueTeams);
      } else {
        setMyTeams(leaderTeams || []);
      }

      // Fetch all teams for team-to-team chat
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, emblem_url, slogan')
        .order('name');

      setAllTeams(teamsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDirectChat = async () => {
    if (!selectedUser || !user) return;
    setCreating(true);

    try {
      // Check if conversation already exists
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
        const participantIds = participants.map((p: { user_id: string }) => p.user_id);
        return participantIds.includes(user.id) && participantIds.includes(selectedUser.id);
      });

      if (existingConvo) {
        onChatCreated(existingConvo.id);
        onOpenChange(false);
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
          { conversation_id: newConvo.id, user_id: selectedUser.id }
        ]);

      if (participantsError) throw participantsError;

      toast.success('채팅방이 생성되었습니다');
      onChatCreated(newConvo.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('채팅방 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const handleNavigateToTeamChat = async () => {
    if (!selectedTeam) return;
    setCreating(true);

    try {
      // Check if team conversation exists
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'team')
        .eq('team_id', selectedTeam.id)
        .single();

      if (existingConvo) {
        onChatCreated(existingConvo.id);
        onOpenChange(false);
        return;
      }

      // Create new team conversation
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({ 
          type: 'team',
          team_id: selectedTeam.id,
          name: selectedTeam.name
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('팀 채팅방이 생성되었습니다');
      onChatCreated(newConvo.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating team chat:', error);
      toast.error('채팅방 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateTeamToTeamChat = async () => {
    if (!selectedTeam || !selectedTargetTeam || !user) return;
    setCreating(true);

    try {
      // Create conversation
      const { data: newConvo, error: convoError } = await supabase
        .from('conversations')
        .insert({ 
          type: 'team_to_team',
          name: `${selectedTeam.name} ↔ ${selectedTargetTeam.name}`
        })
        .select()
        .single();

      if (convoError) throw convoError;

      // Add team participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConvo.id, team_id: selectedTeam.id },
          { conversation_id: newConvo.id, team_id: selectedTargetTeam.id }
        ]);

      if (participantsError) throw participantsError;

      toast.success('팀 간 채팅방이 생성되었습니다');
      onChatCreated(newConvo.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating team-to-team chat:', error);
      toast.error('채팅방 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyTeams = myTeams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllTeams = allTeams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    t.id !== selectedTeam?.id
  );

  const resetSelections = () => {
    setSelectedUser(null);
    setSelectedTeam(null);
    setSelectedTargetTeam(null);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetSelections(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 채팅</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetSelections(); }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct" className="gap-1">
              <MessageCircle className="h-4 w-4" />
              1:1
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1">
              <Users className="h-4 w-4" />
              팀
            </TabsTrigger>
            <TabsTrigger value="team_to_team" className="gap-1">
              <UsersRound className="h-4 w-4" />
              팀간
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

          <TabsContent value="direct" className="mt-4">
            <ScrollArea className="h-64">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse">로딩중...</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  사용자를 찾을 수 없습니다
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedUser?.id === u.id ? 'bg-primary/10' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{u.name}</p>
                        {u.primary_role && (
                          <p className="text-xs text-muted-foreground">{u.primary_role}</p>
                        )}
                      </div>
                      {selectedUser?.id === u.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <Button
              className="w-full mt-4"
              disabled={!selectedUser || creating}
              onClick={handleCreateDirectChat}
            >
              {creating ? '생성 중...' : '채팅 시작'}
            </Button>
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <ScrollArea className="h-64">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse">로딩중...</div>
                </div>
              ) : filteredMyTeams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  소속된 팀이 없습니다
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredMyTeams.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedTeam?.id === t.id ? 'bg-primary/10' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedTeam(t)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={t.emblem_url || undefined} />
                        <AvatarFallback>{t.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{t.name}</p>
                        {t.slogan && (
                          <p className="text-xs text-muted-foreground">{t.slogan}</p>
                        )}
                      </div>
                      {selectedTeam?.id === t.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <Button
              className="w-full mt-4"
              disabled={!selectedTeam || creating}
              onClick={handleNavigateToTeamChat}
            >
              {creating ? '이동 중...' : '팀 채팅으로 이동'}
            </Button>
          </TabsContent>

          <TabsContent value="team_to_team" className="mt-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">내 팀 선택</p>
                <ScrollArea className="h-24 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {myTeams.map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                          selectedTeam?.id === t.id ? 'bg-primary/10' : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedTeam(t)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={t.emblem_url || undefined} />
                          <AvatarFallback className="text-xs">{t.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{t.name}</span>
                        {selectedTeam?.id === t.id && (
                          <Check className="h-3 w-3 text-primary ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">상대 팀 선택</p>
                <ScrollArea className="h-32 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredAllTeams.map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                          selectedTargetTeam?.id === t.id ? 'bg-primary/10' : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedTargetTeam(t)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={t.emblem_url || undefined} />
                          <AvatarFallback className="text-xs">{t.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{t.name}</span>
                        {selectedTargetTeam?.id === t.id && (
                          <Check className="h-3 w-3 text-primary ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <Button
              className="w-full mt-4"
              disabled={!selectedTeam || !selectedTargetTeam || creating}
              onClick={handleCreateTeamToTeamChat}
            >
              {creating ? '생성 중...' : '팀 간 채팅 시작'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
