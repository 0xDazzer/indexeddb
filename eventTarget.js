class Queue {
  #array = [];
  constructor(defaultValue = []) {
    this.#array = defaultValue;
  }
  enqueue(item) {
    this.#array.push(item);
  }
  dequeue() {
    return this.#array.shift();
  }
  get size() {
    return this.#array.length;
  }
  [Symbol.iterator]() {
    return {
      next: () => this.size === 0
        ? { value: undefined, done: true }
        : { value: this.dequeue(), done: false }
    };
  }
}

const DONE = { done: true, value: undefined };

class EventIterator {
  #events = new Queue();
  #resolvers = new Queue();
  #done = false;
  #abortController = null;

  constructor(emitter, eventName) {
    this.#abortController = new AbortController();
    const listener = (value) => {
      if (this.#resolvers.size > 0) {
        const { resolve } = this.#resolvers.dequeue();
        resolve({ done: false, value });
      } else {
        this.#events.enqueue({ type: eventName, value, error: null });
      }
    };
    const onerror = (error) => {
      if (this.#resolvers.size > 0) {
        const { reject } = this.#resolvers.dequeue();
        reject(error);
      } else {
        this.#events.enqueue({ type: 'error', value: null, error });
      }
      this.#finalize();
    };
    emitter.addEventListener(eventName, listener, { signal: this.#abortController.signal });
    emitter.addEventListener('error', onerror, { signal: this.#abortController.signal });
  }

  #finalize() {
    if (this.#done) return;
    this.#done = true;
    this.#abortController.abort();
    for (const { resolve } of this.#resolvers) {
      resolve(DONE);
    }
  }

  async next() {
    if (this.#events.size > 0) {
      const event = this.#events.dequeue();
      if (event.type === 'error') {
        throw event.error;
      }
      return { done: false, value: event.value };
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

const on = (eventTarget, eventName) => ({
  [Symbol.asyncIterator]() {
    return new EventIterator(eventTarget, eventName);
  }
})

const once = (eventTarget, eventName) => {
  const { promise, resolve, reject } = Promise.withResolvers();
  const controller = new AbortController();
  eventTarget.addEventListener(eventName, resolve, { signal: controller.signal });
  eventTarget.addEventListener('error', reject, { signal: controller.signal });
  return promise.finally(() => controller.abort());
}

export { on, once, EventIterator };