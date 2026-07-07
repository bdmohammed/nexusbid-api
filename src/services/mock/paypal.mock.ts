/**
 * Mock PayPal Service — LOCAL environment only.
 *
 * Mirrors the real PayPal API contract exactly (same return shapes) but
 * does NOT make any real API calls. Logs "[DUMMY TEST]" for each operation.
 *
 * Exported from the same paths as the real PayPal modules so the rest
 * of the codebase is unaffected.
 */
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../config/logger';

// ─── Mock PayPal Orders ────────────────────────────────────────────────────────
export async function createOrder(amountCents: number): Promise<{ id: string; approveUrl: string }> {
  const id = `DUMMY-ORDER-${uuidv4().toUpperCase().slice(0, 12)}`;
  logger.info({ mock: true, id, amountCents }, '💳 [DUMMY TEST] PayPal createOrder (local env)');
  return {
    id,
    approveUrl: `http://localhost:3001/dummy-paypal-approve?token=${id}`,
  };
}

export async function captureOrder(orderId: string): Promise<{
  id: string; status: string; captureId: string; amountCents: number;
}> {
  logger.info({ mock: true, orderId }, '✅ [DUMMY TEST] PayPal captureOrder (local env)');
  return {
    id: orderId,
    status: 'COMPLETED',
    captureId: `DUMMY-CAPTURE-${uuidv4().toUpperCase().slice(0, 12)}`,
    amountCents: 999,
  };
}

// ─── Mock PayPal Subscriptions ─────────────────────────────────────────────────
export async function createSubscription(planId: string): Promise<{ id: string; approveUrl: string }> {
  const id = `I-DUMMY-${uuidv4().toUpperCase().slice(0, 12)}`;
  logger.info({ mock: true, id, planId }, '🔁 [DUMMY TEST] PayPal createSubscription (local env)');
  return {
    id,
    approveUrl: `http://localhost:3001/dummy-paypal-approve?subscription=${id}`,
  };
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  logger.info({ mock: true, subscriptionId }, '❌ [DUMMY TEST] PayPal cancelSubscription (local env)');
}

export async function suspendSubscription(subscriptionId: string): Promise<void> {
  logger.info({ mock: true, subscriptionId }, '⏸️  [DUMMY TEST] PayPal suspendSubscription (local env)');
}

// ─── Mock PayPal Webhook Verification ──────────────────────────────────────────
export async function verifyWebhookSignature(_payload: {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  body: string;
}): Promise<boolean> {
  logger.info({ mock: true }, '🔏 [DUMMY TEST] PayPal verifyWebhookSignature — always returns true (local env)');
  return true;
}
