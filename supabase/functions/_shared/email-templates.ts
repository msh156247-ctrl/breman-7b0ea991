// Shared email template utilities with branding support

export interface EmailBranding {
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  footer_text: string | null;
  support_email: string | null;
  website_url: string | null;
}

export const defaultBranding: EmailBranding = {
  brand_name: 'Lovable App',
  logo_url: null,
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
  accent_color: '#f59e0b',
  text_color: '#1f2937',
  background_color: '#f5f5f5',
  footer_text: '이 이메일은 알림 설정에 따라 발송되었습니다.',
  support_email: null,
  website_url: null,
};

export const notificationTypeLabels: Record<string, string> = {
  contract: '계약',
  project: '프로젝트',
  team: '팀',
  payment: '결제',
  dispute: '분쟁',
  review: '리뷰',
  siege: '시즈',
  badge: '뱃지',
  system: '시스템',
  team_invite: '팀 초대',
  application: '지원',
  project_match: '프로젝트 매칭',
  milestone: '마일스톤',
};

export const notificationTypeIcons: Record<string, string> = {
  contract: '📄',
  project: '📁',
  team: '👥',
  payment: '💳',
  dispute: '⚠️',
  review: '⭐',
  siege: '🏆',
  badge: '🎖️',
  system: '🔔',
  team_invite: '📨',
  application: '📝',
  project_match: '🎯',
  milestone: '🎪',
};

export function getBaseStyles(branding: EmailBranding) {
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
      background: linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color});
      padding: 32px 24px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      max-height: 50px;
      margin-bottom: 16px;
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
    .title {
      font-size: 20px;
      font-weight: 600;
      color: ${branding.text_color};
      margin-bottom: 12px;
    }
    .message {
      color: #6b7280;
      line-height: 1.7;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color});
      color: white !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    .button-secondary {
      background: ${branding.background_color};
      color: ${branding.primary_color} !important;
      border: 2px solid ${branding.primary_color};
    }
    .info-box {
      background: ${branding.background_color};
      border-left: 4px solid ${branding.accent_color};
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .info-box-title {
      font-weight: 600;
      color: ${branding.text_color};
      margin-bottom: 4px;
    }
    .info-box-content {
      color: #6b7280;
      font-size: 14px;
    }
    .divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
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
      margin: 0 0 12px 0;
      line-height: 1.5;
    }
    .footer-brand {
      color: #6b7280;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .unsubscribe {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
    .unsubscribe a {
      color: #9ca3af;
      text-decoration: underline;
      font-size: 11px;
      margin: 0 8px;
    }
    .unsubscribe a:hover {
      color: #6b7280;
    }
    .social-links {
      margin-top: 12px;
    }
    .social-links a {
      display: inline-block;
      margin: 0 6px;
      color: #9ca3af;
      text-decoration: none;
    }
  `;
}

interface NotificationEmailParams {
  branding: EmailBranding;
  userName: string;
  notificationType: string;
  title: string;
  message: string;
  link?: string;
  unsubscribeTypeUrl: string;
  unsubscribeAllUrl: string;
}

export function renderNotificationEmail(params: NotificationEmailParams): string {
  const { branding, userName, notificationType, title, message, link, unsubscribeTypeUrl, unsubscribeAllUrl } = params;
  const typeLabel = notificationTypeLabels[notificationType] || notificationType;
  const typeIcon = notificationTypeIcons[notificationType] || '🔔';

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>${getBaseStyles(branding)}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${branding.logo_url ? `<img src="${branding.logo_url}" alt="${branding.brand_name}" class="logo">` : ''}
          <h1>${branding.brand_name}</h1>
          <p class="subtitle">새로운 알림이 도착했습니다</p>
          <span class="badge">${typeIcon} ${typeLabel}</span>
        </div>
        <div class="content">
          <p style="color: #6b7280; margin-bottom: 20px;">안녕하세요, <strong>${userName}</strong>님!</p>
          <div class="title">${title}</div>
          <div class="message">${message || ''}</div>
          ${link ? `
            <div style="text-align: center; margin-top: 24px;">
              <a href="${link}" class="button">자세히 보기 →</a>
            </div>
          ` : ''}
        </div>
        <div class="footer">
          <div class="footer-brand">${branding.brand_name}</div>
          <p class="footer-text">${branding.footer_text || '이 이메일은 알림 설정에 따라 발송되었습니다.'}</p>
          ${branding.support_email ? `<p class="footer-text">문의: <a href="mailto:${branding.support_email}" style="color: #6b7280;">${branding.support_email}</a></p>` : ''}
          <div class="unsubscribe">
            <a href="${unsubscribeTypeUrl}">${typeLabel} 알림 수신 거부</a>
            |
            <a href="${unsubscribeAllUrl}">모든 알림 수신 거부</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

interface DigestNotification {
  title: string;
  message: string | null;
  type: string;
  link: string | null;
  created_at: string;
}

interface DigestEmailParams {
  branding: EmailBranding;
  userName: string;
  digestType: 'daily' | 'weekly';
  notifications: DigestNotification[];
  unsubscribeAllUrl: string;
  viewAllUrl: string;
}

export function renderDigestEmail(params: DigestEmailParams): string {
  const { branding, userName, digestType, notifications, unsubscribeAllUrl, viewAllUrl } = params;
  const digestTitle = digestType === 'daily' ? '일일 알림 요약' : '주간 알림 요약';
  const periodText = digestType === 'daily' ? '오늘' : '이번 주';

  const notificationRows = notifications.map(n => {
    const typeLabel = notificationTypeLabels[n.type] || n.type;
    const typeIcon = notificationTypeIcons[n.type] || '🔔';
    const formattedDate = new Date(n.created_at).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #f3f4f6;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="font-size: 24px; line-height: 1;">${typeIcon}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: ${branding.text_color}; margin-bottom: 4px;">${n.title}</div>
              ${n.message ? `<div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${n.message}</div>` : ''}
              <div style="display: flex; gap: 8px; font-size: 12px; color: #9ca3af;">
                <span style="background: ${branding.background_color}; padding: 2px 8px; border-radius: 4px;">${typeLabel}</span>
                <span>${formattedDate}</span>
              </div>
            </div>
          </div>
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
      <title>${digestTitle}</title>
      <style>${getBaseStyles(branding)}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${branding.logo_url ? `<img src="${branding.logo_url}" alt="${branding.brand_name}" class="logo">` : ''}
          <h1>${digestTitle}</h1>
          <p class="subtitle">안녕하세요, ${userName}님!</p>
          <span class="badge">📬 ${notifications.length}개의 새 알림</span>
        </div>
        <div class="content">
          <p style="color: #6b7280; margin-bottom: 20px;">
            ${periodText} 받으신 알림을 요약해 드립니다.
          </p>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <tbody>
              ${notificationRows}
            </tbody>
          </table>
          <div style="text-align: center; margin-top: 28px;">
            <a href="${viewAllUrl}" class="button">모든 알림 보기 →</a>
          </div>
        </div>
        <div class="footer">
          <div class="footer-brand">${branding.brand_name}</div>
          <p class="footer-text">${branding.footer_text || '알림 설정은 프로필에서 변경하실 수 있습니다.'}</p>
          ${branding.support_email ? `<p class="footer-text">문의: <a href="mailto:${branding.support_email}" style="color: #6b7280;">${branding.support_email}</a></p>` : ''}
          <div class="unsubscribe">
            <a href="${unsubscribeAllUrl}">모든 알림 이메일 수신 거부</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
