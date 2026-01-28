import { createAdapter } from './utils/createAdapter.js';
import { adoptRequest, adoptMultiRequest } from './request.js';

const adoptCursor = createAdapter({
  delete: adoptRequest,
  update: adoptRequest,
});

const adoptKeyCursor = createAdapter({
  delete: adoptRequest,
  update: adoptRequest,
});

const adoptIndex = createAdapter({
  get: adoptRequest,
  getAll: adoptRequest,
  getAllKeys: adoptRequest,
  getKey: adoptRequest,
  count: adoptRequest,
  openCursor: adoptMultiRequest(adoptCursor),
  openKeyCursor: adoptMultiRequest(adoptKeyCursor),
});

const adoptObjectStore = createAdapter({
  add: adoptRequest,
  clear: adoptRequest,
  count: adoptRequest,
  delete: adoptRequest,
  get: adoptRequest,
  getAll: adoptRequest,
  getAllKeys: adoptRequest,
  getKey: adoptRequest,
  put: adoptRequest,
  openCursor: adoptMultiRequest(adoptCursor),
  openKeyCursor: adoptMultiRequest(adoptKeyCursor),
  createIndex: adoptIndex,
  index: adoptIndex,
});

const adoptTransaction = createAdapter({
  objectStoreNames: Array.from,
  objectStore: adoptObjectStore,
});

const adoptDB = createAdapter({
  objectStoreNames: Array.from,
  transaction: adoptTransaction,
});

export { adoptRequest, adoptDB };
