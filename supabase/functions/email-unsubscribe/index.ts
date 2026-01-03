import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnsubscribeRequest {
  token: string;
  type?: string;
}

// HMAC-based secure token generation and verification
const HMAC_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret-key";

async function generateHmac(data: string): Promise<string> {
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
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyHmac(data: string, providedHmac: string): Promise<boolean> {
  const expectedHmac = await generateHmac(data);
  // Timing-safe comparison
  if (expectedHmac.length !== providedHmac.length) return false;
  let result = 0;
  for (let i = 0; i < expectedHmac.length; i++) {
    result |= expectedHmac.charCodeAt(i) ^ providedHmac.charCodeAt(i);
  }
  return result === 0;
}

// Secure token format: base64(userId:type:expiresAt:hmac)
// Token expires after 7 days
async function generateSecureToken(userId: string, type?: string): Promise<string> {
  const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  const data = type ? `${userId}:${type}:${expiresAt}` : `${userId}::${expiresAt}`;
  const hmac = await generateHmac(data);
  return btoa(`${data}:${hmac}`);
}

async function decodeSecureToken(token: string): Promise<{ userId: string; type?: string } | null> {
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    
    if (parts.length !== 4) {
      // Try legacy format for backward compatibility (userId:type)
      if (parts.length === 2) {
        // Legacy tokens are no longer valid - security upgrade
        console.log("Legacy token format rejected for security reasons");
        return null;
      }
      return null;
    }
    
    const [userId, type, expiresAtStr, hmac] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    
    // Check expiration
    if (Date.now() > expiresAt) {
      console.log("Token expired");
      return null;
    }
    
    // Verify HMAC signature
    const data = type ? `${userId}:${type}:${expiresAtStr}` : `${userId}::${expiresAtStr}`;
    const isValid = await verifyHmac(data, hmac);
    
    if (!isValid) {
      console.log("Invalid token signature");
      return null;
    }
    
    return { userId, type: type || undefined };
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
  }
}

// Export for use by other functions (email templates)
export { generateSecureToken };

const handler = async (req: Request): Promise<Response> => {
  console.log("email-unsubscribe function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Handle GET request (direct link click)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    if (!token) {
      return new Response(getHtmlResponse("오류", "잘못된 요청입니다.", false), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
      });
    }

    const decoded = await decodeSecureToken(token);
    if (!decoded) {
      return new Response(getHtmlResponse("오류", "유효하지 않거나 만료된 링크입니다. 새로운 이메일의 수신 거부 링크를 사용해주세요.", false), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
      });
    }

    try {
      // Check if user exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, name")
        .eq("id", decoded.userId)
        .single();

      if (profileError || !profile) {
        console.error("Profile not found:", profileError);
        return new Response(getHtmlResponse("오류", "사용자를 찾을 수 없습니다.", false), {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
        });
      }

      // Update preferences based on type from token or URL param
      const unsubType = type || decoded.type;
      const updateField = unsubType ? `email_${unsubType}` : null;
      let updateData: Record<string, boolean> = {};

      if (updateField && ['email_contract', 'email_project', 'email_team', 'email_payment', 
          'email_dispute', 'email_review', 'email_siege', 'email_badge', 'email_system'].includes(updateField)) {
        // Unsubscribe from specific type
        updateData[updateField] = false;
      } else {
        // Unsubscribe from all
        updateData = {
          email_contract: false,
          email_project: false,
          email_team: false,
          email_payment: false,
          email_dispute: false,
          email_review: false,
          email_siege: false,
          email_badge: false,
          email_system: false,
        };
      }

      const { error: updateError } = await supabase
        .from("notification_preferences")
        .update(updateData)
        .eq("user_id", decoded.userId);

      if (updateError) {
        // If no preferences exist, create them with unsubscribed settings
        const { error: insertError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: decoded.userId,
            ...updateData,
          });

        if (insertError) {
          console.error("Error updating preferences:", insertError);
          return new Response(getHtmlResponse("오류", "설정 업데이트에 실패했습니다.", false), {
            status: 500,
            headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
          });
        }
      }

      const typeLabel = unsubType ? getTypeLabel(unsubType) : "모든";
      console.log(`User ${decoded.userId} unsubscribed from ${typeLabel} notifications`);

      return new Response(
        getHtmlResponse(
          "수신 거부 완료",
          `${profile.name}님, ${typeLabel} 알림 이메일 수신이 거부되었습니다. 언제든지 프로필 설정에서 다시 활성화할 수 있습니다.`,
          true
        ),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
        }
      );
    } catch (error) {
      console.error("Error processing unsubscribe:", error);
      return new Response(getHtmlResponse("오류", "처리 중 오류가 발생했습니다.", false), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
      });
    }
  }

  // Handle POST request (API call)
  if (req.method === "POST") {
    try {
      const { token, type }: UnsubscribeRequest = await req.json();

      if (!token) {
        return new Response(JSON.stringify({ error: "Token is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const decoded = await decodeSecureToken(token);
      if (!decoded) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const updateField = type ? `email_${type}` : null;
      let updateData: Record<string, boolean> = {};

      if (updateField) {
        updateData[updateField] = false;
      } else {
        updateData = {
          email_contract: false,
          email_project: false,
          email_team: false,
          email_payment: false,
          email_dispute: false,
          email_review: false,
          email_siege: false,
          email_badge: false,
          email_system: false,
        };
      }

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: decoded.userId,
          ...updateData,
        }, { onConflict: 'user_id' });

      if (error) {
        console.error("Error updating preferences:", error);
        return new Response(JSON.stringify({ error: "Failed to update preferences" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (error) {
      console.error("Error in unsubscribe POST:", error);
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
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
  return labels[type] || type;
}

function getHtmlResponse(title: string, message: string, success: boolean): string {
  const bgColor = success ? "#10b981" : "#ef4444";
  const icon = success ? "✓" : "✕";

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          padding: 48px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .icon {
          width: 80px;
          height: 80px;
          background: ${bgColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 40px;
          color: white;
        }
        h1 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 16px;
        }
        p {
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-weight: 500;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="https://kazkjbkldqxjdnzgiaqp.lovableproject.com/profile" class="button">설정으로 이동</a>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
