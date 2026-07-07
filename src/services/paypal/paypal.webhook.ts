import { Request } from 'express';
import { env } from '../../config/env';
import { paypalRequest, PAYPAL_BASE } from './paypal.client';
import { logger } from '../../config/logger';

interface VerifyWebhookPayload {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  webhook_id: string;
  webhook_event: Record<string, unknown>;
}

interface VerifyWebhookResponse {
  verification_status: 'SUCCESS' | 'FAILURE';
}

/**
 * Verifies a PayPal webhook signature using PayPal's verification API.
 *
 * PayPal sends these headers with every webhook:
 *   paypal-transmission-id
 *   paypal-transmission-time
 *   paypal-cert-url
 *   paypal-auth-algo
 *   paypal-transmission-sig
 *
 * We forward these to PayPal's verification endpoint along with the raw body
 * and our PAYPAL_WEBHOOK_ID (from developer dashboard).
 *
 * IMPORTANT: Always log the raw event FIRST, then verify.
 * Even on signature failure, we log the event (status=FAILED) for forensics.
 */
export async function verifyPayPalWebhook(req: Request): Promise<boolean> {
  try {
    const headers = req.headers;
    const payload: VerifyWebhookPayload = {
      auth_algo: headers['paypal-auth-algo'] as string,
      cert_url: headers['paypal-cert-url'] as string,
      transmission_id: headers['paypal-transmission-id'] as string,
      transmission_sig: headers['paypal-transmission-sig'] as string,
      transmission_time: headers['paypal-transmission-time'] as string,
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: req.body as Record<string, unknown>,
    };

    const result = await paypalRequest<VerifyWebhookResponse>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

    return result.verification_status === 'SUCCESS';
  } catch (err) {
    logger.error({ err }, 'PayPal webhook signature verification failed');
    return false;
  }
}

/**
 * Extracts the PayPal transmission ID used as the idempotency key.
 */
export function getPayPalEventId(req: Request): string {
  return (req.headers['paypal-transmission-id'] as string) ?? '';
}
