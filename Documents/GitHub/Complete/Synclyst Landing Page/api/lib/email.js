import { APP_SIGN_IN_URL, CHROME_STORE_URL, FROM_EMAIL } from './constants.js';

function buildDesktopLinkEmailHtml(email) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Install SyncLyst on Desktop</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#141416;border:1px solid #2a2a2e;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 28px 8px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.04em;color:#ffffff;">SyncLyst<sup style="font-size:10px;font-weight:500;">®</sup></p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;text-align:center;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">Your 5 Free Scans Are Locked In</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#a1a1aa;">Open this email on your <strong style="color:#e4e4e7;">laptop or computer</strong>, install the Chrome Extension, and sign in with <strong style="color:#e4e4e7;">${email}</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;text-align:center;">
              <a href="${CHROME_STORE_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#570ec5 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 28px;border-radius:12px;">Install Chrome Extension →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1c1c1f;border:1px solid #2a2a2e;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">Next steps</p>
                    <ol style="margin:0;padding-left:18px;color:#d4d4d8;font-size:14px;line-height:1.7;">
                      <li>Install SyncLyst from the Chrome Web Store</li>
                      <li>Sign in at <a href="${APP_SIGN_IN_URL}" style="color:#a78bfa;">app.synclyst.app</a> with ${email}</li>
                      <li>First time signing in? Use <strong>Forgot password</strong> to set your password</li>
                      <li>Run your first automated product scan</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">Questions? Reply to this email or contact <a href="mailto:hello@synclyst.app" style="color:#a1a1aa;">hello@synclyst.app</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendDesktopLinkEmail(email) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { error: 'Email service is not configured', code: 'CONFIG' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Your SyncLyst desktop link + 5 free scans are ready →',
      html: buildDesktopLinkEmailHtml(email),
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('[resend] send failed', res.status, body);
    return { error: 'Could not send email', code: 'EMAIL' };
  }

  return { id: body?.id || null };
}
