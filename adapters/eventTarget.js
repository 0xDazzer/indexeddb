import { Queue } from '../utils/queue.js';

const DONE = { done: true, value: undefined };

class EventIterator {
  #events = new Queue();
  #resolvers = new Queue();
  #abortController = new AbortController();
  #done = false;

  constructor(emitter, eventName, { signal } = {}) {
    const listener = (event) => {
      if (this.#resolvers.size > 0) {
        const { resolve } = this.#resolvers.dequeue();
        resolve({ done: false, value: event });
      } else {
        this.#events.enqueue(event);
      }
    };
    const onerror = (event) => {
      if (this.#resolvers.size > 0) {
        const { reject } = this.#resolvers.dequeue();
        // event.target.error is the DOMException from the failed IDBRequest
        reject(event.target?.error ?? event);
        this.#finalize();
      } else {
        this.#finalize();
        this.#events.enqueue(event);
      }
    };
    emitter.addEventListener(eventName, listener, { signal: this.#abortController.signal });
    emitter.addEventListener('error', onerror, { signal: this.#abortController.signal });
    if (signal) {
      // external signal aborts the iterator from outside — e.g. timeout or user cancellation;
      // registered with #abortController.signal so it self-removes when the iterator is done
      signal.addEventListener('abort', () => this.#finalize(), { signal: this.#abortController.signal });
    }
  }

  #finalize() {
    if (this.#done) return;
    this.#done = true;
    this.#abortController.abort();
    this.#events.clear();
    if (this.#resolvers.size > 0) {
      for (const { resolve } of this.#resolvers) resolve(DONE);
    }
  }

  async next() {
    if (this.#events.size > 0) {
      const event = this.#events.dequeue();
      if (event.type === 'error') {
        throw event.target?.error ?? event; // DOMException from the failed IDBRequest
      }
      return { done: false, value: event };
    }
    if (this.#done) return DONE;
    return new Promise((resolve, reject) => {
      this.#resolvers.enqueue({ resolve, reject });
    });
  }

  async return() {
    this.#finalize();
    return DONE;
  }

  async throw() {
    this.#finalize();
    return DONE;
  }
}

// passes options through so callers can do: on(target, 'data', { signal: ac.signal })
const on = (eventTarget, eventName, options = {}) => ({
  [Symbol.asyncIterator]: () => new EventIterator(eventTarget, eventName, options)
});

const once = (eventTarget, eventName, { signal } = {}) => {
  const { promise, resolve, reject } = Promise.withResolvers();
  const controller = new AbortController();
  if (signal) {
    // external signal can cancel the wait — rejects with signal.reason (AbortError by default);
    // registered with controller.signal so it auto-removes when the promise settles
    signal.addEventListener('abort', () => void reject(signal.reason), { signal: controller.signal });
  }
  eventTarget.addEventListener(eventName, resolve, { signal: controller.signal });
  // wrapping reject: passing it directly would give the raw Event, not the actual error;
  // ?.error ?? e: IDBRequest carries DOMException on .error, other targets fall back to the event itself
  eventTarget.addEventListener('error', (e) => void reject(e.target?.error ?? e), { signal: controller.signal });
  return promise.finally(() => controller.abort());
}

export { on, once, EventIterator };