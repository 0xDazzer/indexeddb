import { createAdapter } from './utils.js';

const adoptRequest = (request) => {
  const { promise, resolve, reject } = Promise.withResolvers();
  const controller = new AbortController();
  request.addEventListener('success', (e) => void resolve(e.target.result), { signal: controller.signal });
  request.addEventListener('error', (e) => void reject(e.target.error), { signal: controller.signal });
  return promise.finally(() => controller.abort());
}

// TODO: implement event queue
const adoptMultiRequest = (adapter) => async function* (request) {
  let result = await adoptRequest(request);
  while (result) {
    yield adapter(result);
    result = await adoptRequest(request);
  }
}

const adoptCursor = createAdapter({
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
  openKeyCursor: adoptMultiRequest(adoptCursor),
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
  openKeyCursor: adoptMultiRequest(adoptCursor),
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
