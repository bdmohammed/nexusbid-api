import { emailFooterHtml, emailFooterText } from './footer';

export function getEmailChangeAlertTemplate(opts: {
  name: string;
  newEmail: string;
  userId: string;
}) {
  const html = `
    <h2>Email Change Requested</h2>
    <p>Hi ${opts.name},</p>
    <p>A request has been made to change the email address associated with your NexusBid account to <strong>${opts.newEmail}</strong>.</p>
    <p>If you made this change, no action is required. We have sent a verification link to your new email address.</p>
    <p style="color:#dc2626;font-weight:bold;">
      If you did not request this, please secure your account immediately or contact support.
    </p>
    ${emailFooterHtml(opts.userId)}
  `;

  const text = `Email Change Requested\n\nHi ${opts.name},\n\nA request has been made to change the email address associated with your NexusBid account to ${opts.newEmail}.\n\nIf you made this change, no action is required. We have sent a verification link to your new email address.\n\nIf you did not request this, please secure your account immediately or contact support.${emailFooterText(opts.userId)}`;

  return { html, text };
}
