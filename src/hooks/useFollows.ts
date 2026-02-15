import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FollowUser {
  id: string; // follow record id
  userId: string; // the followed/follower user id
  name: string;
  avatar_url: string | null;
  primary_role: string | null;
}

export function useFollows() {
  const { user } = useAuth();
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollows = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch who I follow
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('id, following_id')
        .eq('follower_id', user.id);

      if (followingError) throw followingError;

      // Fetch who follows me
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select('id, follower_id')
        .eq('following_id', user.id);

      if (followersError) throw followersError;

      const followingIds = followingData?.map(f => f.following_id) || [];
      const followerIds = followersData?.map(f => f.follower_id) || [];
      const allIds = [...new Set([...followingIds, ...followerIds])];

      if (allIds.length === 0) {
        setFollowing([]);
        setFollowers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, primary_role')
        .in('id', allIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setFollowing((followingData || []).map(f => {
        const p = profileMap.get(f.following_id);
        return {
          id: f.id,
          userId: f.following_id,
          name: p?.name || '사용자',
          avatar_url: p?.avatar_url || null,
          primary_role: p?.primary_role || null,
        };
      }));

      setFollowers((followersData || []).map(f => {
        const p = profileMap.get(f.follower_id);
        return {
          id: f.id,
          userId: f.follower_id,
          name: p?.name || '사용자',
          avatar_url: p?.avatar_url || null,
          primary_role: p?.primary_role || null,
        };
      }));
    } catch (error) {
      console.error('Error fetching follows:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFollows();
  }, [fetchFollows]);

  const follow = async (targetUserId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId });

      if (error) {
        if (error.code === '23505') {
          toast.info('이미 팔로우하고 있습니다');
          return false;
        }
        throw error;
      }
      toast.success('팔로우했습니다');
      fetchFollows();
      return true;
    } catch (error) {
      console.error('Error following:', error);
      toast.error('팔로우에 실패했습니다');
      return false;
    }
  };

  const unfollow = async (targetUserId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) throw error;
      toast.success('팔로우를 취소했습니다');
      fetchFollows();
      return true;
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast.error('팔로우 취소에 실패했습니다');
      return false;
    }
  };

  const isFollowing = useCallback((targetUserId: string): boolean => {
    return following.some(f => f.userId === targetUserId);
  }, [following]);

  return {
    following,
    followers,
    loading,
    follow,
    unfollow,
    isFollowing,
    refetch: fetchFollows,
  };
}
