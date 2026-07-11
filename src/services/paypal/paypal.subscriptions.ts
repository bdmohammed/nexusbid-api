import { paypalRequest } from './paypal.client';

export interface CreateSubscriptionInput {
  paypalPlanId: string;
  returnUrl: string;
  cancelUrl: string;
  subscriberName: string;
  subscriberEmail: string;
}

export interface PayPalSubscription {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

export interface PayPalSubscriptionDetails {
  id: string;
  status: string;
  plan_id: string;
  subscriber: {
    name: { given_name: string; surname: string };
    email_address: string;
  };
  billing_info?: {
    last_payment?: { amount: { value: string }; time: string };
    next_billing_time?: string;
  };
  start_time: string;
}

/**
 * PayPal Subscriptions API v1 — RECURRING billing only.
 * Used for: Monthly, Annual, Enterprise plans.
 * Auto-renews until cancelled. Use paypal.orders.ts for one-time payments.
 *
 * Setup (one-time, done in PayPal dashboard):
 *   1. Create a Product in PayPal Developer Dashboard
 *   2. Create a Billing Plan linked to that Product
 *   3. Store the resulting plan_id in plans.paypalPlanId
 */

/**
 * Creates a new subscription for a customer.
 * Returns the subscription ID and the PayPal approval URL.
 */
export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<PayPalSubscription> {
  const [firstName, ...rest] = input.subscriberName.split(' ');
  const lastName = rest.join(' ') || '-';

  return paypalRequest<PayPalSubscription>('/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: input.paypalPlanId,
      application_context: {
        brand_name: 'NexusBid',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
      subscriber: {
        name: { given_name: firstName, surname: lastName },
        email_address: input.subscriberEmail,
      },
    }),
  });
}

/**
 * Gets full details of an existing subscription.
 */
export async function getSubscriptionDetails(
  subscriptionId: string,
): Promise<PayPalSubscriptionDetails> {
  return paypalRequest<PayPalSubscriptionDetails>(`/v1/billing/subscriptions/${subscriptionId}`);
}

/**
 * Cancels an active subscription immediately.
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason = 'Customer requested cancellation',
): Promise<void> {
  await paypalRequest(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Extracts the approval URL from a subscription's links array.
 */
export function getSubscriptionApprovalUrl(sub: PayPalSubscription): string | null {
  return sub.links.find((l) => l.rel === 'approve')?.href ?? null;
}
