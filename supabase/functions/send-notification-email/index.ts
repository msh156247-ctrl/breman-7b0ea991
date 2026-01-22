import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  renderNotificationEmail, 
  defaultBranding, 
  notificationTypeLabels,
  type EmailBranding 
} from "../_shared/email-templates.ts";

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

// HMAC secret for secure token generation
const HMAC_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret-key";

// Generate secure unsubscribe token using HMAC (matching send-digest-email)
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

// Validate that request comes from internal sources only (service role or database trigger)
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
  
  // Accept service role key for internal/trigger calls
  if (token === serviceRoleKey) {
    return true;
  }

  console.log("Invalid authorization token - not service role");
  return false;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate that request is from internal source only
  if (!validateInternalRequest(req)) {
    console.log("Unauthorized request rejected");
    return new Response(
      JSON.stringify({ error: "Unauthorized - this endpoint is for internal use only" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(
      supabaseUrl,
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

    const typeLabel = notificationTypeLabels[notification_type] || notification_type;
    
    // Generate secure unsubscribe links with HMAC
    const unsubscribeToken = await generateSecureToken(user_id, notification_type);
    const unsubscribeAllToken = await generateSecureToken(user_id);
    const unsubscribeTypeUrl = `${supabaseUrl}/functions/v1/email-unsubscribe?token=${unsubscribeToken}&type=${notification_type}`;
    const unsubscribeAllUrl = `${supabaseUrl}/functions/v1/email-unsubscribe?token=${unsubscribeAllToken}`;
    
    const emailHtml = renderNotificationEmail({
      branding,
      userName: profile.name,
      notificationType: notification_type,
      title,
      message,
      link,
      unsubscribeTypeUrl,
      unsubscribeAllUrl,
    });

    console.log("Sending email to:", profile.email);

    const emailResponse = await resend.emails.send({
      from: `${branding.brand_name} <onboarding@resend.dev>`,
      to: [profile.email],
      subject: `[${typeLabel}] ${title}`,
      html: emailHtml,
      headers: {
        "List-Unsubscribe": `<${unsubscribeAllUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
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
