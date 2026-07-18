import { emailFooterHtml, emailFooterText } from './footer';

export function getSubscriptionCancelledTemplate(opts: {
  name: string;
  planName: string;
  ends: string;
  plansLink: string;
  userId: string;
}) {
  const html = `
    <h2>Subscription Cancelled</h2>
    <p>Hi ${opts.name}, your <strong>${opts.planName}</strong> subscription has been cancelled.</p>
    <p>You will continue to have access until <strong>${opts.ends}</strong>.</p>
    <a href="${opts.plansLink}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
      Resubscribe
    </a>
    ${emailFooterHtml(opts.userId)}
  `;

  const text = `Subscription Cancelled\n\nHi ${opts.name}, your ${opts.planName} subscription has been cancelled.\n\nYou will continue to have access until ${opts.ends}.\n\nResubscribe by visiting: ${opts.plansLink}${emailFooterText(opts.userId)}`;

  return { html, text };
}
