import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Friend {
  id: string;
  friendId: string;
  name: string;
  avatar_url: string | null;
  primary_role: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  isSentByMe: boolean;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch all friendships where user is involved
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      // Get all unique friend IDs
      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      if (friendIds.length === 0) {
        setFriends([]);
        setPendingRequests([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for all friends
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, primary_role')
        .in('id', friendIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const allFriends: Friend[] = (friendships || []).map(f => {
        const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
        const profile = profileMap.get(friendId);
        
        return {
          id: f.id,
          friendId,
          name: profile?.name || '사용자',
          avatar_url: profile?.avatar_url || null,
          primary_role: profile?.primary_role || null,
          status: f.status as 'pending' | 'accepted' | 'rejected',
          isSentByMe: f.user_id === user.id,
        };
      });

      setFriends(allFriends.filter(f => f.status === 'accepted'));
      setPendingRequests(allFriends.filter(f => f.status === 'pending'));
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return false;

    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'accepted') {
          toast.info('이미 친구입니다');
        } else if (existing.status === 'pending') {
          toast.info('이미 친구 요청을 보냈거나 받았습니다');
        } else {
          // Re-send if rejected
          const { error } = await supabase
            .from('friendships')
            .update({ status: 'pending', user_id: user.id, friend_id: friendId })
            .eq('id', existing.id);

          if (error) throw error;
          toast.success('친구 요청을 다시 보냈습니다');
          fetchFriends();
        }
        return false;
      }

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        });

      if (error) throw error;
      toast.success('친구 요청을 보냈습니다');
      fetchFriends();
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('친구 요청 전송에 실패했습니다');
      return false;
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('친구 요청을 수락했습니다');
      fetchFriends();
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('친구 요청 수락에 실패했습니다');
      return false;
    }
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'rejected' })
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('친구 요청을 거절했습니다');
      fetchFriends();
      return true;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('친구 요청 거절에 실패했습니다');
      return false;
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('친구를 삭제했습니다');
      fetchFriends();
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('친구 삭제에 실패했습니다');
      return false;
    }
  };

  const getFriendshipStatus = useCallback((targetUserId: string): 'none' | 'pending_sent' | 'pending_received' | 'accepted' => {
    const allFriendships = [...friends, ...pendingRequests];
    const friendship = allFriendships.find(f => f.friendId === targetUserId);
    
    if (!friendship) return 'none';
    if (friendship.status === 'accepted') return 'accepted';
    if (friendship.status === 'pending') {
      return friendship.isSentByMe ? 'pending_sent' : 'pending_received';
    }
    return 'none';
  }, [friends, pendingRequests]);

  return {
    friends,
    pendingRequests,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriendshipStatus,
    refetch: fetchFriends,
  };
}
