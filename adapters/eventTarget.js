import { Queue } from '../utils/queue.js';

const DONE = { done: true, value: undefined };

class EventIterableIterator {
  #events = new Queue();
  #resolvers = new Queue();
  #abortController = new AbortController();
  #done = false;

  constructor(emitter, eventName) {
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
        reject(event.target.error);
        this.#finalize();
      } else {
        this.#finalize();
        this.#events.enqueue(event);
      }
    };
    emitter.addEventListener(eventName, listener, { signal: this.#abortController.signal });
    emitter.addEventListener('error', onerror, { signal: this.#abortController.signal });
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
        throw event.target.error;
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

  [Symbol.asyncIterator] = () => this
}

const on = (eventTarget, eventName) => new EventIterableIterator(eventTarget, eventName);

const once = (eventTarget, eventName) => {
  const { promise, resolve, reject } = Promise.withResolvers();
  const controller = new AbortController();
  eventTarget.addEventListener(eventName, resolve, { signal: controller.signal });
  eventTarget.addEventListener('error', reject, { signal: controller.signal });
  return promise.finally(() => controller.abort());
}

export { on, once, EventIterableIterator };