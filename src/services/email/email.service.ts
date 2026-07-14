import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { EmailProvider } from "./email.provider";
import { SesProvider } from "./providers/ses.provider";
import { DummyEmailProvider } from "./providers/dummy.provider";
import type { EmailOptions } from "./types/email.types";

import { getVerificationTemplate } from "./templates/verification";
import { getAdminVerificationTemplate } from "./templates/adminVerification";
import { getPasswordResetTemplate } from "./templates/passwordReset";
import { getSubscriptionReceiptTemplate } from "./templates/subscriptionReceipt";
import { getContactFormTemplate } from "./templates/contactForm";
import { getSubscriptionCancelledTemplate } from "./templates/subscriptionCancelled";
import { getEmailChangeVerificationTemplate } from "./templates/emailChangeVerification";
import { getEmailChangeAlertTemplate } from "./templates/emailChangeAlert";
import { getLoginNotificationTemplate } from "./templates/loginNotification";
import { getAdminRegistrationNotificationTemplate } from "./templates/adminRegistrationNotification";
import { getAdminApprovalStatusTemplate } from "./templates/adminApprovalStatus";
import { getAdminBootstrapNotificationTemplate } from "./templates/adminBootstrapNotification";

const FRONTEND = env.FRONTEND_CUSTOMER_URL;

// Instantiate the appropriate provider based on config
let emailProvider: EmailProvider;
if (env.EMAIL_PROVIDER === "ses") {
  emailProvider = new SesProvider();
} else {
  emailProvider = new DummyEmailProvider();
}

/**
 * Dispatch options to the selected email provider.
 * Catches and logs errors without throwing, preventing email failures from breaking request handlers.
 */
async function send(options: EmailOptions): Promise<void> {
  try {
    await emailProvider.send(options);
  } catch (err) {
    logger.error(
      { err, to: options.to, subject: options.subject },
      "Email dispatch failed",
    );
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendVerificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `${FRONTEND}/auth/verify-email?token=${opts.token}`;
  const { html, text } = getVerificationTemplate({
    name: opts.name,
    link,
    userId: opts.userId,
  });
  await send({
    to: opts.to,
    subject: "Verify your NexusBid email address",
    html,
    text,
  });
}

export async function sendAdminVerificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `${env.FRONTEND_ADMIN_URL}/verify-email?token=${opts.token}`;
  const { html, text } = getAdminVerificationTemplate({
    name: opts.name,
    link,
    userId: opts.userId,
  });
  await send({
    to: opts.to,
    subject: "Verify your NexusBid Admin email address",
    html,
    text,
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `${FRONTEND}/reset-password?token=${opts.token}`;
  const { html, text } = getPasswordResetTemplate({
    name: opts.name,
    link,
    userId: opts.userId,
  });
  await send({
    to: opts.to,
    subject: "Reset your NexusBid password",
    html,
    text,
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
  const expires = opts.expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dashboardLink = `${FRONTEND}/dashboard`;
  const { html, text } = getSubscriptionReceiptTemplate({
    name: opts.name,
    planName: opts.planName,
    amount,
    expires,
    dashboardLink,
    userId: opts.userId,
  });
  await send({
    to: opts.to,
    subject: `NexusBid: Your ${opts.planName} subscription is active`,
    html,
    text,
  });
}

export async function sendContactFormEmail(opts: {
  senderName: string;
  senderEmail: string;
  message: string;
}): Promise<void> {
  const { html, text } = getContactFormTemplate(opts);
  await send({
    to: env.FROM_EMAIL || "",
    subject: `NexusBid Contact Form: ${opts.senderName}`,
    html,
    text,
  });
}

export async function sendSubscriptionCancelledEmail(opts: {
  to: string;
  name: string;
  userId: string;
  planName: string;
  endsAt: Date;
}): Promise<void> {
  const ends = opts.endsAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const plansLink = `${FRONTEND}/plans`;
  const { html, text } = getSubscriptionCancelledTemplate({
    name: opts.name,
    planName: opts.planName,
    ends,
    plansLink,
    userId: opts.userId,
  });
  await send({
    to: opts.to,
    subject: "NexusBid: Subscription cancelled",
    html,
    text,
  });
}

export async function sendEmailChangeVerificationEmail(opts: {
  to: string;
  name: string;
  userId: string;
  token: string;
}): Promise<void> {
  const link = `${FRONTEND}/auth/verify-email-change?token=${opts.token}`;
  const { html, text } = getEmailChangeVerificationTemplate({
    name: opts.name,
    link,
    userId: opts.userId,
  });
  await send({
    to: opts.to,
    subject: "Verify your new NexusBid email address",
    html,
    text,
  });
}

export async function sendEmailChangeAlertEmail(opts: {
  to: string;
  name: string;
  userId: string;
  newEmail: string;
}): Promise<void> {
  const { html, text } = getEmailChangeAlertTemplate({
    name: opts.name,
    newEmail: opts.newEmail,
    userId: opts.userId,
  });
  await send({
    to: opts.to,
    subject: "NexusBid Account Alert: Email change requested",
    html,
    text,
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
  const timeString = opts.time.toUTCString();
  const { html, text } = getLoginNotificationTemplate({
    name: opts.name,
    timeString,
    ipAddress: opts.ipAddress ?? "Unknown",
    userAgent: opts.userAgent ?? "Unknown",
    userId: opts.userId,
  });
  await send({
    to: opts.to,
    subject: "Security Alert: New login detected on your NexusBid account",
    html,
    text,
  });
}

export async function sendAdminRegistrationNotification(opts: {
  to: string;
  adminName: string;
  adminEmail: string;
  approveLink?: string;
  rejectLink?: string;
}): Promise<void> {
  const { html, text } = getAdminRegistrationNotificationTemplate(opts);
  await send({
    to: opts.to,
    subject: "New Admin Registration Received",
    html,
    text,
  });
}

export async function sendAdminApprovalStatusEmail(opts: {
  to: string;
  name: string;
  status: "approved" | "rejected";
  reason?: string;
}): Promise<void> {
  const subject =
    opts.status === "approved"
      ? "Your NexusBid Admin Account has been Approved"
      : "Your NexusBid Admin Account Request has been Rejected";

  const { html, text } = getAdminApprovalStatusTemplate(opts);
  await send({
    to: opts.to,
    subject,
    html,
    text,
  });
}

export async function sendAdminBootstrapNotification(opts: {
  to: string;
  adminName: string;
  adminEmail: string;
  bootstrapLink: string;
}): Promise<void> {
  const { html, text } = getAdminBootstrapNotificationTemplate(opts);
  await send({
    to: opts.to,
    subject: "Action Required: Bootstrap First Super Admin",
    html,
    text,
  });
}
