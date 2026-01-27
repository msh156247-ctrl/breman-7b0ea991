import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  user_id: string;
  user_name: string;
}

interface UseTypingIndicatorProps {
  conversationId: string | undefined;
  userId: string | undefined;
  userName: string | undefined;
}

export function useTypingIndicator({ conversationId, userId, userName }: UseTypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase.channel(`typing-${conversationId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];

        Object.values(state).forEach((presenceList) => {
          (presenceList as any[]).forEach((presence) => {
            if (presence.typing && presence.user_id !== userId) {
              users.push({
                user_id: presence.user_id,
                user_name: presence.user_name,
              });
            }
          });
        });

        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            user_name: userName || '사용자',
            typing: false,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, userId, userName]);

  const stopTyping = useCallback(async () => {
    if (!channelRef.current || !userId) return;

    isTypingRef.current = false;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    await channelRef.current.track({
      user_id: userId,
      user_name: userName || '사용자',
      typing: false,
    });
  }, [userId, userName]);

  const startTyping = useCallback(async () => {
    if (!channelRef.current || !userId || isTypingRef.current) return;

    isTypingRef.current = true;

    await channelRef.current.track({
      user_id: userId,
      user_name: userName || '사용자',
      typing: true,
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [userId, userName, stopTyping]);

  const handleInputChange = useCallback(() => {
    startTyping();
  }, [startTyping]);

  return {
    typingUsers,
    handleInputChange,
    stopTyping,
  };
}
