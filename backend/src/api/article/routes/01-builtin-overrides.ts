export default {
  routes: [
    {
      method: 'GET',
      path: '/articles/builtin-overrides',
      handler: 'article.builtinOverrides',
      config: { auth: false },
    },
  ],
};
