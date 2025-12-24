import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivityLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface AdminProfile {
  id: string;
  name: string;
  email: string;
}

const actionLabels: Record<string, string> = {
  'role_change': '역할 변경',
  'user_verify': '사용자 인증',
  'user_unverify': '인증 해제',
  'verify_user': '사용자 인증',
  'unverify_user': '인증 해제',
  'create_announcement': '공지 생성',
  'update_announcement': '공지 수정',
  'delete_announcement': '공지 삭제',
  'toggle_announcement': '공지 상태 변경',
};

const targetTypeLabels: Record<string, string> = {
  'user': '사용자',
  'announcement': '공지사항',
  'role': '역할',
  'settings': '설정',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul'
  });
}

function generateReportHtml(
  logs: ActivityLog[],
  adminProfiles: Record<string, AdminProfile>,
  reportType: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date
): string {
  const reportTitles: Record<string, string> = {
    daily: '일일 활동 보고서',
    weekly: '주간 활동 보고서',
    monthly: '월간 활동 보고서',
  };
  const reportTitle = reportTitles[reportType] || '활동 보고서';
  const periodText = reportType === 'daily' 
    ? startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : `${startDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`;

  // Group logs by action type for summary
  const actionCounts: Record<string, number> = {};
  logs.forEach(log => {
    const action = actionLabels[log.action] || log.action;
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  });

  // Group logs by admin for summary
  const adminCounts: Record<string, { name: string; count: number }> = {};
  logs.forEach(log => {
    if (log.admin_id && adminProfiles[log.admin_id]) {
      const admin = adminProfiles[log.admin_id];
      if (!adminCounts[log.admin_id]) {
        adminCounts[log.admin_id] = { name: admin.name, count: 0 };
      }
      adminCounts[log.admin_id].count++;
    }
  });

  const summaryRows = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([action, count]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${action}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${count}</td>
      </tr>
    `).join('');

  const adminSummaryRows = Object.values(adminCounts)
    .sort((a, b) => b.count - a.count)
    .map(({ name, count }) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${count}</td>
      </tr>
    `).join('');

  const logRows = logs.slice(0, 50).map(log => {
    const admin = log.admin_id ? adminProfiles[log.admin_id] : null;
    const actionLabel = actionLabels[log.action] || log.action;
    const targetLabel = targetTypeLabels[log.target_type] || log.target_type;
    
    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; white-space: nowrap;">${formatDate(log.created_at)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${admin?.name || '알 수 없음'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
          <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px;">${actionLabel}</span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${targetLabel}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
          ${log.details ? Object.entries(log.details).slice(0, 2).map(([k, v]) => `${k}: ${String(v).substring(0, 30)}`).join(', ') : '-'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportTitle}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">📊 ${reportTitle}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${periodText}</p>
          <span style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-top: 12px;">
            총 ${logs.length}개의 활동
          </span>
        </div>

        <!-- Summary Section -->
        <div style="padding: 24px;">
          <div style="display: flex; gap: 24px; flex-wrap: wrap;">
            <!-- Action Summary -->
            <div style="flex: 1; min-width: 200px;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">📋 작업 유형별 요약</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">작업</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">횟수</th>
                  </tr>
                </thead>
                <tbody>
                  ${summaryRows || '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #9ca3af;">활동 없음</td></tr>'}
                </tbody>
              </table>
            </div>

            <!-- Admin Summary -->
            <div style="flex: 1; min-width: 200px;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">👤 관리자별 활동</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">관리자</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">활동 수</th>
                  </tr>
                </thead>
                <tbody>
                  ${adminSummaryRows || '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #9ca3af;">활동 없음</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Detailed Logs -->
        <div style="padding: 0 24px 24px 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">📝 상세 활동 로그 ${logs.length > 50 ? '(최근 50개)' : ''}</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #6366f1;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: white; font-weight: 600;">날짜</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: white; font-weight: 600;">관리자</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: white; font-weight: 600;">작업</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: white; font-weight: 600;">대상</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: white; font-weight: 600;">세부 정보</th>
                </tr>
              </thead>
              <tbody>
                ${logRows || '<tr><td colspan="5" style="padding: 24px; text-align: center; color: #9ca3af;">이 기간에 활동이 없습니다</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            이 보고서는 자동으로 생성되어 발송됩니다.<br>
            보고서 생성 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

interface ScheduleSettings {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  delivery_hour: number;
  delivery_minute: number;
  weekly_day: number;
  monthly_day: number;
  is_enabled: boolean;
  timezone: string;
}

function shouldSendReport(settings: ScheduleSettings, now: Date): boolean {
  if (!settings.is_enabled) {
    console.log("Report sending is disabled");
    return false;
  }

  // Convert to KST (Asia/Seoul is UTC+9)
  const kstOffset = 9 * 60; // minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const kstMinutes = (utcMinutes + kstOffset) % (24 * 60);
  const kstHour = Math.floor(kstMinutes / 60);
  const kstDay = new Date(now.getTime() + kstOffset * 60 * 1000).getUTCDay();
  const kstDate = new Date(now.getTime() + kstOffset * 60 * 1000).getUTCDate();

  // Check if current hour matches delivery hour (we run hourly)
  if (kstHour !== settings.delivery_hour) {
    console.log(`Not delivery hour. Current: ${kstHour}, Expected: ${settings.delivery_hour}`);
    return false;
  }

  // Check frequency-specific conditions
  if (settings.frequency === 'daily') {
    return true;
  } else if (settings.frequency === 'weekly') {
    if (kstDay !== settings.weekly_day) {
      console.log(`Not delivery day. Current: ${kstDay}, Expected: ${settings.weekly_day}`);
      return false;
    }
    return true;
  } else if (settings.frequency === 'monthly') {
    if (kstDate !== settings.monthly_day) {
      console.log(`Not delivery date. Current: ${kstDate}, Expected: ${settings.monthly_day}`);
      return false;
    }
    return true;
  }

  return false;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-activity-report function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    let forceType: 'daily' | 'weekly' | 'monthly' | null = null;
    let isScheduledRun = false;
    try {
      const body = await req.json();
      if (body.report_type) {
        forceType = body.report_type;
      }
      if (body.scheduled === true) {
        isScheduledRun = true;
      }
    } catch {
      // No body, assume scheduled run
      isScheduledRun = true;
    }

    // Fetch schedule settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('report_schedule_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error("Error fetching schedule settings:", settingsError);
      throw new Error("Failed to fetch schedule settings");
    }

    const settings = settingsData as ScheduleSettings;
    const now = new Date();

    // If this is a scheduled run, check if we should send based on settings
    if (isScheduledRun && !forceType) {
      if (!shouldSendReport(settings, now)) {
        console.log("Skipping report - not time to send based on schedule settings");
        return new Response(
          JSON.stringify({ message: "Not scheduled to send at this time", skipped: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Determine report type from settings or force type
    const reportType = forceType || settings.frequency;

    // Calculate date range based on frequency
    const endDate = new Date(now);
    let startDate: Date;
    
    if (reportType === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else if (reportType === 'monthly') {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
    }

    console.log(`Generating ${reportType} report from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch activity logs for the period
    const { data: logs, error: logsError } = await supabase
      .from('activity_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error("Error fetching logs:", logsError);
      throw new Error("Failed to fetch activity logs");
    }

    console.log(`Found ${logs?.length || 0} activity logs`);

    // Get unique admin IDs
    const adminIds = [...new Set((logs || []).map(log => log.admin_id).filter(Boolean))] as string[];
    
    // Fetch admin profiles
    let adminProfiles: Record<string, AdminProfile> = {};
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', adminIds);
      
      if (profiles) {
        adminProfiles = profiles.reduce((acc, p) => ({
          ...acc,
          [p.id]: p
        }), {});
      }
    }

    // Get all admin users to send the report to
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to send report to");
      return new Response(
        JSON.stringify({ message: "No admin users to send report to" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminEmails, error: emailsError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('id', adminUserIds);

    if (emailsError || !adminEmails) {
      console.error("Error fetching admin emails:", emailsError);
      throw new Error("Failed to fetch admin emails");
    }

    // Fetch branding
    let brandName = 'Lovable App';
    const { data: brandingData } = await supabase
      .from('email_branding')
      .select('brand_name')
      .limit(1)
      .single();
    
    if (brandingData) {
      brandName = brandingData.brand_name;
    }

    // Generate report HTML
    const reportHtml = generateReportHtml(
      logs || [],
      adminProfiles,
      reportType,
      startDate,
      endDate
    );

    // Send email to all admins
    const reportTitles: Record<string, string> = { daily: '일일 활동 보고서', weekly: '주간 활동 보고서', monthly: '월간 활동 보고서' };
    const reportTitle = reportTitles[reportType] || '활동 보고서';
    const emailPromises = adminEmails.map(async (admin) => {
      console.log(`Sending ${reportType} report to: ${admin.email}`);

      return resend.emails.send({
        from: `${brandName} <onboarding@resend.dev>`,
        to: [admin.email],
        subject: `📊 [${brandName}] ${reportTitle} - ${(logs || []).length}개의 활동`,
        html: reportHtml,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    console.log(`Activity report sent: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: `${reportType} report sent to ${successCount} admins`,
        logs_count: logs?.length || 0,
        success: successCount,
        failed: failedCount 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-activity-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
