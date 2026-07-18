export function getAdminBootstrapNotificationTemplate(opts: {
  adminName: string;
  adminEmail: string;
  bootstrapLink: string;
}) {
  const html = `
    <h2>No Super Admin Exists in the System</h2>
    <p>A new admin registration has been received, and no Super Admin is currently configured in the system.</p>
    <p><strong>Name:</strong> ${opts.adminName}</p>
    <p><strong>Email:</strong> ${opts.adminEmail}</p>
    <p>Please click the link below to review, approve, and bootstrap the first Super Admin account. This link is valid for 30 minutes.</p>
    <div style="margin-top:24px;">
      <a href="${opts.bootstrapLink}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">Review & Bootstrap Admin</a>
    </div>
  `;

  const text = `No Super Admin Exists in the System\n\nA new admin registration has been received, and no Super Admin is currently configured in the system.\n\nDetails:\n- Name: ${opts.adminName}\n- Email: ${opts.adminEmail}\n\nPlease click the link below to review, approve, and bootstrap the first Super Admin account. This link is valid for 30 minutes:\n${opts.bootstrapLink}`;

  return { html, text };
}
