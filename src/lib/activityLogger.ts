import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type TargetType = 'user' | 'announcement' | 'role' | 'settings';

// Actions that trigger email notifications to admins
const criticalActions = [
  'role_change',
  'user_verify',
  'user_unverify',
  'admin_role_assigned',
  'moderator_role_assigned',
];

interface LogActivityParams {
  action: string;
  targetType: TargetType;
  targetId?: string;
  details?: Record<string, unknown>;
}

async function sendAdminNotification(
  action: string,
  targetType: TargetType,
  targetId: string | undefined,
  details: Record<string, unknown> | undefined,
  adminId: string
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-admin-notification', {
      body: {
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        admin_id: adminId,
      },
    });

    if (error) {
      console.error('Failed to send admin notification:', error);
    }
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
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

    // Send email notification for critical actions (non-blocking)
    if (criticalActions.includes(action)) {
      sendAdminNotification(action, targetType, targetId, details, user.id);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
