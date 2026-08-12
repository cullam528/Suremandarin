import { prepareBookingTransition } from '../../services/lesson-booking';

declare const strapi: any;

export default {
  async beforeUpdate(event: any) {
    await prepareBookingTransition(strapi, event);
  },
};
