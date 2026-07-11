import { env } from '../../config/env';
import { logger } from '../../config/logger';

const PAYPAL_BASE =
  env.PAYPAL_ENV === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

/**
 * Fetches a PayPal OAuth2 access token.
 * Caches the token and reuses it until 60 seconds before expiry.
 */
async function getAccessToken(): Promise<string> {
  if (env.NODE_ENV === 'local') {
    return 'local_dummy_token';
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`).toString(
    'base64',
  );

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, 'PayPal token fetch failed');
    throw new Error('Failed to fetch PayPal access token');
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

interface PayPalApplicationContext {
  return_url?: string;
  cancel_url?: string;
}

interface PayPalRequestBody {
  application_context?: PayPalApplicationContext;
  [key: string]: unknown;
}

interface MockSubscriptionResponse {
  id: string;
  status: string;
  links: { href: string; rel: string; method: string }[];
}

interface MockOrderResponse {
  id: string;
  status: string;
  links: { href: string; rel: string; method: string }[];
}

interface MockCaptureResponse {
  id: string;
  status: string;
  purchase_units: {
    payments: {
      captures: {
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }[];
    };
  }[];
}

interface MockWebhookVerificationResponse {
  verification_status: string;
}

type MockResponse =
  | MockSubscriptionResponse
  | MockOrderResponse
  | MockCaptureResponse
  | MockWebhookVerificationResponse
  | Record<string, never>;

function getReturnUrl(bodyObj: PayPalRequestBody): string {
  return bodyObj.application_context?.return_url ?? 'http://localhost:3001';
}

function mockBillingSubscription(bodyObj: PayPalRequestBody): MockSubscriptionResponse {
  const returnUrl = getReturnUrl(bodyObj);
  const subId = `I-DUMMY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  return {
    id: subId,
    status: 'APPROVAL_PENDING',
    links: [{ href: `${returnUrl}?subscription=${subId}`, rel: 'approve', method: 'GET' }],
  };
}

function mockCreateOrder(bodyObj: PayPalRequestBody): MockOrderResponse {
  const returnUrl = getReturnUrl(bodyObj);
  const orderId = `DUMMY-ORDER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  return {
    id: orderId,
    status: 'CREATED',
    links: [{ href: `${returnUrl}?token=${orderId}`, rel: 'approve', method: 'GET' }],
  };
}

function mockCaptureOrder(path: string): MockCaptureResponse {
  const pathParts = path.split('/');
  const orderIndex = pathParts.indexOf('orders');
  const orderId = orderIndex >= 0 ? (pathParts[orderIndex + 1] ?? 'UNKNOWN') : 'UNKNOWN';
  const captureId = `DUMMY-CAPTURE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  return {
    id: orderId,
    status: 'COMPLETED',
    purchase_units: [
      {
        payments: {
          captures: [
            {
              id: captureId,
              status: 'COMPLETED',
              amount: { value: '29.99', currency_code: 'USD' },
            },
          ],
        },
      },
    ],
  };
}

function handleLocalDummyRequest(path: string, options: RequestInit): MockResponse {
  const bodyObj = (options.body ? JSON.parse(options.body as string) : {}) as PayPalRequestBody;

  if (path.startsWith('/v1/billing/subscriptions')) {
    return mockBillingSubscription(bodyObj);
  }
  if (path.startsWith('/v2/checkout/orders') && !path.endsWith('/capture')) {
    return mockCreateOrder(bodyObj);
  }
  if (path.includes('/v2/checkout/orders/') && path.endsWith('/capture')) {
    return mockCaptureOrder(path);
  }
  if (path.startsWith('/v1/notifications/verify-webhook-signature')) {
    return {
      verification_status: 'SUCCESS',
    };
  }
  return {};
}

/**
 * Authenticated fetch wrapper for PayPal API calls.
 * Automatically injects Bearer token and Content-Type headers.
 */
export async function paypalRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const start = performance.now();
  if (env.NODE_ENV === 'local') {
    logger.info({ path }, '💳 [DUMMY TEST] PayPal request intercepted (local env)');
    const resVal = handleLocalDummyRequest(path, options);
    const durationMs = performance.now() - start;
    logger.info({ path, durationMs, mock: true }, 'PayPal API request completed');
    return resVal as T;
  }

  const accessToken = await getAccessToken();

  const url = `${PAYPAL_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers });
  const durationMs = performance.now() - start;
  logger.info({ path, durationMs }, 'PayPal API request completed');

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(
      { status: response.status, path, body: errorBody, durationMs },
      'PayPal API error',
    );
    throw new Error(`PayPal API error ${response.status}: ${errorBody}`);
  }

  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

export { PAYPAL_BASE };
