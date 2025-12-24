import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestRequest {
  digest_type: 'daily' | 'weekly';
  test_user_id?: string; // Optional: for testing a specific user immediately
}

const notificationTypeLabels: Record<string, string> = {
  team_invite: '팀 초대',
  application: '지원',
  project_match: '프로젝트 매칭',
  milestone: '마일스톤',
  siege: 'Siege',
  system: '시스템',
};

// Timezone offset map (in hours, negative for behind UTC)
const timezoneOffsets: Record<string, number> = {
  'Pacific/Auckland': 12, // NZST (can be +13 in summer)
  'Australia/Sydney': 10, // AEST (can be +11 in summer)
  'Asia/Seoul': 9,
  'Asia/Tokyo': 9,
  'Asia/Shanghai': 8,
  'Asia/Singapore': 8,
  'Asia/Hong_Kong': 8,
  'Asia/Bangkok': 7,
  'Asia/Kolkata': 5.5,
  'Asia/Dubai': 4,
  'Europe/Moscow': 3,
  'Europe/Istanbul': 3,
  'Europe/Berlin': 1, // CET (can be +2 in summer)
  'Europe/Paris': 1, // CET (can be +2 in summer)
  'Europe/London': 0, // GMT (can be +1 in summer)
  'America/Sao_Paulo': -3,
  'America/New_York': -5, // EST (can be -4 in summer)
  'America/Chicago': -6, // CST (can be -5 in summer)
  'America/Denver': -7, // MST (can be -6 in summer)
  'America/Los_Angeles': -8, // PST (can be -7 in summer)
};

function getLocalTime(timezone: string): { hour: number; dayOfWeek: number } {
  const now = new Date();
  const offset = timezoneOffsets[timezone] ?? 9; // Default to Seoul
  
  // Create a date adjusted to the user's timezone
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utcTime + (offset * 3600000));
  
  return {
    hour: localTime.getUTCHours(),
    dayOfWeek: localTime.getUTCDay(),
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Digest email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { digest_type, test_user_id } = await req.json() as DigestRequest;
    console.log(`Processing ${digest_type} digest emails${test_user_id ? ` for test user ${test_user_id}` : ''}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query for users with digest enabled
    let query = supabase
      .from("notification_preferences")
      .select("user_id, digest_time, digest_day, timezone, last_digest_sent_at");

    if (test_user_id) {
      // For testing: get specific user regardless of digest mode
      query = query.eq("user_id", test_user_id);
    } else {
      // Normal operation: get users with this digest type
      query = query.eq("digest_mode", digest_type);
    }

    const { data: usersWithDigest, error: usersError } = await query;

    if (usersError) {
      console.error("Error fetching users with digest preference:", usersError);
      throw usersError;
    }

    console.log(`Found ${usersWithDigest?.length || 0} users to process`);

    const results = [];

    for (const userPref of usersWithDigest || []) {
      // Skip time/day checks for test mode
      if (!test_user_id) {
        const userTimezone = userPref.timezone || 'Asia/Seoul';
        const { hour: localHour, dayOfWeek: localDay } = getLocalTime(userTimezone);
        
        // Parse user's preferred digest time (e.g., "09:00:00" -> 9)
        const preferredHour = parseInt(userPref.digest_time?.split(':')[0] || '9');
        
        // Check if it's the right hour in user's timezone
        if (localHour !== preferredHour) {
          console.log(`Skipping user ${userPref.user_id}: local hour is ${localHour}, preferred is ${preferredHour} (${userTimezone})`);
          continue;
        }

        // For weekly digests, check if today matches the user's selected day in their timezone
        if (digest_type === 'weekly') {
          const userDigestDay = userPref.digest_day ?? 1; // Default to Monday
          if (localDay !== userDigestDay) {
            console.log(`Skipping user ${userPref.user_id}: local day is ${localDay}, preferred is ${userDigestDay}`);
            continue;
          }
        }
      }
      try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("id", userPref.user_id)
          .single();

        if (profileError || !profile?.email) {
          console.log(`Skipping user ${userPref.user_id}: no profile or email`);
          continue;
        }

        // Get pending notifications for this user
        const { data: pendingNotifications, error: pendingError } = await supabase
          .from("pending_digest_notifications")
          .select(`
            id,
            notification_id,
            notifications (
              id,
              title,
              message,
              type,
              link,
              created_at
            )
          `)
          .eq("user_id", userPref.user_id);

        if (pendingError) {
          console.error(`Error fetching pending notifications for user ${userPref.user_id}:`, pendingError);
          continue;
        }

        if (!pendingNotifications || pendingNotifications.length === 0) {
          console.log(`No pending notifications for user ${userPref.user_id}`);
          continue;
        }

        console.log(`Found ${pendingNotifications.length} pending notifications for user ${userPref.user_id}`);

        // Build digest email content
        const notifications = pendingNotifications
          .map(pn => pn.notifications)
          .filter(n => n !== null);

        if (notifications.length === 0) {
          continue;
        }

        const digestTitle = digest_type === 'daily' ? '일일 알림 요약' : '주간 알림 요약';
        const periodText = digest_type === 'daily' ? '오늘' : '이번 주';

        // Generate unsubscribe links
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const unsubscribeToken = btoa(userPref.user_id);
        const unsubscribeAllUrl = `${supabaseUrl}/functions/v1/email-unsubscribe?token=${unsubscribeToken}`;

        const notificationItems = notifications.map((n: any) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${n.title}</div>
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">${n.message || ''}</div>
              <div style="display: flex; gap: 8px; font-size: 12px; color: #9ca3af;">
                <span>${notificationTypeLabels[n.type] || n.type}</span>
                <span>•</span>
                <span>${new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </td>
          </tr>
        `).join('');

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">${digestTitle}</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">안녕하세요, ${profile.name}님!</p>
              </div>
              <div style="background: white; padding: 24px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="color: #4b5563; margin-bottom: 20px;">${periodText} 받으신 알림이 ${notifications.length}개 있습니다:</p>
                <table style="width: 100%; border-collapse: collapse;">
                  ${notificationItems}
                </table>
                <div style="text-align: center; margin-top: 24px;">
                  <a href="https://kazkjbkldqxjdnzgiaqp.lovableproject.com/notifications" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                    모든 알림 보기
                  </a>
                </div>
              </div>
              <div style="text-align: center; padding: 16px; border-top: 1px solid #e5e7eb; margin-top: 16px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                  알림 설정은 프로필에서 변경하실 수 있습니다.
                </p>
                <a href="${unsubscribeAllUrl}" style="color: #6b7280; font-size: 12px; text-decoration: underline;">
                  모든 알림 이메일 수신 거부
                </a>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email
        const emailResponse = await resend.emails.send({
          from: "알림 <onboarding@resend.dev>",
          to: [profile.email],
          subject: `[${digestTitle}] ${notifications.length}개의 새 알림`,
          html: emailHtml,
          headers: {
            "List-Unsubscribe": `<${unsubscribeAllUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

        console.log(`Digest email sent to ${profile.email}:`, emailResponse);

        // Delete pending notifications
        const pendingIds = pendingNotifications.map(pn => pn.id);
        const { error: deleteError } = await supabase
          .from("pending_digest_notifications")
          .delete()
          .in("id", pendingIds);

        if (deleteError) {
          console.error(`Error deleting pending notifications:`, deleteError);
        }

        // Update last_digest_sent_at
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: new Date().toISOString() })
          .eq("user_id", userPref.user_id);

        results.push({
          user_id: userPref.user_id,
          email: profile.email,
          notifications_count: notifications.length,
          status: "sent",
        });

      } catch (userError: any) {
        console.error(`Error processing user ${userPref.user_id}:`, userError);
        results.push({
          user_id: userPref.user_id,
          status: "error",
          error: userError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-digest-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
