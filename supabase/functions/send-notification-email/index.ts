import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  link?: string;
}

const notificationTypeLabels: Record<string, string> = {
  contract: "계약",
  project: "프로젝트",
  team: "팀",
  payment: "결제",
  dispute: "분쟁",
  review: "리뷰",
  siege: "시즈",
  badge: "뱃지",
  system: "시스템",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id, notification_type, title, message, link }: NotificationEmailRequest = await req.json();
    console.log("Request data:", { user_id, notification_type, title });

    // Get user profile to get email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check user's notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single();

    // If no preferences exist, use defaults (most are true)
    const prefKey = `email_${notification_type}` as keyof typeof preferences;
    const shouldSendEmail = preferences ? preferences[prefKey] !== false : true;

    if (!shouldSendEmail) {
      console.log(`User has disabled email notifications for type: ${notification_type}`);
      return new Response(
        JSON.stringify({ message: "Email notifications disabled for this type" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const typeLabel = notificationTypeLabels[notification_type] || notification_type;
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "";
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .badge { display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; margin-top: 8px; }
            .content { padding: 32px 24px; }
            .title { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 12px; }
            .message { color: #6b7280; line-height: 1.6; margin-bottom: 24px; }
            .button { display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; }
            .footer { background: #f9fafb; padding: 16px 24px; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>새로운 알림</h1>
              <span class="badge">${typeLabel}</span>
            </div>
            <div class="content">
              <div class="title">${title}</div>
              <div class="message">${message || ""}</div>
              ${link ? `<a href="${link}" class="button">자세히 보기</a>` : ""}
            </div>
            <div class="footer">
              이 이메일은 알림 설정에 따라 발송되었습니다.<br>
              설정에서 이메일 알림을 변경할 수 있습니다.
            </div>
          </div>
        </body>
      </html>
    `;

    console.log("Sending email to:", profile.email);

    const emailResponse = await resend.emails.send({
      from: "Lovable App <onboarding@resend.dev>",
      to: [profile.email],
      subject: `[${typeLabel}] ${title}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
