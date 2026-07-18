import { emailFooterHtml, emailFooterText } from './footer';

export function getLoginNotificationTemplate(opts: {
  name: string;
  timeString: string;
  ipAddress: string;
  userAgent: string;
  userId: string;
}) {
  const html = `
    <h2>New Login Detected</h2>
    <p>Hi ${opts.name},</p>
    <p>We detected a login to your NexusBid account from a new device or location.</p>
    <table style="border-collapse:collapse;width:100%;max-width:400px;">
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Time</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.timeString}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">IP Address</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.ipAddress}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Device/Browser</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.userAgent}</td></tr>
    </table>
    <p style="margin-top:16px;">
      If this was you, you can ignore this email. If this wasn't you, we recommend resetting your password immediately and revoking all sessions from your profile settings.
    </p>
    ${emailFooterHtml(opts.userId)}
  `;

  const text = `New Login Detected\n\nHi ${opts.name},\n\nWe detected a login to your NexusBid account from a new device or location.\n\nLogin Details:\n- Time: ${opts.timeString}\n- IP Address: ${opts.ipAddress}\n- Device/Browser: ${opts.userAgent}\n\nIf this was you, you can ignore this email. If this wasn't you, we recommend resetting your password immediately and revoking all sessions from your profile settings.${emailFooterText(opts.userId)}`;

  return { html, text };
}
