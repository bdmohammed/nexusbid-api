export function getContactFormTemplate(opts: {
  senderName: string;
  senderEmail: string;
  message: string;
}) {
  const html = `
    <h2>New Contact Form Submission</h2>
    <p><strong>From:</strong> ${opts.senderName} (${opts.senderEmail})</p>
    <p><strong>Message:</strong></p>
    <blockquote style="border-left:4px solid #e5e7eb;padding-left:16px;color:#374151;">
      ${opts.message.replace(/\n/g, '<br>')}
    </blockquote>
  `;

  const text = `New Contact Form Submission\n\nFrom: ${opts.senderName} (${opts.senderEmail})\n\nMessage:\n${opts.message}`;

  return { html, text };
}
