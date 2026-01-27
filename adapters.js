import { createAdapter } from './utils.js';
import { EventIterator } from './eventTarget.js';

class RequestIterator extends EventIterator {
  #adapter = null;
  constructor(request, adapter) {
    super(request, 'success');
    this.#adapter = adapter;
  }

  next() {
    return super.next().then(({ done, value: event }) => {
      if (done) {
        return { done: true, value: undefined };
      }
      const value = event.target.result;
      if (!value) {
        return this.return();
      }
      return { 
        done: false, 
        value: this.#adapter ? this.#adapter(value) : value
      };
    });
  }
}

const adoptRequest = (request) => {
  const { promise, resolve, reject } = Promise.withResolvers();
  const controller = new AbortController();
  request.addEventListener('success', (e) => void resolve(e.target.result), { signal: controller.signal });
  request.addEventListener('error', (e) => void reject(e.target.error), { signal: controller.signal });
  return promise.finally(() => controller.abort());
}

const adoptMultiRequest = (adapter) => (request) => ({
  [Symbol.asyncIterator]() {
    return new RequestIterator(request, adapter);
  }
});

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
