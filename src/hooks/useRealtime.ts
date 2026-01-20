import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'teams' | 'projects' | 'team_memberships' | 'project_proposals' | 'contracts' | 'sieges';

interface UseRealtimeOptions {
  table: TableName;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channelName = `realtime-${table}-${filter || 'all'}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          onChange?.(payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, filter, onInsert, onUpdate, onDelete, onChange]);

  return channelRef.current;
}

// Hook specifically for teams list
export function useRealtimeTeams(onUpdate: () => void) {
  useRealtime({
    table: 'teams',
    onChange: onUpdate,
  });

  useRealtime({
    table: 'team_memberships',
    onChange: onUpdate,
  });
}

// Hook specifically for projects list
export function useRealtimeProjects(onUpdate: () => void) {
  useRealtime({
    table: 'projects',
    onChange: onUpdate,
  });

  useRealtime({
    table: 'project_proposals',
    onChange: onUpdate,
  });
}

// Hook for dashboard data
export function useRealtimeDashboard(onUpdate: () => void) {
  useRealtime({
    table: 'teams',
    onChange: onUpdate,
  });

  useRealtime({
    table: 'projects',
    onChange: onUpdate,
  });

  useRealtime({
    table: 'sieges',
    onChange: onUpdate,
  });

  useRealtime({
    table: 'contracts',
    onChange: onUpdate,
  });
}
