type PayPalToken = { access_token: string; expires_in: number };

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
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`PayPal request failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
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
  captureOrder: (paypalOrderId: string, requestId: string) =>
    paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
      headers: { 'PayPal-Request-Id': requestId },
      body: '{}',
    }),
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
