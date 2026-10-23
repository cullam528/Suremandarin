const USER_UID = 'plugin::users-permissions.user';

// Serialize ledger and invitation changes across workers, including a concurrent
// Daily Challenge grant. Strapi queries inherit this transaction's context.
export async function withUserLock<T>(strapi: any, userId: number, action: () => Promise<T>): Promise<T> {
  return strapi.db.transaction(async ({ trx }: any) => {
    const table = strapi.db.metadata.get(USER_UID).tableName;
    const user = await strapi.db.getConnection(table).transacting(trx).where({ id: userId }).forUpdate().first();
    if (!user) throw new Error('Member not found.');
    return action();
  });
}
