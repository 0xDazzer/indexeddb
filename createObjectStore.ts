export const createObjectStore = (
  db: IDBDatabase,
  name: string,
  options?: IDBObjectStoreParameters,
): IDBObjectStore => db.createObjectStore(name, options);
