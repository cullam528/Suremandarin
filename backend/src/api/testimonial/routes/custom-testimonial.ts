export default {
  routes: [
    {
      method: 'POST',
      path: '/testimonials/submit',
      handler: 'testimonial.submit',
      config: { auth: { scope: [] } },
    },
  ],
};
