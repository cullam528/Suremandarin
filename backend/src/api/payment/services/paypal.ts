type PayPalToken = { access_token: string; expires_in: number };

// Keep timeouts bounded, including when PayPal accepts a capture but its response
// is lost. The caller can retry with the same request id and reconcile via GET.
const requestTimeoutMs = 15_000;

export class PayPalRequestError extends Error {
  constructor(readonly status: number, readonly issues: string[], readonly debugId?: string) {
    // Do not put the entire provider response (which can contain payer data) in logs.
    super(`PayPal request failed (${status}): ${issues.join(', ') || 'UNKNOWN_ERROR'}${debugId ? ` [${debugId}]` : ''}`);
  }
}

const baseUrl = () => process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const credentials = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('PayPal credentials are not configured');
  return { clientId, secret };
};

async function accessToken() {
  const { clientId, secret } = credentials();
  const response = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    signal: AbortSignal.timeout(requestTimeoutMs),
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error(`PayPal authentication failed (${response.status})`);
  return (await response.json() as PayPalToken).access_token;
}

async function paypalRequest(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(requestTimeoutMs),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new PayPalRequestError(
    response.status,
    Array.isArray(payload.details) ? payload.details.map((detail: any) => String(detail.issue ?? 'UNKNOWN_ERROR')) : [String(payload.name ?? 'UNKNOWN_ERROR')],
    typeof payload.debug_id === 'string' ? payload.debug_id : undefined,
  );
  return payload;
}

const getOrder = (paypalOrderId: string) =>
  paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`);

async function captureOrder(paypalOrderId: string, requestId: string) {
  let result: any;
  try {
    result = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
      headers: { 'PayPal-Request-Id': requestId, Prefer: 'return=representation' },
      body: '{}',
    });
  } catch (error) {
    // A timeout, a concurrent request, or ORDER_ALREADY_CAPTURED does not prove
    // that payment failed. Read the order without starting another capture.
    try {
      const recovered: any = await getOrder(paypalOrderId);
      if (recovered.status === 'COMPLETED' || recovered.purchase_units?.some((unit: any) => unit.payments?.captures?.length)) {
        return recovered;
      }
    } catch {
      // Preserve the original error. No local payment or entitlement is committed.
    }
    throw error;
  }
  // Some successful/idempotent responses are minimal. Settlement requires the
  // purchase unit identity and actual capture amount, never just order status.
  return result.purchase_units?.length ? result : getOrder(paypalOrderId);
}

export default () => ({
  createOrder: ({ amount, currency, internalOrderNumber }: { amount: string; currency: string; internalOrderNumber: string }) =>
    paypalRequest('/v2/checkout/orders', {
      method: 'POST',
      headers: { 'PayPal-Request-Id': internalOrderNumber },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: internalOrderNumber,
          custom_id: internalOrderNumber,
          amount: { currency_code: currency, value: amount },
        }],
      }),
    }),
  getOrder,
  captureOrder,
  getSubscription: (paypalSubscriptionId: string) =>
    paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(paypalSubscriptionId)}`),
  createSubscription: ({ planId, internalSubscriptionId, returnUrl, cancelUrl }: { planId: string; internalSubscriptionId: string; returnUrl: string; cancelUrl: string }) =>
    paypalRequest('/v1/billing/subscriptions', {
      method: 'POST',
      headers: { 'PayPal-Request-Id': `subscription-${internalSubscriptionId}` },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: internalSubscriptionId,
        application_context: {
          brand_name: 'SureMandarin',
          user_action: 'SUBSCRIBE_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    }),
  verifyWebhook: async (headers: Record<string, string | undefined>, event: unknown) => {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) throw new Error('PAYPAL_WEBHOOK_ID is not configured');
    const result: any = await paypalRequest('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: event,
      }),
    });
    return result.verification_status === 'SUCCESS';
  },
});
