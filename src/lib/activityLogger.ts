import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type TargetType = 'user' | 'announcement' | 'role' | 'settings';

interface LogActivityParams {
  action: string;
  targetType: TargetType;
  targetId?: string;
  details?: Record<string, unknown>;
}

export async function logActivity({
  action,
  targetType,
  targetId,
  details,
}: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log activity: No authenticated user');
      return;
    }

    const { error } = await supabase.from('activity_logs').insert([{
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId ?? null,
      details: (details as Json) ?? null,
    }]);

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
