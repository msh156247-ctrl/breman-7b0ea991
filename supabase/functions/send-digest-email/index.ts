import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  renderDigestEmail, 
  defaultBranding,
  type EmailBranding 
} from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestRequest {
  digest_type: 'daily' | 'weekly';
  test_user_id?: string; // Optional: for testing a specific user immediately
}

// Validate that the request comes from an authorized source (cron or service role)
function validateInternalRequest(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    console.log("No authorization header provided");
    return false;
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    console.error("Service role key not configured");
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Accept service role key for internal/cron calls
  if (token === serviceRoleKey) {
    return true;
  }

  console.log("Invalid authorization token");
  return false;
}

// Timezone offset map (in hours, negative for behind UTC)
const timezoneOffsets: Record<string, number> = {
  'Pacific/Auckland': 12,
  'Australia/Sydney': 10,
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
  'Europe/Berlin': 1,
  'Europe/Paris': 1,
  'Europe/London': 0,
  'America/Sao_Paulo': -3,
  'America/New_York': -5,
  'America/Chicago': -6,
  'America/Denver': -7,
  'America/Los_Angeles': -8,
};

function getLocalTime(timezone: string): { hour: number; dayOfWeek: number } {
  const now = new Date();
  const offset = timezoneOffsets[timezone] ?? 9;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utcTime + (offset * 3600000));
  
  return {
    hour: localTime.getUTCHours(),
    dayOfWeek: localTime.getUTCDay(),
  };
}

// Generate secure unsubscribe token using HMAC
const HMAC_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret-key";

async function generateSecureToken(userId: string, type?: string): Promise<string> {
  const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  const data = type ? `${userId}:${type}:${expiresAt}` : `${userId}::${expiresAt}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(HMAC_SECRET);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hmac = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return btoa(`${data}:${hmac}`);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Digest email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authorization
  if (!validateInternalRequest(req)) {
    console.log("Unauthorized request rejected");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { digest_type, test_user_id } = await req.json() as DigestRequest;
    console.log(`Processing ${digest_type} digest emails${test_user_id ? ` for test user ${test_user_id}` : ''}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch branding settings
    let branding: EmailBranding = defaultBranding;
    const { data: brandingData, error: brandingError } = await supabase
      .from("email_branding")
      .select("*")
      .limit(1)
      .single();

    if (!brandingError && brandingData) {
      branding = brandingData as EmailBranding;
    }
    console.log("Using branding:", branding.brand_name);

    // Build query for users with digest enabled
    let query = supabase
      .from("notification_preferences")
      .select("user_id, digest_time, digest_day, timezone, last_digest_sent_at");

    if (test_user_id) {
      query = query.eq("user_id", test_user_id);
    } else {
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
        
        const preferredHour = parseInt(userPref.digest_time?.split(':')[0] || '9');
        
        if (localHour !== preferredHour) {
          console.log(`Skipping user ${userPref.user_id}: local hour is ${localHour}, preferred is ${preferredHour} (${userTimezone})`);
          continue;
        }

        if (digest_type === 'weekly') {
          const userDigestDay = userPref.digest_day ?? 1;
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

        // Build digest email content - notifications comes from the join
        interface NotificationData {
          id: string;
          title: string;
          message: string | null;
          type: string | null;
          link: string | null;
          created_at: string | null;
        }
        
        const rawNotifications: NotificationData[] = [];
        for (const pn of pendingNotifications) {
          const notif = pn.notifications as unknown as NotificationData | null;
          if (notif) {
            rawNotifications.push(notif);
          }
        }

        if (rawNotifications.length === 0) {
          continue;
        }

        const digestTitle = digest_type === 'daily' ? '일일 알림 요약' : '주간 알림 요약';

        // Generate secure unsubscribe links with HMAC
        const unsubscribeToken = await generateSecureToken(userPref.user_id);
        const unsubscribeAllUrl = `${supabaseUrl}/functions/v1/email-unsubscribe?token=${unsubscribeToken}`;
        const viewAllUrl = `https://kazkjbkldqxjdnzgiaqp.lovableproject.com/notifications`;

        // Map notifications to expected format
        const formattedNotifications = rawNotifications.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message || '',
          type: n.type || 'system',
          link: n.link || null,
          created_at: n.created_at || new Date().toISOString(),
        }));

        const emailHtml = renderDigestEmail({
          branding,
          userName: profile.name,
          digestType: digest_type,
          notifications: formattedNotifications,
          unsubscribeAllUrl,
          viewAllUrl,
        });

        // Send email
        const emailResponse = await resend.emails.send({
          from: `${branding.brand_name} <onboarding@resend.dev>`,
          to: [profile.email],
          subject: `[${digestTitle}] ${rawNotifications.length}개의 새 알림`,
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
          notifications_count: rawNotifications.length,
          status: "sent",
        });

      } catch (userError) {
        console.error(`Error processing user ${userPref.user_id}:`, userError);
        results.push({
          user_id: userPref.user_id,
          status: "error",
          error: (userError as Error).message,
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

  } catch (error) {
    console.error("Error in send-digest-email function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
