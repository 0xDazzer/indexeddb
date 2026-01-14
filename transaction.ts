export const transaction = (
  db: IDBDatabase,
  storeNames: string | string[],
  mode?: IDBTransactionMode,
  options?: IDBTransactionOptions,
): IDBTransaction => db.transaction(storeNames, mode, options);
