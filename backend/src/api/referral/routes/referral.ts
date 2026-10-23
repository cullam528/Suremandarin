import { factories } from '@strapi/strapi';

// Relationships and rewards are server-owned. Admin content management uses
// separate routes; member roles must never be able to forge referral records.
export default factories.createCoreRouter('api::referral.referral', {
  except: ['create', 'update', 'delete'],
});
