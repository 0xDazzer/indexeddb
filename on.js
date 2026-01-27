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

const on = (eventTarget, eventName) => {
  const controller = new AbortController();

  const nextCalls = new Queue();
  const events = new Queue();


  eventTarget.addEventListener(eventName, event => {
    events.enqueue({type: 'success', value: event});
    processQueue();
  }, {signal: controller.signal});

  eventTarget.addEventListener('error', error => {
    events.enqueue({type: 'error', value: error});
    processQueue();
  }, {signal: controller.signal});

  const processQueue = () => {


    // ❌ nextCalls:0 & events: 0 // impossible case (as `processQueue()` have to be called before enqueueing)
    // ❌ nextCalls:0 & events: n // events appears before next() calls
    // ❌ nextCalls:n & events: 0 // next() calls appears before events
    // ✅ nextCalls:n & events: m // normal case
    if (nextCalls.size === 0 || events.size === 0) {
      return;
    }

    const nextCall = nextCalls.dequeue();
    const event = events.dequeue();

    if (event.type === 'success') {
      nextCall.resolve({done: false, value: event});
      return;
    }

    // event.type === 'error'
    // Resolve all pending next calls with DONE
    let curNextCall;
    while (curNextCall = nextCalls.dequeue()) {
      curNextCall.resolve(DONE);
    }
    // Reject the current next call with the error
    nextCall.reject(event.value);
    // Remove all remaining events and unsubscribe from events
    cleanup();
  };

  const cleanup = () => {
    controller.abort();
    nextCalls.clear();
    events.clear();
  }

  const iterator = {
    async next() {
      const {promise, resolve, reject} = Promise.withResolvers();
      nextCalls.enqueue({resolve, reject});
      processQueue()
      return promise;
    },
    async return() {
      cleanup();
      return DONE;
    },
    async throw(error) {
      cleanup();
      return DONE;
    }
  };

  return {
    [Symbol.asyncIterator]() {
      return iterator;
    },
  };
};

// ------------------------------------------------------------------------------------
// 1. Test for fast read with error
// const delay  = ms => new Promise(ok => setTimeout(ok,ms));
// const testEventTarget = new EventTarget();
//
// const NAME = 'valuechange';
// const gen = on(testEventTarget, NAME)[Symbol.asyncIterator]();
//
// gen.next().then(v => console.log('1', v));
// gen.next().then(v => console.log('2', v));
// gen.next().then(v => console.log('3', v));
// gen.next().then(v => console.log('4', v));
// gen.next().then(v => console.log('5', v));
// gen.next().then(v => console.log('6', v));
// gen.next().then(v => console.log('7', v));
// gen.next().then(v => console.log('8', v));
//
// let i = 0;
// testEventTarget.dispatchEvent(new CustomEvent(NAME, {data: ++i}));
// await delay(Math.random() * 1_000);
// testEventTarget.dispatchEvent(new CustomEvent(NAME, {data: ++i}));
// await delay(Math.random() * 1_000);
// testEventTarget.dispatchEvent(new CustomEvent(NAME, {data: ++i}));
// await delay(Math.random() * 1_000);
// testEventTarget.dispatchEvent(new CustomEvent(NAME, {data: ++i}));
// testEventTarget.dispatchEvent(new CustomEvent("error", new Error('ops')));
// ------------------------------------------------------------------------------------
// 2. Spec for comparison
//
// async function* MyFn(){
//     yield 1;
//     await  new Promise(ok => setTimeout(ok, Math.random() * 1_000))
//     yield 2;
//     await  new Promise(ok => setTimeout(ok, Math.random() * 1_000))
//     yield 3;
//     await  new Promise(ok => setTimeout(ok, Math.random() * 1_000))
//     yield 4;
//     qwerwwqr;
//     yield 5;
//     yield 6;
//     yield 7;
// }

//  1 {value: 1, done: false}
//  2 {value: 2, done: false}
//  3 {value: 3, done: false}
//  4 {value: 4, done: false} // 5 next() ??? (resolved with error)
//  6 {value: undefined, done: true}
//  7 {value: undefined, done: true}
//  8 {value: undefined, done: true}
//  Uncaught (in promise) ReferenceError: qwerwwqr is not defined

