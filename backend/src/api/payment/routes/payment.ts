export default {
  routes: [
    { method: 'GET', path: '/v1/account/overview', handler: 'payment.accountOverview' },
    { method: 'POST', path: '/v1/payments/paypal/orders', handler: 'payment.createPayPalOrder' },
    { method: 'POST', path: '/v1/payments/paypal/capture', handler: 'payment.capturePayPalOrder' },
    { method: 'POST', path: '/v1/payments/paypal/subscriptions', handler: 'payment.createPayPalSubscription' },
    { method: 'POST', path: '/v1/webhooks/paypal', handler: 'payment.paypalWebhook', config: { auth: false } },
  ],
};
