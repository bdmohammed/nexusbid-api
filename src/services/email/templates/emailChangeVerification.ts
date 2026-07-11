import { emailFooterHtml, emailFooterText } from './footer';

export function getEmailChangeVerificationTemplate(opts: {
  name: string;
  link: string;
  userId: string;
}) {
  const html = `
    <h2>Verify your Email Change</h2>
    <p>Hi ${opts.name}, please verify this new email address to complete the update to your NexusBid account.</p>
    <a href="${opts.link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
      Verify New Email Address
    </a>
    <p style="color:#888;font-size:12px;margin-top:16px;">This link expires in 24 hours.</p>
    ${emailFooterHtml(opts.userId)}
  `;

  const text = `Verify your Email Change\n\nHi ${opts.name}, please verify this new email address to complete the update to your NexusBid account by clicking the link below:\n${opts.link}\n\nThis link expires in 24 hours.${emailFooterText(opts.userId)}`;

  return { html, text };
}
