import { performance } from 'node:perf_hooks';

import { logger } from '../../config/logger';

function dummySend(opts: { to: string; subject: string; template: string }): void {
  const recipientDomain = opts.to.includes('@') ? opts.to.split('@')[1] : 'unknown';
  logger.info({ recipientDomain, template: opts.template }, 'Email queued');
  const start = performance.now();
  const durationMs = performance.now() - start;
  logger.info(
    {
      mock: true,
      recipientDomain,
      template: opts.template,
      durationMs,
    },
    '📧 [DUMMY TEST] Email sent (local env)',
  );
}

export async function sendVerificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `http://localhost:3001/verify-email?token=${opts.token}`;
  dummySend({
    to: opts.to,
    subject: 'Verify your NexusBid email address',
    template: 'verification',
  });
  logger.info(
    `\n--------------------------------------------------\n📧 [DUMMY TEST] Email Verification Link:\nTo: ${opts.to}\nToken: ${opts.token}\nLink: ${link}\n--------------------------------------------------\n`,
  );
}

export async function sendAdminVerificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `http://localhost:3002/verify-email?token=${opts.token}`;
  dummySend({
    to: opts.to,
    subject: 'Verify your NexusBid Admin email address',
    template: 'admin-verification',
  });
  logger.info(
    `\n--------------------------------------------------\n📧 [DUMMY TEST] Admin Email Verification Link:\nTo: ${opts.to}\nToken: ${opts.token}\nLink: ${link}\n--------------------------------------------------\n`,
  );
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `http://localhost:3001/reset-password?token=${opts.token}`;
  dummySend({ to: opts.to, subject: 'Reset your NexusBid password', template: 'password-reset' });
  logger.info(
    `\n--------------------------------------------------\n📧 [DUMMY TEST] Password Reset Link:\nTo: ${opts.to}\nToken: ${opts.token}\nLink: ${link}\n--------------------------------------------------\n`,
  );
}

export async function sendSubscriptionReceiptEmail(opts: {
  to: string;
  name: string;
  userId: string;
  planName: string;
  amountCents: number;
  expiresAt: Date;
}): Promise<void> {
  dummySend({
    to: opts.to,
    subject: `NexusBid: Your ${opts.planName} subscription is active`,
    template: 'subscription-receipt',
  });
}

export async function sendContactFormEmail(opts: {
  senderName: string;
  senderEmail: string;
  message: string;
}): Promise<void> {
  dummySend({
    to: 'admin@nexusbid.local',
    subject: `NexusBid Contact Form: ${opts.senderName}`,
    template: 'contact-form',
  });
}

export async function sendSubscriptionCancelledEmail(opts: {
  to: string;
  name: string;
  userId: string;
  planName: string;
  endsAt: Date;
}): Promise<void> {
  dummySend({
    to: opts.to,
    subject: 'NexusBid: Subscription cancelled',
    template: 'subscription-cancelled',
  });
}

export async function sendEmailChangeVerificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `http://localhost:3001/verify-email-change?token=${opts.token}`;
  dummySend({
    to: opts.to,
    subject: 'Verify your new NexusBid email address',
    template: 'email-change-verification',
  });
  logger.info(
    `\n--------------------------------------------------\n📧 [DUMMY TEST] Email Change Verification Link:\nTo: ${opts.to}\nToken: ${opts.token}\nLink: ${link}\n--------------------------------------------------\n`,
  );
}

export async function sendEmailChangeAlertEmail(opts: {
  to: string;
  name: string;
  userId: string;
  newEmail: string;
}): Promise<void> {
  dummySend({
    to: opts.to,
    subject: 'NexusBid Account Alert: Email change requested',
    template: 'email-change-alert',
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
  dummySend({
    to: opts.to,
    subject: 'Security Alert: New login detected on your NexusBid account',
    template: 'login-notification',
  });
}

export async function sendAdminRegistrationNotification(opts: {
  to: string;
  adminName: string;
  adminEmail: string;
  approveLink?: string;
  rejectLink?: string;
}): Promise<void> {
  dummySend({
    to: opts.to,
    subject: 'New Admin Registration Received',
    template: 'admin-registration-notification',
  });
  logger.info(
    `\n--------------------------------------------------\n📧 [DUMMY TEST] Admin Registration Review Request:\nTo: ${opts.to}\nAdmin Name: ${opts.adminName}\nAdmin Email: ${opts.adminEmail}\nApprove Link: ${opts.approveLink}\nReject Link: ${opts.rejectLink}\n--------------------------------------------------\n`,
  );
}

export async function sendAdminApprovalStatusEmail(opts: {
  to: string;
  name: string;
  status: 'approved' | 'rejected';
  reason?: string;
}): Promise<void> {
  dummySend({ to: opts.to, subject: 'Account Status Update', template: 'admin-approval-status' });
  logger.info(
    `\n--------------------------------------------------\n📧 [DUMMY TEST] Admin Status Update Email:\nTo: ${opts.to}\nName: ${opts.name}\nStatus: ${opts.status}\nReason: ${opts.reason ?? 'None'}\n--------------------------------------------------\n`,
  );
}

export async function sendAdminBootstrapNotification(opts: {
  to: string;
  adminName: string;
  adminEmail: string;
  bootstrapLink: string;
}): Promise<void> {
  dummySend({
    to: opts.to,
    subject: 'Action Required: Bootstrap First Super Admin',
    template: 'admin-bootstrap-notification',
  });
  logger.info(
    `\n--------------------------------------------------\n📧 [DUMMY TEST] Admin Bootstrap Review Request:\nTo: ${opts.to}\nAdmin Name: ${opts.adminName}\nAdmin Email: ${opts.adminEmail}\nBootstrap Link: ${opts.bootstrapLink}\n--------------------------------------------------\n`,
  );
}
