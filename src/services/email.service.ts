import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { performance } from 'perf_hooks';

// ─── Local env: swap in dummy implementation (no real Resend calls) ───────────
if (env.NODE_ENV === 'local') {
  module.exports = require('./mock/email.mock');
}

const resend = new Resend(env.RESEND_API_KEY);

const FROM = env.FROM_EMAIL;
const FRONTEND = env.FRONTEND_CUSTOMER_URL;

/**
 * Internal helper — sends an email via Resend.
 * Logs errors without throwing — email failures should not crash request handlers.
 */
async function send(options: {
  to: string;
  subject: string;
  html: string;
  template: string;
}): Promise<void> {
  const recipientDomain = options.to.includes('@') ? options.to.split('@')[1] : 'unknown';
  logger.info({ recipientDomain, template: options.template }, 'Email queued');

  const start = performance.now();
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    const durationMs = performance.now() - start;
    logger.info({ id: result.data?.id, recipientDomain, template: options.template, durationMs }, 'Email sent');
  } catch (err) {
    const durationMs = performance.now() - start;
    logger.error({ err, recipientDomain, template: options.template, durationMs }, 'Email send failed');
  }
}

/** Shared email footer with unsubscribe placeholder */
function emailFooter(userId: string): string {
  return `
    <p style="color:#888;font-size:12px;margin-top:32px;">
      NexusBid · USA Government RFP Marketplace<br>
      <a href="${FRONTEND}/unsubscribe?uid=${userId}" style="color:#888;">Unsubscribe from email notifications</a>
    </p>
  `;
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export async function sendVerificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `${FRONTEND}/auth/verify-email?token=${opts.token}`;
  await send({
    to: opts.to,
    subject: 'Verify your NexusBid email address',
    template: 'verification',
    html: `
      <h2>Welcome to NexusBid, ${opts.name}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        Verify Email Address
      </a>
      <p style="color:#888;font-size:12px;margin-top:16px;">This link expires in 24 hours.</p>
      ${emailFooter(opts.userId)}
    `,
  });
}

export async function sendAdminVerificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `${env.FRONTEND_ADMIN_URL}/verify-email?token=${opts.token}`;
  await send({
    to: opts.to,
    subject: 'Verify your NexusBid Admin email address',
    template: 'admin-verification',
    html: `
      <h2>Welcome to NexusBid Admin, ${opts.name}!</h2>
      <p>Please verify your email address to activate your administrator account request.</p>
      <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        Verify Email Address
      </a>
      <p style="color:#888;font-size:12px;margin-top:16px;">This link expires in 24 hours.</p>
      ${emailFooter(opts.userId)}
    `,
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `${FRONTEND}/reset-password?token=${opts.token}`;
  await send({
    to: opts.to,
    subject: 'Reset your NexusBid password',
    template: 'password-reset',
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${opts.name}, we received a request to reset your password.</p>
      <a href="${link}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        Reset Password
      </a>
      <p style="color:#888;font-size:12px;margin-top:16px;">
        This link expires in 30 minutes. If you did not request this, ignore this email.
      </p>
      ${emailFooter(opts.userId)}
    `,
  });
}

export async function sendSubscriptionReceiptEmail(opts: {
  to: string;
  name: string;
  userId: string;
  planName: string;
  amountCents: number;
  expiresAt: Date;
}): Promise<void> {
  const amount = `$${(opts.amountCents / 100).toFixed(2)}`;
  const expires = opts.expiresAt.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  await send({
    to: opts.to,
    subject: `NexusBid: Your ${opts.planName} subscription is active`,
    template: 'subscription-receipt',
    html: `
      <h2>Subscription Confirmed</h2>
      <p>Hi ${opts.name}, your <strong>${opts.planName}</strong> subscription is now active.</p>
      <table style="border-collapse:collapse;width:100%;max-width:400px;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Plan</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.planName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Amount</td><td style="padding:8px;border:1px solid #e5e7eb;">${amount}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Access until</td><td style="padding:8px;border:1px solid #e5e7eb;">${expires}</td></tr>
      </table>
      <a href="${FRONTEND}/dashboard" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        Browse Tenders
      </a>
      ${emailFooter(opts.userId)}
    `,
  });
}

export async function sendContactFormEmail(opts: {
  senderName: string;
  senderEmail: string;
  message: string;
}): Promise<void> {
  await send({
    // to: env.ADMIN_EMAIL,
    to: '',
    subject: `NexusBid Contact Form: ${opts.senderName}`,
    template: 'contact-form',
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${opts.senderName} (${opts.senderEmail})</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left:4px solid #e5e7eb;padding-left:16px;color:#374151;">
        ${opts.message.replace(/\n/g, '<br>')}
      </blockquote>
    `,
  });
}

export async function sendSubscriptionCancelledEmail(opts: {
  to: string;
  name: string;
  userId: string;
  planName: string;
  endsAt: Date;
}): Promise<void> {
  const ends = opts.endsAt.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  await send({
    to: opts.to,
    subject: 'NexusBid: Subscription cancelled',
    template: 'subscription-cancelled',
    html: `
      <h2>Subscription Cancelled</h2>
      <p>Hi ${opts.name}, your <strong>${opts.planName}</strong> subscription has been cancelled.</p>
      <p>You will continue to have access until <strong>${ends}</strong>.</p>
      <a href="${FRONTEND}/plans" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        Resubscribe
      </a>
      ${emailFooter(opts.userId)}
    `,
  });
}

export async function sendEmailChangeVerificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `${FRONTEND}/auth/verify-email-change?token=${opts.token}`;
  await send({
    to: opts.to,
    subject: 'Verify your new NexusBid email address',
    template: 'email-change-verification',
    html: `
      <h2>Verify your Email Change</h2>
      <p>Hi ${opts.name}, please verify this new email address to complete the update to your NexusBid account.</p>
      <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        Verify New Email Address
      </a>
      <p style="color:#888;font-size:12px;margin-top:16px;">This link expires in 24 hours.</p>
      ${emailFooter(opts.userId)}
    `,
  });
}

export async function sendEmailChangeAlertEmail(opts: {
  to: string;
  name: string;
  userId: string;
  newEmail: string;
}): Promise<void> {
  await send({
    to: opts.to,
    subject: 'NexusBid Account Alert: Email change requested',
    template: 'email-change-alert',
    html: `
      <h2>Email Change Requested</h2>
      <p>Hi ${opts.name},</p>
      <p>A request has been made to change the email address associated with your NexusBid account to <strong>${opts.newEmail}</strong>.</p>
      <p>If you made this change, no action is required. We have sent a verification link to your new email address.</p>
      <p style="color:#dc2626;font-weight:bold;">
        If you did not request this, please secure your account immediately or contact support.
      </p>
      ${emailFooter(opts.userId)}
    `,
  });
}

export async function sendLoginNotificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  time: Date;
}): Promise<void> {
  await send({
    to: opts.to,
    subject: 'Security Alert: New login detected on your NexusBid account',
    template: 'login-notification',
    html: `
      <h2>New Login Detected</h2>
      <p>Hi ${opts.name},</p>
      <p>We detected a login to your NexusBid account from a new device or location.</p>
      <table style="border-collapse:collapse;width:100%;max-width:400px;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Time</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.time.toUTCString()}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">IP Address</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.ipAddress ?? 'Unknown'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Device/Browser</td><td style="padding:8px;border:1px solid #e5e7eb;">${opts.userAgent ?? 'Unknown'}</td></tr>
      </table>
      <p style="margin-top:16px;">
        If this was you, you can ignore this email. If this wasn't you, we recommend resetting your password immediately and revoking all sessions from your profile settings.
      </p>
      ${emailFooter(opts.userId)}
    `,
  });
}

export async function sendAdminRegistrationNotification(opts: {
  to: string;
  adminName: string;
  adminEmail: string;
  approveLink?: string;
  rejectLink?: string;
}): Promise<void> {
  const linksHtml = opts.approveLink && opts.rejectLink
    ? `<div style="margin-top:24px;">
         <a href="${opts.approveLink}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-right:12px;">Approve</a>
         <a href="${opts.rejectLink}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Reject</a>
       </div>`
    : `<p>Please log in to the admin dashboard to review this request.</p>`;

  await send({
    to: opts.to,
    subject: 'New Admin Registration Received',
    template: 'admin-registration-notification',
    html: `
      <h2>New admin registration received</h2>
      <p><strong>Name:</strong> ${opts.adminName}</p>
      <p><strong>Email:</strong> ${opts.adminEmail}</p>
      <p>Please review and approve or reject this request.</p>
      ${linksHtml}
    `,
  });
}

export async function sendAdminApprovalStatusEmail(opts: {
  to: string;
  name: string;
  status: 'approved' | 'rejected';
  reason?: string;
}): Promise<void> {
  const subject = opts.status === 'approved'
    ? 'Your NexusBid Admin Account has been Approved'
    : 'Your NexusBid Admin Account Request has been Rejected';

  const bodyHtml = opts.status === 'approved'
    ? `<p>Hi ${opts.name}, your administrator account request has been approved. You can now log in to the admin dashboard.</p>
       <a href="${env.FRONTEND_ADMIN_URL}/login" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Log In to Dashboard</a>`
    : `<p>Hi ${opts.name}, your administrator account request has been rejected.</p>
       ${opts.reason ? `<p><strong>Reason:</strong> ${opts.reason}</p>` : ''}`;

  await send({
    to: opts.to,
    subject,
    template: 'admin-approval-status',
    html: `
      <h2>Account Status Update</h2>
      ${bodyHtml}
    `,
  });
}

export async function sendAdminBootstrapNotification(opts: {
  to: string;
  adminName: string;
  adminEmail: string;
  bootstrapLink: string;
}): Promise<void> {
  await send({
    to: opts.to,
    subject: 'Action Required: Bootstrap First Super Admin',
    template: 'admin-bootstrap-notification',
    html: `
      <h2>No Super Admin Exists in the System</h2>
      <p>A new admin registration has been received, and no Super Admin is currently configured in the system.</p>
      <p><strong>Name:</strong> ${opts.adminName}</p>
      <p><strong>Email:</strong> ${opts.adminEmail}</p>
      <p>Please click the link below to review, approve, and bootstrap the first Super Admin account. This link is valid for 30 minutes.</p>
      <div style="margin-top:24px;">
        <a href="${opts.bootstrapLink}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">Review & Bootstrap Admin</a>
      </div>
    `,
  });
}

