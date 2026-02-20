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

const adoptMultiRequest = (adapter) => (request) => ({ 
  [Symbol.asyncIterator]: () => new RequestIterator(request, adapter)
});

export { adoptMultiRequest, adoptRequest };