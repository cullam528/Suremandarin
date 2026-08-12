export default {
  routes: [
    {
      method: 'GET',
      path: '/daily-progresses/me',
      handler: 'daily-progress.me',
      config: { auth: { scope: [] } },
    },
  ],
};
