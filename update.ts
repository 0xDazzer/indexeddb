import { adaptRequest } from "./adaptRequest";

export const update = <TValue>(
  cursor: IDBCursor,
  value: TValue,
): Promise<IDBValidKey> => adaptRequest(cursor.update(value));
