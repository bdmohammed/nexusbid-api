import { paypalRequest } from './paypal.client';

export interface CreateOrderInput {
  amountCents: number;
  currency?: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  customId?: string; // Used to pass our internal reference (tenderId or subscriptionId)
}

export interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

export interface PayPalCapture {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }>;
    };
    custom_id?: string;
  }>;
}

/**
 * PayPal Orders API v2 — ONE-TIME payments only.
 * Used for: per-tender purchases (Phase 2) and one-time plan purchases.
 * Does NOT auto-renew. Use paypal.subscriptions.ts for recurring billing.
 */

/**
 * Creates a PayPal order and returns the approval URL for the customer.
 */
export async function createOrder(input: CreateOrderInput): Promise<PayPalOrder> {
  const amountValue = (input.amountCents / 100).toFixed(2);
  const currency = input.currency ?? 'USD';

  return paypalRequest<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: currency, value: amountValue },
          description: input.description,
          custom_id: input.customId,
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        brand_name: 'NexusBid',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    }),
  });
}

/**
 * Captures an approved PayPal order.
 * Call this after the user returns from PayPal approval.
 */
export async function captureOrder(orderId: string): Promise<PayPalCapture> {
  return paypalRequest<PayPalCapture>(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
  });
}

/**
 * Gets order details — useful for verifying status server-side.
 */
export async function getOrder(orderId: string): Promise<PayPalOrder> {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${orderId}`);
}

/**
 * Extracts the approval URL from an order's links array.
 */
export function getApprovalUrl(order: PayPalOrder): string | null {
  return order.links.find((l) => l.rel === 'approve')?.href ?? null;
}
