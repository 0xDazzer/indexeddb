class Queue { // Note: AI created
  constructor() {
    this.items = [];
    this.head = 0;
  }

  enqueue(value) {
    this.items.push(value);
  }

  dequeue() {
    if (this.head >= this.items.length)
      return undefined;
    const value = this.items[this.head++];
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return value;
  }

  clear() {
    this.items = [];
    this.head = 0;
  }

  get size() {
    return this.items.length - this.head;
  }
}

const DONE = {done: true, value: undefined};

class IterableEventTarget {
  constructor(eventTarget, eventName) {
    this.controller = new AbortController();
    this.nextCalls = new Queue();
    this.events = new Queue();

    eventTarget.addEventListener(eventName, event => {
      this.events.enqueue(event);
      this.processQueue();
    }, {signal: this.controller.signal});

    eventTarget.addEventListener('error', error => {
      this.events.enqueue(error);
      this.processQueue();
    }, {signal: this.controller.signal});
  }

  cleanup() {
    this.controller.abort();
    this.nextCalls.clear();
    this.events.clear();
  }

  processQueue() {
    // ❌ nextCalls:0 & events: 0 // impossible case (as `processQueue()` have to be called before enqueueing)
    // ❌ nextCalls:0 & events: n // events appears before next() calls
    // ❌ nextCalls:n & events: 0 // next() calls appears before events
    // ✅ nextCalls:n & events: m // normal case
    if (this.nextCalls.size === 0 || this.events.size === 0) {
      return;
    }

    const nextCall = this.nextCalls.dequeue();
    const event = this.events.dequeue();

    if (event.type !== 'error') {
      nextCall.resolve({done: false, value: event});
      return;
    }

    // event.type === 'error'
    // Resolve all pending next calls with DONE
    let curNextCall;
    while (curNextCall = this.nextCalls.dequeue()) {
      curNextCall.resolve(DONE);
    }
    // Reject the current next call with the error
    nextCall.reject(event);
    // Remove all remaining events and unsubscribe from events
    this.cleanup();
  };

  async next() {
    if (this.controller.signal.aborted) {
      return DONE;
    }
    const {promise, resolve, reject} = Promise.withResolvers();
    this.nextCalls.enqueue({resolve, reject});
    this.processQueue()
    return promise;
  }

  async return() {
    this.cleanup();
    return DONE;
  }

  async throw(error) {
    this.cleanup();
    return DONE;
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}

const on = (eventTarget, eventName) => new IterableEventTarget(eventTarget, eventName);

module.exports = {on};
