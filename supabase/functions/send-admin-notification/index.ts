import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  defaultBranding, 
  type EmailBranding 
} from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  action: string;
  target_type: string;
  target_id?: string;
  details?: Record<string, unknown>;
  admin_id: string;
  admin_name?: string;
}

const criticalActions = [
  'role_change',
  'user_verify',
  'user_unverify',
  'admin_role_assigned',
  'moderator_role_assigned',
];

const actionLabels: Record<string, string> = {
  role_change: '역할 변경',
  user_verify: '사용자 인증',
  user_unverify: '사용자 인증 해제',
  admin_role_assigned: '관리자 권한 부여',
  moderator_role_assigned: '중재자 권한 부여',
};

const actionIcons: Record<string, string> = {
  role_change: '🔐',
  user_verify: '✅',
  user_unverify: '❌',
  admin_role_assigned: '👑',
  moderator_role_assigned: '🛡️',
};

// Validate that the request comes from an authorized source
async function validateInternalRequest(req: Request): Promise<boolean> {
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

  // Check if the request contains a valid service role key or JWT
  const token = authHeader.replace('Bearer ', '');
  
  // Accept service role key for internal calls
  if (token === serviceRoleKey) {
    return true;
  }

  // Validate JWT for authenticated user calls
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.log("Invalid JWT token");
      return false;
    }

    // Verify user is an admin
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminSupabase.rpc('is_admin', { _user_id: user.id });
    
    if (!isAdmin) {
      console.log("User is not an admin");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating request:", error);
    return false;
  }
}

function getBaseStyles(branding: EmailBranding) {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${branding.background_color};
      margin: 0;
      padding: 20px;
      color: ${branding.text_color};
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header .subtitle {
      color: rgba(255,255,255,0.9);
      margin: 8px 0 0 0;
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 12px;
    }
    .content {
      padding: 32px 24px;
    }
    .alert-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .alert-title {
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 4px;
    }
    .alert-content {
      color: #b91c1c;
      font-size: 14px;
    }
    .detail-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .detail-table th,
    .detail-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-table th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      width: 35%;
    }
    .detail-table td {
      color: #6b7280;
    }
    .footer {
      background: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-text {
      color: #9ca3af;
      font-size: 12px;
      margin: 0;
      line-height: 1.5;
    }
    .footer-brand {
      color: #6b7280;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
  `;
}

function renderAdminNotificationEmail(
  branding: EmailBranding,
  action: string,
  adminName: string,
  details: Record<string, unknown>,
  targetType: string,
  timestamp: string
): string {
  const actionLabel = actionLabels[action] || action;
  const actionIcon = actionIcons[action] || '⚠️';

  const detailRows = Object.entries(details)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      const formattedKey = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      return `
        <tr>
          <th>${formattedKey}</th>
          <td>${String(value)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>관리자 알림: ${actionLabel}</title>
      <style>${getBaseStyles(branding)}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 관리자 활동 알림</h1>
          <p class="subtitle">중요한 관리 작업이 수행되었습니다</p>
          <span class="badge">${actionIcon} ${actionLabel}</span>
        </div>
        <div class="content">
          <div class="alert-box">
            <div class="alert-title">보안 알림</div>
            <div class="alert-content">
              이 이메일은 중요한 관리자 작업이 수행되었음을 알려드립니다.
              본인이 수행한 작업이 아닌 경우 즉시 확인해 주세요.
            </div>
          </div>
          
          <table class="detail-table">
            <tr>
              <th>작업 유형</th>
              <td>${actionLabel}</td>
            </tr>
            <tr>
              <th>수행자</th>
              <td>${adminName}</td>
            </tr>
            <tr>
              <th>대상 유형</th>
              <td>${targetType}</td>
            </tr>
            <tr>
              <th>수행 시간</th>
              <td>${timestamp}</td>
            </tr>
            ${detailRows}
          </table>
        </div>
        <div class="footer">
          <div class="footer-brand">${branding.brand_name}</div>
          <p class="footer-text">
            이 알림은 시스템 보안을 위해 자동으로 발송됩니다.<br>
            의심스러운 활동이 발견되면 즉시 조사해 주세요.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-admin-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate that request comes from authorized source
  const isAuthorized = await validateInternalRequest(req);
  if (!isAuthorized) {
    console.log("Unauthorized request rejected");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestData: AdminNotificationRequest = await req.json();
    const { action, target_type, target_id, details, admin_id, admin_name } = requestData;
    
    console.log("Request data:", { action, target_type, target_id, admin_id });

    // Check if this is a critical action
    if (!criticalActions.includes(action)) {
      console.log(`Action ${action} is not critical, skipping notification`);
      return new Response(
        JSON.stringify({ message: "Non-critical action, no notification sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all admin users to notify
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ message: "No admin users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin profiles with email
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", adminUserIds);

    if (profilesError || !adminProfiles) {
      console.error("Error fetching admin profiles:", profilesError);
      throw new Error("Failed to fetch admin profiles");
    }

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

    // Get performing admin's name if not provided
    let performingAdminName = admin_name;
    if (!performingAdminName) {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", admin_id)
        .single();
      performingAdminName = adminProfile?.name || "Unknown Admin";
    }

    const timestamp = new Date().toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Seoul'
    });

    // Send email to all admins
    const emailPromises = adminProfiles.map(async (profile) => {
      const emailHtml = renderAdminNotificationEmail(
        branding,
        action,
        performingAdminName!,
        details || {},
        target_type,
        timestamp
      );

      console.log(`Sending admin notification to: ${profile.email}`);

      return resend.emails.send({
        from: `${branding.brand_name} <onboarding@resend.dev>`,
        to: [profile.email],
        subject: `🚨 [관리자 알림] ${actionLabels[action] || action}`,
        html: emailHtml,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    console.log(`Admin notifications sent: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Notifications sent to ${successCount} admins`,
        success: successCount,
        failed: failedCount 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in send-admin-notification function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
