export default {
  routes: [
    {
      method: 'GET',
      path: '/apple-auth/authorize',
      handler: 'apple-auth.authorize',
      config: { auth: false, middlewares: ['plugin::users-permissions.rateLimit'] },
    },
    {
      method: 'POST',
      path: '/apple-auth/exchange',
      handler: 'apple-auth.exchange',
      config: { auth: false, middlewares: ['plugin::users-permissions.rateLimit'] },
    },
  ],
};
