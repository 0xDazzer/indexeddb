import { EventIterator } from './eventTarget.js';

class RequestIterator extends EventIterator {
  #adapter = null;
  constructor(request, adapter) {
    super(request, 'success');
    this.#adapter = adapter;
  }

  next() {
    return super.next().then((result) => {
      if (result.done) {
        return result;
      }
      const { value: event } = result;
      const { result: value } = event.target;
      if (value == null) {
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

const adoptMultiRequest = (adapter) => (request) => {
  // IDB cursors are single-use: the underlying IDBRequest fires 'success' once per row
  // as you call cursor.continue(), then fires 'success' with result=null when exhausted.
  // After that the request is dead — it will never emit events again.
  //
  // Without this guard, a second `for await` loop would create a new RequestIterator
  // on the same dead request, register listeners, then hang forever waiting for events
  // that will never fire:
  //
  //   const rows = adoptMultiRequest(adapter)(request);
  //   for await (const r of rows) { ... }  // ✓ works
  //   for await (const r of rows) { ... }  // ✗ hangs — request already exhausted
  //
  // `consumed` makes that a loud throw instead of a silent infinite wait.
  let consumed = false;
  return {
    [Symbol.asyncIterator]: () => {
      if (consumed) throw new Error('Cursor iterable already consumed');
      consumed = true;
      return new RequestIterator(request, adapter);
    }
  };
};

export { adoptMultiRequest, adoptRequest };