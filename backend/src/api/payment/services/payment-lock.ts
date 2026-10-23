/**
 * Serialize read/modify/write operations across processes, inside a Strapi
 * transaction. A no-op UPDATE takes a row lock on PostgreSQL and a writer lock
 * on SQLite (which does not support SELECT ... FOR UPDATE).
 */
export async function lockEntityRow(strapi: any, trx: any, uid: string, id: number) {
  const metadata = strapi.db.metadata.get(uid);
  const idColumn = metadata.attributes.id.columnName ?? 'id';
  const affected = await trx(metadata.tableName)
    .where(idColumn, id)
    .update({ [idColumn]: trx.ref(idColumn) });
  if (!affected) throw new Error(`Payment resource no longer exists (${uid})`);
}
