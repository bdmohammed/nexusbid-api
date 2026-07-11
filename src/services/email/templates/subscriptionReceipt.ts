import { emailFooterHtml, emailFooterText } from './footer';

export function getSubscriptionReceiptTemplate(opts: {
  name: string;
  planName: string;
  amount: string;
  expires: string;
  dashboardLink: string;
  userId: string;
}) {
  const html = `
    <h2>Subscription Confirmed</h2>
    <p>Hi ${opts.name}, your <strong>${opts.planName}</strong> subscription is now active.</p>
    <table style="border-collapse:collapse;width:100%;max-width:400px;">
      <tr><td style="padding:8px;border:1px solid #e5e7eb;">Plan</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.planName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;">Amount</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.amount}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;">Access until</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.expires}</td></tr>
    </table>
    <a href="${opts.dashboardLink}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
      Browse Tenders
    </a>
    ${emailFooterHtml(opts.userId)}
  `;

  const text = `Subscription Confirmed\n\nHi ${opts.name}, your ${opts.planName} subscription is now active.\n\nSubscription Details:\n- Plan: ${opts.planName}\n- Amount: ${opts.amount}\n- Access until: ${opts.expires}\n\nBrowse Tenders: ${opts.dashboardLink}${emailFooterText(opts.userId)}`;

  return { html, text };
}
