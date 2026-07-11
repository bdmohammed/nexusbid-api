import { emailFooterHtml, emailFooterText } from './footer';

export function getPasswordResetTemplate(opts: {
  name: string;
  link: string;
  userId: string;
}) {
  const html = `
    <h2>Password Reset Request</h2>
    <p>Hi ${opts.name}, we received a request to reset your password.</p>
    <a href="${opts.link}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
      Reset Password
    </a>
    <p style="color:#888;font-size:12px;margin-top:16px;">
      This link expires in 30 minutes. If you did not request this, ignore this email.
    </p>
    ${emailFooterHtml(opts.userId)}
  `;

  const text = `Password Reset Request\n\nHi ${opts.name}, we received a request to reset your password. Please click the link below to reset your password:\n${opts.link}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.${emailFooterText(opts.userId)}`;

  return { html, text };
}
