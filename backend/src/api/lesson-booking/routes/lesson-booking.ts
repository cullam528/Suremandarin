export default {
  routes: [
    { method: 'GET', path: '/lesson-bookings/me', handler: 'lesson-booking.me' },
    { method: 'POST', path: '/lesson-bookings', handler: 'lesson-booking.createForCurrentUser' },
    { method: 'POST', path: '/lesson-bookings/:id/cancel', handler: 'lesson-booking.cancelMine' },
    { method: 'POST', path: '/lesson-bookings/:id/complete', handler: 'lesson-booking.completeForTeacher' },
  ],
};
