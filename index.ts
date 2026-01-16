function on<T extends Event>(eventTarget: EventTarget, eventName: string): AsyncIterable<T> {
  const queue: T[] = [];
  // Stores the resolve function when next() is called but no events are queued.
  // When an event arrives, we call this to "wake up" the waiting next() call.
  let pendingResolve: ((result: IteratorResult<T>) => void) | null = null;
  // Flag to indicate the iterator has been terminated (e.g., via break).
  // Prevents further iteration after return() is called.
  let done = false;

  const handler = (event: Event) => {
    if (pendingResolve) {
      pendingResolve({ value: event as T, done: false });
      pendingResolve = null;
    } else {
      queue.push(event as T);
    }
  };

  eventTarget.addEventListener(eventName, handler);

  return {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<T>> {
          if (done) return Promise.resolve({ value: undefined, done: true } as IteratorResult<T>);
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          return new Promise((resolve) => {
            pendingResolve = resolve;
          });
        },
        return() {
          done = true;
          eventTarget.removeEventListener(eventName, handler);
          if (pendingResolve) {
            pendingResolve({ value: undefined, done: true });
            pendingResolve = null;
          }
          return Promise.resolve({ value: undefined, done: true });
        }
      };
    }
  };
}

function onceNative(target: EventTarget, eventName: string): Promise<Event> {
    return new Promise((resolve) => {
        target.addEventListener(eventName, resolve, { once: true });
    });
}

function once(target: EventTarget, eventName: string) {
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      target.removeEventListener(eventName, handler);
      resolve(e);
    };
    target.addEventListener(eventName, handler);
  });
}

