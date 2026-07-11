import { env } from '../../../config/env';

export function getAdminApprovalStatusTemplate(opts: {
  name: string;
  status: 'approved' | 'rejected';
  reason?: string;
}) {
  const bodyHtml = opts.status === 'approved'
    ? `<p>Hi ${opts.name}, your administrator account request has been approved. You can now log in to the admin dashboard.</p>
       <a href="${env.FRONTEND_ADMIN_URL}/login" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Log In to Dashboard</a>`
    : `<p>Hi ${opts.name}, your administrator account request has been rejected.</p>
       ${opts.reason ? `<p><strong>Reason:</strong> ${opts.reason}</p>` : ''}`;

  const html = `
    <h2>Account Status Update</h2>
    ${bodyHtml}
  `;

  const text = `Account Status Update\n\nHi ${opts.name},\n\n${opts.status === 'approved' ? `Your administrator account request has been approved. You can now log in to the admin dashboard by visiting:\n${env.FRONTEND_ADMIN_URL}/login` : `Your administrator account request has been rejected.${opts.reason ? `\nReason: ${opts.reason}` : ''}`}`;

  return { html, text };
}
