import { adaptRequest } from "./adaptRequest";

const cursorDelete = (cursor: IDBCursor): Promise<void> =>
  adaptRequest(cursor.delete());
