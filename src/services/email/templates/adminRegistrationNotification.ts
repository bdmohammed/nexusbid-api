export function getAdminRegistrationNotificationTemplate(opts: {
  adminName: string;
  adminEmail: string;
  approveLink?: string;
  rejectLink?: string;
}) {
  const linksHtml =
    opts.approveLink && opts.rejectLink
      ? `<div style="margin-top:24px;">
         <a href="${opts.approveLink}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-right:12px;">Approve</a>
         <a href="${opts.rejectLink}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Reject</a>
       </div>`
      : '<p>Please log in to the admin dashboard to review this request.</p>';

  const html = `
    <h2>New admin registration received</h2>
    <p><strong>Name:</strong> ${opts.adminName}</p>
    <p><strong>Email:</strong> ${opts.adminEmail}</p>
    <p>Please review and approve or reject this request.</p>
    ${linksHtml}
  `;

  const text = `New Admin Registration Received\n\nName: ${opts.adminName}\nEmail: ${opts.adminEmail}\n\nPlease review and approve or reject this request.\n\n${opts.approveLink && opts.rejectLink ? `Approve: ${opts.approveLink}\nReject: ${opts.rejectLink}` : 'Please log in to the admin dashboard to review this request.'}`;

  return { html, text };
}
